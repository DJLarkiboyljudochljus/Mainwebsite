import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import axios from "axios";
import chokidar from "chokidar";

const API_KEY = process.env.DEEPL_API_KEY;
if (!API_KEY) {
  throw new Error("❌ Missing DeepL API Key! Set DEEPL_API_KEY in .env");
}

const API_URL = "https://api-free.deepl.com/v2/translate";
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
const MAX_CONCURRENT_REQUESTS = 3; // Limit concurrent requests
const MAX_RETRIES = 3;
let running = false;

const languages = ["sv", "de", "fr"];

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

async function translateWithRetry(text, targetLang, retries = 0) {
  const semaphore = new Semaphore(MAX_CONCURRENT_REQUESTS);

  try {
    await semaphore.acquire();

    // Add delay between requests
    await delay(RATE_LIMIT_DELAY);

    const response = await axios.post(API_URL, null, {
      params: {
        auth_key: API_KEY,
        text: text,
        target_lang: targetLang.toUpperCase(),
      },
      headers: {
        Accept: "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    // Validate the response
    if (
      response.data &&
      response.data.translations &&
      response.data.translations.length > 0
    ) {
      return response.data.translations[0].text;
    } else {
      throw new Error("Invalid translation response");
    }
  } catch (error) {
    console.error(
      `Translation error for ${targetLang}:`,
      error.response ? error.response.data : error.message,
    );

    // Exponential backoff for rate limit errors
    if (error.response?.status === 429 && retries < MAX_RETRIES) {
      const backoffDelay = RATE_LIMIT_DELAY * Math.pow(2, retries);
      console.warn(
        `Rate limited. Retry ${retries + 1}: Waiting ${backoffDelay}ms`,
      );
      await delay(backoffDelay);
      return translateWithRetry(text, targetLang, retries + 1);
    }

    throw error;
  } finally {
    semaphore.release();
  }
}

async function processTranslations() {
  if (running) {
    console.log("Translation process is already running. Skipping...");
    return;
  }
  running = true;

  console.log("Starting translation process...");
  console.log("Translating to:", languages.join(", "));

  try {
    const textsToTranslate = JSON.parse(
      await fs.readFile(path.join(process.cwd(), "locales", "en.json"), "utf8"),
    );

    for (const lang of languages) {
      const translatedTexts = {};
      const keys = Object.keys(textsToTranslate);

      console.log(`Translating to ${lang}...`);
      console.log(`Total keys to translate: ${keys.length}`);

      // Process translations sequentially with rate limiting
      for (const key of keys) {
        try {
          console.log(`Translating key: ${key}`);
          translatedTexts[key] = await translateWithRetry(
            textsToTranslate[key],
            lang,
          );
          console.log(
            `Translated key: ${key} to ${lang} with value: ${translatedTexts[key]}`,
          );
        } catch (translateError) {
          console.error(
            `Fallback: Keeping original text for key ${key} in ${lang} with value: ${textsToTranslate[key]} and error: ${translateError.message}`,
          );
          translatedTexts[key] = textsToTranslate[key];
        }
      }

      const filePath = path.join(process.cwd(), "locales", `${lang}.json`);
      await fs.writeFile(filePath, JSON.stringify(translatedTexts, null, 2));
      console.log(`Updated: ${filePath}`);
    }

    console.log("✅ Translations completed!");
  } catch (error) {
    console.error("❌ Translation process failed:", error);
  } finally {
    running = false;
  }
}

// Watch for changes in the locales directory and reprocess translations
const watcher = chokidar.watch(path.join(process.cwd(), "locales", "en.json"));

watcher.on("change", async (filePath) => {
  console.log(`File changed: ${filePath}`);
  await processTranslations();
});

processTranslations();
