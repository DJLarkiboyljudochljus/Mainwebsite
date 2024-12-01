const mongoose = require('mongoose');
const User = require('./User');

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
  workers: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
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
      }
      if (!worker.role !== "worker") {
        throw new Error('Worker must have role "worker"');
      }
    }

    next();
  } catch (err) {
    next(err);
  };
});

module.exports = mongoose.model('Booking', bookingSchema);
