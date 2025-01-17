const mongoose = require("mongoose");
const transporter = require("../config/mailer");

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
  totalItems: Number,
});

equipmentSchema.pre("save", function () {
  this.totalItems = this.items.length;
  for (let item of this.items) {
    if (item.condition === "broken") {
      transporter.sendMail({
        from: process.env.EMAIL,
        to: process.env.EMAIL,
        subject: "Broken Equipment Alert",
        text: `The ${this.name} equipment is broken`,
      });
    }
  }
});

module.exports = mongoose.model("Equipment", equipmentSchema);
