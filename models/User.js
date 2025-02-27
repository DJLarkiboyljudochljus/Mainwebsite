const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: (value) =>
          /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(value),
        message: "Invalid email format",
      },
    },
    dateCreated: {
      type: Date,
      default: Date.now,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    image: {
      type: String,
      default: "/img/default_user.png",
    },
    socketId: { type: String },
  },
  { discriminatorKey: "Role", timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePasswords = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

const Customer = User.discriminator(
  "Customer",
  new mongoose.Schema({
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order", // References Order model
      },
    ],
    cart: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Equipment", // References Equipment model
      },
    ],
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: String,
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Equipment",
      },
    ],
    orderHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    subscriptionStatus: {
      type: String,
      enum: ["Free", "Premium", "VIP"],
      default: "Free",
    },
  }),
);

const Admin = User.discriminator(
  "Admin",
  new mongoose.Schema({
    assignedDepartments: [
      {
        type: String,
      },
    ],
  }),
);

const Worker = User.discriminator(
  "Worker",
  new mongoose.Schema({
    jobTitle: String,
    department: {
      type: String,
    },
    shiftSchedule: {
      startTime: String,
      endTime: String,
      days: [String], // e.g., ["Monday", "Wednesday", "Friday"]
    },
  }),
);

module.exports = {
  User,
  Customer,
  Admin,
  Worker,
};
