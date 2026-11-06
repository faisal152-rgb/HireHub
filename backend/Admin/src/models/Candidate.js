const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      default: "candidate",
    },
    avatar: {
      type: String,
      default: "",
    },
    resumeUrl: {
      type: String,
      default: "",
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    location: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Candidate || mongoose.model("Candidate", candidateSchema);
