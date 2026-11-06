const mongoose = require("mongoose");
const Job = require("../models/Job");
const Recruiter = require("../models/Recruiter");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");

/**
 * Get job statistics (total jobs, status breakdown, applications count, salary average)
 * Route: GET /job/stats
 */
async function getJobStats(req, res) {
  try {
    const jobStats = await Job.aggregate([
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          openJobs: {
            $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] },
          },
          closedJobs: {
            $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
          },
          draftJobs: {
            $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
          },
          totalApplications: { $sum: "$applicationsCount" },
          avgSalaryMin: { $avg: "$salaryRange.min" },
          avgSalaryMax: { $avg: "$salaryRange.max" },
        },
      },
    ]);

    const jobTypeStats = await Job.aggregate([
      {
        $group: {
          _id: "$jobType",
          count: { $sum: 1 },
        },
      },
    ]);

    const experienceLevelStats = await Job.aggregate([
      {
        $group: {
          _id: "$experienceLevel",
          count: { $sum: 1 },
        },
      },
    ]);

    const statsData = jobStats[0] || {
      totalJobs: 0,
      openJobs: 0,
      closedJobs: 0,
      draftJobs: 0,
      totalApplications: 0,
      avgSalaryMin: 0,
      avgSalaryMax: 0,
    };

    return res.status(200).json({
      success: true,
      message: "Job statistics fetched successfully",
      stats: {
        totalJobs: statsData.totalJobs,
        openJobs: statsData.openJobs,
        closedJobs: statsData.closedJobs,
        draftJobs: statsData.draftJobs,
        totalApplications: statsData.totalApplications,
        averageSalary: {
          min: Math.round(statsData.avgSalaryMin || 0),
          max: Math.round(statsData.avgSalaryMax || 0),
        },
        jobsByType: jobTypeStats,
        jobsByExperience: experienceLevelStats,
      },
    });
  } catch (error) {
    console.error("Error fetching job stats:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get all jobs with filtering (status, jobType, experienceLevel, recruiter, company, search) and pagination
 * Route: GET /job
 */
async function getAllJobs(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      jobType,
      experienceLevel,
      search,
      recruiterId,
      companyId,
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

    if (jobType && jobType !== "all") {
      filter.jobType = jobType;
    }

    if (experienceLevel && experienceLevel !== "all") {
      filter.experienceLevel = experienceLevel;
    }
    if (recruiterId) {
      if (!mongoose.isValidObjectId(recruiterId)) {
        return res.status(400).json({ success: false, error: "Invalid recruiter ID" });
      }
      filter.recruiterId = recruiterId;
    }

    // Filter by companyId
    if (companyId) {
      if (!mongoose.isValidObjectId(companyId)) {
        return res.status(400).json({ success: false, error: "Invalid company ID" });
      }
      filter.companyId = companyId;
    }

    // Search query for title, companyName, or location
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: searchRegex },
        { companyName: searchRegex },
        { location: searchRegex },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [jobs, totalJobs] = await Promise.all([
      Job.find(filter)
        .populate("recruiterId", "name email phone role")
        .populate("companyId", "name email logo website location")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Job.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalJobs / limitNum);

    return res.status(200).json({
      success: true,
      message: "Jobs fetched successfully",
      data: {
        jobs,
        pagination: {
          totalJobs,
          currentPage: pageNum,
          totalPages,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching all jobs:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get single job by ID
 * Route: GET /job/:jobId
 */
async function getJobById(req, res) {
  try {
    const { jobId } = req.params;

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ success: false, error: "Invalid job ID" });
    }

    const job = await Job.findById(jobId)
      .populate("recruiterId", "name email phone role")
      .populate("companyId", "name email logo website location")
      .lean();

    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Job details fetched successfully",
      job,
    });
  } catch (error) {
    console.error("Error fetching job details:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update job status (open, closed, draft)
 * Route: PATCH /job/:jobId/status
 */
async function updateJobStatus(req, res) {
  try {
    const { jobId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ success: false, error: "Invalid job ID" });
    }

    const allowedStatuses = ["open", "closed", "draft"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed values are: ${allowedStatuses.join(", ")}`,
      });
    }

    const existingJob = await Job.findById(jobId);
    if (!existingJob) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }

    const previousStatus = existingJob.status;
    existingJob.status = status;
    const updatedJob = await existingJob.save();

    // Audit log
    try {
      const adminId = req.user?._id || req.admin?._id;
      if (adminId && AuditLog) {
        await AuditLog.create({
          adminId,
          action: "UPDATE_JOB_STATUS",
          targetType: "Job",
          targetId: jobId,
          details: {
            previousStatus,
            newStatus: status,
            title: updatedJob.title,
            companyName: updatedJob.companyName,
          },
          ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
        });
      }
    } catch (logErr) {
      console.warn("AuditLog creation failed:", logErr.message);
    }
   await Notification.create({
      recruiterId:existingJob.recruiterId,
      title: "Job Status Updated",
      message: `Your job "${existingJob.title}" has been updated to "${status}"`,
      type: "update",
      data: {
        job: existingJob,
      },
    });
    // Publish Kafka Event: JOB_UPDATED
    try {
      const { publishEvent } = require("../service/kafka/Producer");
      await publishEvent(
        "job-events",
        {
          eventType: "JOB_STATUS_UPDATED",
          payload: {
            jobId: existingJob._id,
            status,
            previousStatus,
            title: updatedJob.title,
            companyId: updatedJob.companyId,
          },
        },
        existingJob._id
      );
    } catch (kErr) {
      console.warn("Kafka job status event skipped:", kErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Job status updated to '${status}' successfully`,
      job: updatedJob,
    });
  } catch (error) {
    console.error("Error updating job status:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getJobStats,
  getAllJobs,
  getJobById,
  updateJobStatus,
};
