const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const path = require("path");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: {
    address: {
      type: String,
      required: true,
      unique: true,
    },
    ver: {
      type: String,
      required: true,
    },
    iVer: {
      type: Boolean,
      default: false,
    },
  },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["customer", "worker", "admin"],
    required: true,
    default: "customer",
  },
  profilePicture: { type: String },
  contactInfo: {
    phone: {
      number: {
        type: String,
        required: true,
      },
      ver: {
        type: String,
        required: true,
      },
      iVer: {
        type: Boolean,
        default: true,
      },
    },
    address: String,
  },
  cart: [{ type: mongoose.Schema.Types.ObjectId, ref: "Equipment" }], // For customers only
  workerDetails: {
    skills: [String], // For workers only
    availability: [Date], // Dates worker is available
    pay: { type: Number }, // Hourly pay for workers
  },

  image: {
    type: String,
    default: "/img/default-user.png",
  },

  bio: { type: String },

  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePasswords = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
