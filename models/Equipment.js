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
});

equipmentSchema.pre('save', async function (next) {
  this.quantity = this.items.length;

  this.items.array.forEach(item => {
    if (!item.isBooked) {
      this.inInventory++;
    };
  });

  next();
});

module.exports = mongoose.model('Equipment', equipmentSchema);
