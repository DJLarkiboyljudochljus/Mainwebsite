const mongoose = require('mongoose');
const User = require('./User');

const validateLocation = require('../utils/validateLocation');

const itemSchema = new mongoose.Schema({
  quantity: {
    type: Number,
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Equipment",
  },
});

const bookingSchema = new mongoose.Schema({
  items: [itemSchema],
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  workers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  date: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: true
  },
});

bookingSchema.pre('save', async function (next) {
  try {
    if (this.customer) {
      const customer = await User.findById(this.customer);
      if (!customer) {
        throw new Error("Customer not found");
      }
      if (customer.role !== "customer") {
        throw new Error('Customer must have role "customer"');
      }
    }

    if (this.workers) {
      const worker = await User.findById(this.workers);
      if (!worker) {
        throw new Error("Worker not found");
      };
      if (!worker.role !== "worker") {
        throw new Error('Worker must have role "worker"');
      };
    };

    // Ensure location is a non-empty string
    if (typeof this.location !== 'string' || this.location.trim() === '') {
      throw new Error("Location must be a non-empty string");
    };

    // Validate location using the Mapbox API
    const isValidLocation = await validateLocation(this.location);
    if (!isValidLocation) {
      throw new Error("Invalid location");
    };

    next();
  } catch (err) {
    next(err);
  };
});

module.exports = mongoose.model('Booking', bookingSchema);
