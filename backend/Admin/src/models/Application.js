const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "applied",
        "assessment",
        "assessment_submitted",
        "under_review",
        "shortlisted",
        "interview",
        "selected",
        "rejected",
      ],
      default: "applied",
      index: true,
    },
    resumeUrl: String,
    coverLetter: String,
    assessmentScore: {
      type: Number,
      default: 0,
    },
    assessmentPassed: {
      type: Boolean,
      default: false,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    shortlistedAt: Date,
    selectedAt: Date,
    rejectedAt: Date,
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ candidateId: 1, jobId: 1 });
applicationSchema.index({ jobId: 1, status: 1 });

module.exports = mongoose.models.Application || mongoose.model("Application", applicationSchema);
