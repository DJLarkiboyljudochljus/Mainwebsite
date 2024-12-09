const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Define your settings fields here
  siteName: String,
  siteDescription: String,
  siteEmail: String,
  sitePhone: String,
  siteAdress: String,
  siteLogo: String, // Store the path to the uploaded logo file
  siteSocialLinks: [String],
  maintenanceMode: Boolean,
});

module.exports = mongoose.model('Settings', settingsSchema);
