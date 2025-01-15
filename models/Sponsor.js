const mongoose = require("mongoose");

const sponsorSchema = new mongoose.Schema({
  name: { type: String, required: true, }
});

module.exports = mongoose.model("Sponsor", sponsorSchema);
