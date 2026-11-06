const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
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
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    candidate: {
      name: String,
      email: String,
      phone: String,
      location: String,
      bio: String,
      skills: [String],
      education: [mongoose.Schema.Types.Mixed],
      experience: [mongoose.Schema.Types.Mixed],
      portfolioUrl: String,
      githubUrl: String,
      linkedinUrl: String,
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
    status: {
      type: String,
      enum: [
        "applied",
        "under_review",
        "shortlisted",
        "interview",
        "selected",
        "rejected",
      ],
      default: "applied",
      index: true,
    },
    rejectionReason: String,
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);
