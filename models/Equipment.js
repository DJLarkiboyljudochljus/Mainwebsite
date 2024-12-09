const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  condition: {
    type: String,
    enum: [ "New", "Good", "Needs Repair", "Broken" ],
    default: "New",
  },
  isBooked: {
    type: Boolean,
    default: false,
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking"
  },
});

const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  items: [itemSchema],
  quantity: {
    type: Number,
  },
  inInventory: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    required: true,
    enum: ["Sound", "Lighting", "Tools", "Other" ],
  },
  description: {
    type: String,
    required: true,
  },
  images: [{
    type: String,
    required: true,
  }],
});

equipmentSchema.pre('save', async function (next) {
  try {
    this.quantity = this.items.length;

    this.inInventory = 0;

    this.items.array.forEach(item => {
      if (!item.isBooked) {
        this.inInventory++;
      };
    });

    this.items.forEach(item => {
      if ((item.isBooked && !item.booking) || (!item.isBooked && item.booking)) {
        throw new Error("Equipment must be either booked or not booked");
      }
    });

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Equipment', equipmentSchema);
