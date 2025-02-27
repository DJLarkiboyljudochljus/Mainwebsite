const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  images: [
    {
      type: String,
    },
  ],
  category: {
    type: String,
    required: true,
  },
  inStock: {
    type: Number,
    required: true,
    default: 0,
  },

  dateCreated: {
    type: Date,
    default: Date.now,
  },
  specs: {
    watts: {
      type: Number,
    },
    size: {
      h: {
        type: Number,
      },
      w: {
        type: Number,
      },
      d: {
        type: Number,
      },
      unit: {
        type: String,
        enum: ["m", "dm", "cm", "mm"],
      },
    },
    weight: {
      type: Number,
    },
    weightUnit: {
      type: String,
      enum: ["kg", "g"],
    },
    hasBattery: {
      type: Boolean,
    },
    batteryType: {
      type: String,
    },
    hasCharger: {
      type: Boolean,
    },
    chargerType: {
      type: String,
    },
    hasCoolingSystem: {
      type: Boolean,
    },
    coolingSystemType: {
      type: String,
    },
    hasBluetooth: {
      type: Boolean,
    },
    bluetoothVersion: {
      type: String,
    },
    hasMicrophone: {
      type: Boolean,
    },
    microphoneType: {
      type: String,
    },
  },
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review", // References Review model
    },
  ],
});

module.exports = mongoose.model("Equipment", equipmentSchema);
