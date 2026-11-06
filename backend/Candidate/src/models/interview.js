const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    type: {
      type: String,
      enum: ["online", "onsite", "technical", "hr"],
      default: "online",
    },

    scheduledAt: {
      type: Date,
      required: true,
    },

    duration: {
      type: Number,
      default: 30,
      min: 1,
    },

    meetingLink: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "scheduled",
        "ongoing",
        "completed",
        "cancelled",
        "rescheduled",
      ],
      default: "scheduled",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 3000,
    },

    feedback: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  }
);

interviewSchema.index({ candidateId: 1, scheduledAt: 1 });

module.exports = mongoose.model("Interview", interviewSchema);