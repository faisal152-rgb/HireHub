const mongoose = require("mongoose");

const platformReportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: ["daily", "weekly", "monthly", "custom", "snapshot"],
      default: "snapshot",
      index: true,
    },
    userMetrics: {
      totalUsers: { type: Number, default: 0 },
      activeUsers: { type: Number, default: 0 },
      inactiveUsers: { type: Number, default: 0 },
      verifiedUsers: { type: Number, default: 0 },
      unverifiedUsers: { type: Number, default: 0 },
      candidatesCount: { type: Number, default: 0 },
      recruitersCount: { type: Number, default: 0 },
      adminsCount: { type: Number, default: 0 },
    },
    recruiterMetrics: {
      totalRecruiters: { type: Number, default: 0 },
      verifiedRecruiters: { type: Number, default: 0 },
      unverifiedRecruiters: { type: Number, default: 0 },
      completedProfiles: { type: Number, default: 0 },
      activeRecruitersWithJobs: { type: Number, default: 0 },
    },
    jobMetrics: {
      totalJobs: { type: Number, default: 0 },
      openJobs: { type: Number, default: 0 },
      closedJobs: { type: Number, default: 0 },
      draftJobs: { type: Number, default: 0 },
    },
    applicationMetrics: {
      totalApplications: { type: Number, default: 0 },
      applied: { type: Number, default: 0 },
      assessment: { type: Number, default: 0 },
      assessment_submitted: { type: Number, default: 0 },
      under_review: { type: Number, default: 0 },
      shortlisted: { type: Number, default: 0 },
      interview: { type: Number, default: 0 },
      selected: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 },
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PlatformReport", platformReportSchema);
