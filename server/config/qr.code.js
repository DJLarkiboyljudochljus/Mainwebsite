const QRCode = require("qrcode");

/**
 * Generates a base64-encoded PNG image of a QR code from the given URL.
 * @param {string} url - The URL to encode in the QR code.
 * @returns {Promise<string>} - A Promise that resolves to a data URL string (base64 PNG).
 */
async function getQRCodeImageData(url) {
  try {
    const imageData = await QRCode.toDataURL(url);
    return imageData; // This is a base64-encoded PNG in a data URL format
  } catch (err) {
    console.error("Failed to generate QR code:", err);
    throw err;
  }
}

module.exports = getQRCodeImageData;
