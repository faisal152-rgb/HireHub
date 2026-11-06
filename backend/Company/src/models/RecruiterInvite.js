const mongoose = require("mongoose");

const recruiterInviteSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    // Specific email the invite was addressed to (if sent via email)
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
      index: true,
    },
    // Unique one-time invite code / token
    inviteCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    // Single-use flag: becomes true once used
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      default: null,
    },
    // Expiration date — null means no expiry (reusable company invite).
    // One-time email invites set this to 48 hours explicitly.
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecruiterInvite", recruiterInviteSchema);
