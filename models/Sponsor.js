const mongoose = require("mongoose");

const sponsorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  logo: { type: String },
  url: { type: String },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model("Sponsor", sponsorSchema);
