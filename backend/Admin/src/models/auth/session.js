const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    accessToken: {
      type: String,
      required: true,
    },

    refreshToken: {
      type: String,
      required: true,
    },

    ipAddress: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    agent: {
      browser: String,
      os: String,
      device: String,
    },

    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);