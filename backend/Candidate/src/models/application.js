const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
    },
    coverLetterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoverLetter",
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
    },

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
      trim: true,
      maxlength: 2000,
      default: "",
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    },
    assessmentCompletedAt: Date,
    shortlistedAt: Date,
    selectedAt: Date,
    rejectedAt: Date,
  },
  {
    timestamps: true,
  }
);

applicationSchema.index(
  { candidateId: 1, jobId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Application", applicationSchema);