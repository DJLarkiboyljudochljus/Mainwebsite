import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import axios from "axios";
import chokidar from "chokidar";

// Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error(
    "❌ Missing Anthropic API Key! Set ANTHROPIC_API_KEY in .env",
  );
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
const MAX_CONCURRENT_REQUESTS = 3; // Limit concurrent requests
const MAX_RETRIES = 3;
const MODEL = "claude-3-5-sonnet-20240620"; // Using Claude 3.5 Sonnet for translations

const languageConfig = JSON.parse(
  await fs.readFile(
    path.join(process.cwd(), "config", "languages.json"),
    "utf8",
  ),
);

// Target languages to translate to
const languages = languageConfig.supported;

// Language display names for prompting
const languageNames = languageConfig.languageNamesEn;

// Modified: Source localization file path
const SOURCE_FILE = path.join(process.cwd(), "translateFrom.json");

// Process management with cancellation
let currentProcess = null;

// Semaphore to manage concurrent requests
class Semaphore {
  constructor(max) {
    this.max = max;
    this.permits = max;
    this.queue = [];
  }

  acquire() {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.permits++;
    }
  }
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simple cancellation token implementation
class CancellationToken {
  constructor() {
    this.isCancelled = false;
    this.callbacks = [];
  }

  cancel() {
    this.isCancelled = true;
    // Execute all registered callbacks
    this.callbacks.forEach((callback) => callback());
  }

  // Register a function to be called when cancelled
  onCancel(callback) {
    this.callbacks.push(callback);
  }

  // Check if cancelled - can be used in loops to exit early
  checkCancelled() {
    if (this.isCancelled) {
      throw new Error("Operation cancelled");
    }
  }
}

/**
 * Translate a batch of texts using Anthropic API
 * @param {Array} items - Array of items to translate (objects with key and value)
 * @param {string} targetLang - Target language code
 * @param {CancellationToken} cancellationToken - Token for cancellation
 * @param {number} retries - Number of retries attempted
 * @returns {Promise<Array>} - Translated items
 */
async function translateWithRetry(
  items,
  targetLang,
  cancellationToken,
  retries = 0,
) {
  const semaphore = new Semaphore(MAX_CONCURRENT_REQUESTS);

  try {
    // Check if cancelled before proceeding
    cancellationToken.checkCancelled();

    await semaphore.acquire();

    // Add delay between requests
    await delay(RATE_LIMIT_DELAY);

    // Check again after delay
    cancellationToken.checkCancelled();

    const controller = new AbortController();
    // Register the abort controller with the cancellation token
    cancellationToken.onCancel(() => controller.abort());

    // Create a batch of texts to translate with their keys
    const itemsToTranslate = items.map((item) => ({
      key: item.key,
      value: item.value,
      comment: item.comment,
    }));

    // Create the system prompt for accurate translations
    const systemPrompt = `You are a professional translator translating a website from English to ${languageNames[targetLang]}. 
Your task is to translate the text values in the provided JSON array into ${languageNames[targetLang]}. 
Keep the translations concise, clear, and natural-sounding in ${languageNames[targetLang]}.
The JSON will contain localization strings with keys, values (to be translated), and comments (providing context).

Most importantly:
1. Translate ONLY the "value" field for each item
2. Return ONLY the JSON array with the same structure but translated values
3. Keep variables, placeholders, and formatting elements intact
4. Maintain appropriate formality level for a business website
5. Don't translate brand names or technical terms that should remain in English`;

    // Create the user prompt with the items to translate
    const userPrompt = `Please translate the following localization strings from English to ${languageNames[targetLang]}:

${JSON.stringify(itemsToTranslate, null, 2)}

Return ONLY the JSON array with the same structure, but with the "value" fields translated to ${languageNames[targetLang]}.`;

    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: MODEL,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        signal: controller.signal,
      },
    );

    // Extract and parse the JSON from the response
    if (
      response.data &&
      response.data.content &&
      response.data.content.length > 0
    ) {
      const content = response.data.content[0].text;

      // Find JSON array in the response (in case Claude adds any explanatory text)
      const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        const translatedItems = JSON.parse(jsonText);
        return translatedItems;
      } else {
        console.error("Failed to extract JSON from response:", content);
        throw new Error("Invalid translation response format");
      }
    } else {
      throw new Error("Invalid translation response");
    }
  } catch (error) {
    // If operation was cancelled, re-throw the error
    if (
      error.message === "Operation cancelled" ||
      error.name === "AbortError" ||
      error.message === "canceled" ||
      error.message.includes("cancel")
    ) {
      throw error;
    }

    console.error(
      `Translation error for ${targetLang}:`,
      error.response ? error.response.data : error.message,
    );

    // Exponential backoff for rate limit errors
    if (
      (error.response?.status === 429 || error.response?.status === 500) &&
      retries < MAX_RETRIES
    ) {
      // Check if cancelled before retry
      cancellationToken.checkCancelled();

      const backoffDelay = RATE_LIMIT_DELAY * Math.pow(2, retries);
      console.warn(
        `Rate limited or server error. Retry ${retries + 1}: Waiting ${backoffDelay}ms`,
      );
      await delay(backoffDelay);
      return translateWithRetry(
        items,
        targetLang,
        cancellationToken,
        retries + 1,
      );
    }

    throw error;
  } finally {
    semaphore.release();
  }
}

