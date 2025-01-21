const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "equipment_uploads",
    allowed_formats: ["jpg", "png", "jpeg"],
    quality: 100,
  },
});

const upload = multer({ storage });

// Function to delete an image
const deleteImage = async (url) => {
  try {
    const publicId = extractPublicId(url);
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting image:", error);
  }
};

function extractPublicId(url) {
  try {
    // Match everything after /upload/ and before the file extension
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[\w]+$/);
    if (matches && matches[1]) {
      return matches[1]; // This is the public ID
    }
    throw new Error("Invalid Cloudinary URL format");
  } catch (error) {
    console.error("Error extracting public_id:", error.message);
    return null;
  }
}

module.exports = Object.assign(upload, {
  deleteImage,
});
