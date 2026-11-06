const mongoose = require("mongoose");
const PlatformReport = require("../models/PlatformReport");
const User = require("../models/User");
const Recruiter = require("../models/Recruiter");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Notification = require("../models/Notification");

// Generate Platform Report
async function generatePlatformReport(req, res) {
  try {
    const { reportType = "snapshot", metadata = {} } = req.body;
    const adminId = req.user?._id || req.admin?.id || req.admin?._id;

    // 1. User Metrics
    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      candidatesCount,
      recruitersUserCount,
      adminsCount,
    ] = await Promise.all([
      User.countDocuments().catch(() => 0),
      User.countDocuments({ isActive: true }).catch(() => 0),
      User.countDocuments({ isVerified: true }).catch(() => 0),
      User.countDocuments({ role: "candidate" }).catch(() => 0),
      User.countDocuments({ role: "recruiter" }).catch(() => 0),
      User.countDocuments({ role: { $in: ["admin", "superadmin"] } }).catch(() => 0),
    ]);

    const userMetrics = {
      totalUsers,
      activeUsers,
      inactiveUsers: Math.max(0, totalUsers - activeUsers),
      verifiedUsers,
      unverifiedUsers: Math.max(0, totalUsers - verifiedUsers),
      candidatesCount,
      recruitersCount: recruitersUserCount,
      adminsCount,
    };

    // 2. Recruiter Metrics
    const [totalRecruiters, verifiedRecruiters, completedProfiles] = await Promise.all([
      Recruiter.countDocuments().catch(() => 0),
      Recruiter.countDocuments({ isVerified: true }).catch(() => 0),
      Recruiter.countDocuments({ isProfileCompleted: true }).catch(() => 0),
    ]);

    const recruiterMetrics = {
      totalRecruiters,
      verifiedRecruiters,
      unverifiedRecruiters: Math.max(0, totalRecruiters - verifiedRecruiters),
      completedProfiles,
      activeRecruitersWithJobs: 0,
    };

    // 3. Job Metrics
    const [totalJobs, openJobs, closedJobs, draftJobs] = await Promise.all([
      Job.countDocuments().catch(() => 0),
      Job.countDocuments({ status: "open" }).catch(() => 0),
      Job.countDocuments({ status: "closed" }).catch(() => 0),
      Job.countDocuments({ status: "draft" }).catch(() => 0),
    ]);

    const jobMetrics = {
      totalJobs,
      openJobs,
      closedJobs,
      draftJobs,
    };

    // 4. Application Metrics
    const [
      totalApplications,
      appliedCount,
      assessmentCount,
      assessmentSubmittedCount,
      underReviewCount,
      shortlistedCount,
      interviewCount,
      selectedCount,
      rejectedCount,
    ] = await Promise.all([
      Application.countDocuments().catch(() => 0),
      Application.countDocuments({ status: "applied" }).catch(() => 0),
      Application.countDocuments({ status: "assessment" }).catch(() => 0),
      Application.countDocuments({ status: "assessment_submitted" }).catch(() => 0),
      Application.countDocuments({ status: "under_review" }).catch(() => 0),
      Application.countDocuments({ status: "shortlisted" }).catch(() => 0),
      Application.countDocuments({ status: "interview" }).catch(() => 0),
      Application.countDocuments({ status: "selected" }).catch(() => 0),
      Application.countDocuments({ status: "rejected" }).catch(() => 0),
    ]);

    const applicationMetrics = {
      totalApplications,
      applied: appliedCount,
      assessment: assessmentCount,
      assessment_submitted: assessmentSubmittedCount,
      under_review: underReviewCount,
      shortlisted: shortlistedCount,
      interview: interviewCount,
      selected: selectedCount,
      rejected: rejectedCount,
    };

    const report = await PlatformReport.create({
      reportType,
      userMetrics,
      recruiterMetrics,
      jobMetrics,
      applicationMetrics,
      generatedBy: adminId && mongoose.isValidObjectId(adminId) ? adminId : null,
      metadata,
    });

    try {
      if (adminId && mongoose.isValidObjectId(adminId)) {
        await Notification.create({
          adminId,
          type: "system",
          title: "Platform Report Generated",
          message: `A new ${reportType} platform report has been generated successfully.`,
          data: { reportId: report._id },
        });
      }
    } catch (notifErr) {
      console.warn("Report notification warning:", notifErr.message);
    }

    // Publish Kafka Event: PLATFORM_REPORT_CREATED
    try {
      const { publishEvent } = require("../service/kafka/Producer");
      await publishEvent(
        "platform-report-events",
        {
          eventType: "PLATFORM_REPORT_CREATED",
          payload: {
            reportId: report._id,
            reportType: report.reportType,
            userMetrics: report.userMetrics,
            recruiterMetrics: report.recruiterMetrics,
            jobMetrics: report.jobMetrics,
            applicationMetrics: report.applicationMetrics,
            createdAt: report.createdAt,
          },
        },
        report._id
      );
    } catch (kErr) {
      console.warn("Kafka platform report event failed:", kErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Platform report generated successfully",
      report,
    });
  } catch (error) {
    console.error("Error generating platform report:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Get List of Platform Reports
async function getPlatformReports(req, res) {
  try {
    const { page = 1, limit = 10, reportType, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (reportType && reportType !== "all") {
      filter.reportType = reportType;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [reports, totalReports] = await Promise.all([
      PlatformReport.find(filter)
        .populate("generatedBy", "name email role")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PlatformReport.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalReports / limitNum);

    return res.status(200).json({
      success: true,
      message: "Platform reports fetched successfully",
      data: {
        reports,
        pagination: {
          totalReports,
          currentPage: pageNum,
          totalPages,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching platform reports:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Delete Platform Report
async function deletePlatformReport(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid report ID" });
    }

    const report = await PlatformReport.findByIdAndDelete(id);
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Platform report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting platform report:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  generatePlatformReport,
  getPlatformReports,
  deletePlatformReport,
};
