const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, required: true, default: new Date() },
  items: [
    {
      condition: {
        type: String,
        enum: ["New", "Good", "Needs repair", "Broken"],
        default: "new",
      },
      isBooked: Boolean,
      booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: false,
      },
    },
  ],
  images: [{ type: String, required: true }],
  inInventory: Number,
});

module.exports = mongoose.model("Equipment", equipmentSchema);