/**
 * Process translations for all languages
 */
async function processTranslations() {
  // Cancel any existing process
  if (currentProcess) {
    console.log("Cancelling previous translation process...");
    currentProcess.cancel();
  }

  // Create a new cancellation token
  const cancellationToken = new CancellationToken();
  currentProcess = cancellationToken;

  console.log("Starting translation process...");
  console.log("Translating to:", languages.join(", "));

  try {
    // Modified: Load the source localization file (must be in structured array format)
    const sourceFile = await fs.readFile(SOURCE_FILE, "utf8");
    const localizationItems = JSON.parse(sourceFile);

    // Modified: Try to load existing translations to avoid retranslating
    const existingTranslations = {};
    for (const lang of languages) {
      try {
        const existingFile = await fs.readFile(
          path.join(process.cwd(), "locales", `${lang}.metadata.json`),
          "utf8",
        );
        existingTranslations[lang] = JSON.parse(existingFile);
      } catch (err) {
        // File doesn't exist yet, that's fine
        existingTranslations[lang] = [];
      }
    }

    // Ensure locales directory exists
    const localesDir = path.join(process.cwd(), "locales");
    try {
      await fs.access(localesDir);
    } catch {
      await fs.mkdir(localesDir, { recursive: true });
      console.log(`Created locales directory at ${localesDir}`);
    }

    // Create/update the i18n-compatible en.json file from source
    const enI18nFormat = {};
    localizationItems.forEach((item) => {
      enI18nFormat[item.key] = item.value;
    });
    const enI18nFilePath = path.join(process.cwd(), "locales", "en.json");
    await fs.writeFile(enI18nFilePath, JSON.stringify(enI18nFormat, null, 2));
    console.log(`Updated English i18n file: ${enI18nFilePath}`);

    // Process each language
    for (const lang of languages) {
      // Check if cancelled before starting a new language
      cancellationToken.checkCancelled();

      console.log(`Translating to ${lang} (${languageNames[lang]})...`);

      // Modified: Create a map of existing translations for this language
      const translatedKeysMap = {};
      existingTranslations[lang].forEach((item) => {
        if (item.translated) {
          translatedKeysMap[item.key] = item;
        }
      });

      // Modified: Filter items that need translation (not already translated)
      const itemsToTranslate = localizationItems.filter((item) => {
        return (
          !translatedKeysMap[item.key] ||
          !translatedKeysMap[item.key].translated
        );
      });

      console.log(
        `Found ${itemsToTranslate.length} items that need translation`,
      );
      console.log(
        `Skipping ${localizationItems.length - itemsToTranslate.length} already translated items`,
      );

      if (itemsToTranslate.length === 0) {
        console.log(
          `All items for ${lang} are already translated, skipping...`,
        );
        continue;
      }

      // Process translations in batches to avoid too large requests
      const BATCH_SIZE = 30;
      const batches = [];
      for (let i = 0; i < itemsToTranslate.length; i += BATCH_SIZE) {
        batches.push(itemsToTranslate.slice(i, i + BATCH_SIZE));
      }

      console.log(
        `Split into ${batches.length} batches of up to ${BATCH_SIZE} items each`,
      );

      const newlyTranslatedItems = [];

      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        try {
          // Check if cancelled before each batch
          cancellationToken.checkCancelled();

          console.log(
            `Processing batch ${i + 1}/${batches.length} for ${lang}...`,
          );
          const batch = batches[i];

          // Translate the batch
          const translatedBatch = await translateWithRetry(
            batch,
            lang,
            cancellationToken,
          );

          // Add translated items to the result array
          newlyTranslatedItems.push(...translatedBatch);

          console.log(`Completed batch ${i + 1}/${batches.length} for ${lang}`);
        } catch (batchError) {
          // If the process was cancelled, propagate the error
          if (
            batchError.message === "Operation cancelled" ||
            batchError.name === "AbortError" ||
            batchError.message === "canceled" ||
            batchError.message.includes("cancel")
          ) {
            throw batchError;
          }

          console.error(
            `Error processing batch for ${lang}:`,
            batchError.message,
          );

          // Add untranslated items as fallback
          newlyTranslatedItems.push(
            ...batches[i].map((item) => ({
              ...item,
              translated: false, // Mark as not translated
            })),
          );
        }
      }

      // Mark all successfully translated items
      const translatedItems = newlyTranslatedItems.map((item) => ({
        ...item,
        translated: true,
      }));

      // Modified: Merge with existing translations
      const finalItems = [
        ...existingTranslations[lang],
        ...translatedItems,
      ].reduce((unique, item) => {
        // Deduplicate by key, preferring the newly translated items
        const existingIndex = unique.findIndex((i) => i.key === item.key);
        if (existingIndex >= 0) {
          // If this key already exists and new item is translated, replace it
          if (item.translated) {
            unique[existingIndex] = item;
          }
        } else {
          // Add new item
          unique.push(item);
        }
        return unique;
      }, []);

      // Save two formats:
      // 1. The full array format with metadata (for future translation updates)
      const metadataFilePath = path.join(
        process.cwd(),
        "locales",
        `${lang}.metadata.json`,
      );
      await fs.writeFile(metadataFilePath, JSON.stringify(finalItems, null, 2));
      console.log(`Updated metadata file: ${metadataFilePath}`);

      // 2. The simple key-value format for i18n usage
      const i18nFormatObj = {};
      finalItems.forEach((item) => {
        i18nFormatObj[item.key] = item.value;
      });

      const i18nFilePath = path.join(process.cwd(), "locales", `${lang}.json`);
      await fs.writeFile(i18nFilePath, JSON.stringify(i18nFormatObj, null, 2));
      console.log(`Updated i18n file: ${i18nFilePath}`);
    }

    console.log("✅ Translations completed successfully!");
  } catch (error) {
    if (
      error.message === "Operation cancelled" ||
      error.name === "AbortError" ||
      error.message === "canceled" ||
      error.message.includes("cancel")
    ) {
      console.log("❌ Translation process was cancelled");
    } else {
      console.error("❌ Translation process failed:", error);
    }
  } finally {
    // Only clear the current process if this is still the active one
    if (currentProcess === cancellationToken) {
      currentProcess = null;
    }
  }
}

