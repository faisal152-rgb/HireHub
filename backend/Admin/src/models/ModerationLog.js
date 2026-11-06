const mongoose = require("mongoose");

const moderationLogSchema = new mongoose.Schema(
  {
    moderatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["BLOCK_USER", "UNBLOCK_USER", "REMOVE_JOB", "APPROVE_JOB", "WARN_USER", "FLAG_CONTENT"],
      required: true,
    },
    targetType: {
      type: String,
      enum: ["User", "Recruiter", "Job", "Application"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ModerationLog", moderationLogSchema);
