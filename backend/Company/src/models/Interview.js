const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
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
      ref: "Company",
      required: true,
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      required: false,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    candidateName: String,
    candidateEmail: String,
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
      default: 30, // minutes
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
      enum: ["scheduled", "ongoing", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
    },
    notes: {
      type: String,
      default: "",
    },
    feedback: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Interview", interviewSchema);
