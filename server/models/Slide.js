const mongoose = require("mongoose");
const { upload } = require("../config/cloudinary");
const genQr = require("../config/qr.code");

const slideSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  url: {
    type: String,
    required: true,
    unique: true,
  },
  background: {
    type: String,
    required: true,
  },
  html: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
});

slideSchema.pre("save", async function () {
  if (this.isModified("url")) {
    const qrcode = await genQr(this.url);
    const response = await upload(qrcode, {
      folder: "qr-codes",
    });
    this.qrCode = response.url;
  }
});

module.exports = mongoose.model("Slide", slideSchema);
