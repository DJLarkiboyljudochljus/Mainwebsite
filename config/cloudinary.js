const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const logger = require("./logger");

// Automatically reads CLOUDINARY_URL from environment variables
cloudinary.config();

// Function to create an upload instance dynamically
const createUploader = (folder) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
    },
  });
  return multer({ storage });
};

// Function to delete a file from Cloudinary
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error("Error deleting file:", error);
    throw error;
  }
};

// Export uploaders and delete function
module.exports = {
  userImageUpload: createUploader("user_images"),
  equipmentImageUpload: createUploader("equipment_images"),
  galleryImageUpload: createUploader("gallery_images"),
  deleteFile,
};
