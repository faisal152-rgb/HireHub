const mongoose = require("mongoose");

const recruiterSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    designation: {
      type: String,
      default: "HR / Talent Acquisition",
    },
    department: {
      type: String,
      default: "Human Resources",
    },
    role: {
      type: String,
      enum: ["admin", "recruiter", "hiring_manager"],
      default: "recruiter",
    },
    status: {
      type: String,
      enum: ["active", "pending", "inactive"],
      default: "active",
      index: true,
    },
    addedVia: {
      type: String,
      enum: ["invite_link", "qr_code", "direct"],
      default: "invite_link",
    },
    profilePicture: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },
    bio: {
      type: String,
      maxlength: 1000,
      default: "",
    },
    linkedinUrl: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
recruiterSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model("Recruiter", recruiterSchema);
