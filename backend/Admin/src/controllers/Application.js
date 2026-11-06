const mongoose = require("mongoose");
const Application = require("../models/Application");
const Notification = require("../models/Notification");

/**
 * Get aggregated application statistics (total, status breakdown, score averages)
 * Route: GET /application/stats
 */
async function getApplicationStats(req, res) {
  try {
    const { jobId } = req.query;
    const match = {};

    if (jobId) {
      if (!mongoose.isValidObjectId(jobId)) {
        return res.status(400).json({ success: false, error: "Invalid job ID" });
      }
      match.jobId = new mongoose.Types.ObjectId(jobId);
    }

    const [statusStats, generalStats] = await Promise.all([
      Application.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Application.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalApplications: { $sum: 1 },
            avgAssessmentScore: { $avg: "$assessmentScore" },
            passedCount: {
              $sum: { $cond: [{ $eq: ["$assessmentPassed", true] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const statsOverview = generalStats[0] || {
      totalApplications: 0,
      avgAssessmentScore: 0,
      passedCount: 0,
    };

    return res.status(200).json({
      success: true,
      message: "Application statistics fetched successfully",
      stats: {
        totalApplications: statsOverview.totalApplications,
        averageAssessmentScore: Math.round(statsOverview.avgAssessmentScore || 0),
        assessmentPassedCount: statsOverview.passedCount,
        breakdownByStatus: statusStats,
      },
    });
  } catch (error) {
    console.error("Error fetching application stats:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * Get all applications with filters and pagination
 * Route: GET /application
 */
async function getAllApplications(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      jobId,
      companyId,
      candidateId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (jobId) {
      if (!mongoose.isValidObjectId(jobId)) {
        return res.status(400).json({ success: false, error: "Invalid job ID" });
      }
      filter.jobId = jobId;
    }

    if (companyId) {
      if (!mongoose.isValidObjectId(companyId)) {
        return res.status(400).json({ success: false, error: "Invalid company ID" });
      }
      filter.companyId = companyId;
    }

    if (candidateId) {
      if (!mongoose.isValidObjectId(candidateId)) {
        return res.status(400).json({ success: false, error: "Invalid candidate ID" });
      }
      filter.candidateId = candidateId;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [applications, totalApplications] = await Promise.all([
      Application.find(filter)
        .populate("candidateId", "name email phone")
        .populate("jobId", "title companyName location jobType")
        .populate("companyId", "name email logo")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Application.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalApplications / limitNum);

    return res.status(200).json({
      success: true,
      message: "Applications fetched successfully",
      data: {
        applications,
        pagination: {
          totalApplications,
          currentPage: pageNum,
          totalPages,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching all applications:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * Get single application by ID
 * Route: GET /application/:id
 */
async function getApplicationById(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid application ID" });
    }

    const application = await Application.findById(id)
      .populate("candidateId", "name email phone")
      .populate("jobId", "title companyName location jobType salaryRange")
      .populate("companyId", "name email logo website")
      .lean();

    if (!application) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Application fetched successfully",
      application,
    });
  } catch (error) {
    console.error("Error fetching application by ID:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * Update application status (admin override)
 * Route: PATCH /application/:id/status
 */
async function updateApplicationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid application ID" });
    }

    const allowedStatuses = [
      "applied",
      "assessment",
      "assessment_submitted",
      "under_review",
      "shortlisted",
      "interview",
      "selected",
      "rejected",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }

    const updateData = { status };
    if (status === "shortlisted") updateData.shortlistedAt = new Date();
    if (status === "selected") updateData.selectedAt = new Date();
    if (status === "rejected") {
      updateData.rejectedAt = new Date();
      if (rejectionReason) updateData.rejectionReason = rejectionReason;
    }

    const application = await Application.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }

    try {
      await Notification.create({
        candidateId: application.candidateId,
        title: "Your Application Status Has Been Updated",
        message: `Your application status has been updated to: ${application.status}`,
        type: "update",
        data: {
          applicationId: application._id,
          status: application.status,
        },
      });
    } catch (notifErr) {
      console.warn("Notification creation warning:", notifErr.message);
    }

    // Publish Kafka Event: APPLICATION_STATUS_UPDATED
    try {
      const { publishEvent } = require("../service/kafka/Producer");
      await publishEvent(
        "application-status-events",
        {
          eventType: "APPLICATION_STATUS_UPDATED",
          payload: {
            applicationId: application._id,
            candidateId: application.candidateId,
            jobId: application.jobId,
            companyId: application.companyId,
            status: application.status,
            rejectionReason: application.rejectionReason || "",
          },
        },
        application._id
      );
    } catch (kErr) {
      console.warn("Kafka application status event failed:", kErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      application,
    });
  } catch (error) {
    console.error("Error updating application status:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = {
  getApplicationStats,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
};