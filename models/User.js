const mongoose = require('mongoose');
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    verificationToken: {
      type: String,
      required: true,
      unique: true,
    },
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  phone: {
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    verificationToken: {
      type: String,
      required: true,
      unique: true,
    },
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ["dev", "admin", "worker", "customer"],
    default: "customer",
  },
  joinDate: {
    type: Date,
    default: new Date(),
  },
  tasks: [{
    title: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
      default: false,
      required: true,
    },
    due: {
      type: Date,
      required: true,
    }
  }],
  image: {
    type: String,
    default: "/img/default_user.png",
  },
});

// Hash the password before saving it to the database.
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare a candidate password with the stored password.
userSchema.methods.comparePasswords = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
