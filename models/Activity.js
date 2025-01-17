const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date,
  },
  type: {
    type: String,
    required: true,
  },
  body: {
    type: mongoose.Schema.Types.Mixed,
  },
});

module.exports = mongoose.model("Activity", activitySchema);