// Modified: Check if source "translateFrom.json" file exists, create if not
async function ensureSourceFile() {
  const sourceFilePath = SOURCE_FILE;
  try {
    await fs.access(sourceFilePath);
    console.log("Source localization file exists.");
  } catch {
    // Create the locales directory if it doesn't exist
    const localesDir = path.join(process.cwd(), "locales");
    try {
      await fs.access(localesDir);
    } catch {
      await fs.mkdir(localesDir, { recursive: true });
      console.log(`Created locales directory at ${localesDir}`);
    }

    // Create a sample source file with the array format
    const sampleData = [
      {
        key: "welcome",
        value: "Welcome to our website",
        translated: false,
        comment: "Welcome message on homepage",
      },
      {
        key: "about",
        value: "About Us",
        translated: false,
        comment: "Navigation item for about page",
      },
    ];

    await fs.writeFile(sourceFilePath, JSON.stringify(sampleData, null, 2));
    console.log(`Created sample source localization file at ${sourceFilePath}`);

    // Also create the simple format for English as reference
    const simpleSampleData = {
      welcome: "Welcome to our website",
      about: "About Us",
    };

    const enSimpleFilePath = path.join(process.cwd(), "locales", "en.json");
    await fs.writeFile(
      enSimpleFilePath,
      JSON.stringify(simpleSampleData, null, 2),
    );
    console.log(`Created sample English i18n file at ${enSimpleFilePath}`);
  }
}

// Main function
async function main() {
  await ensureSourceFile();

  // Watch for changes in the source localization file
  const watcher = chokidar.watch(SOURCE_FILE);

  watcher.on("change", async (filePath) => {
    console.log(`File changed: ${filePath}`);
    await processTranslations();
  });

  console.log(`Watching for changes in source file: ${SOURCE_FILE}`);

  // Start initial translation process
  await processTranslations();
}

main().catch((error) => {
  console.error("Application error:", error);
  process.exit(1);
});
