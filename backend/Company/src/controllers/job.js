const Job = require("../models/Job");
const Company = require("../models/auth/Company");
const Recruiter = require("../models/Recruiter");
const Application = require("../models/Application");
const { publishEvent } = require("../service/kafka/Producer");
const { deleteFile } = require("../service/upload");
const imageQueue = require("../queues/imageQueue");
const notificationQueue = require("../queues/notificationQueue");
const jobQueue = require("../queues/jobQueue");
const connectRedis = require("../config/redis");

async function invalidateJobCache(companyId, recruiterId) {
  try {
    const ids = [companyId, recruiterId].filter(Boolean);
    for (const id of ids) {
      const keys = await connectRedis.keys(`company:${id}:jobs*`);
      if (keys && keys.length > 0) {
        await connectRedis.del(...keys);
      }
    }
  } catch (error) {
    console.warn("Redis job cache invalidation error:", error.message);
  }
}

async function invalidateApplicationCache(companyId, recruiterId) {
  try {
    const ids = [companyId, recruiterId].filter(Boolean);
    for (const id of ids) {
      const keys = await connectRedis.keys(`company:${id}:applications*`);
      if (keys && keys.length > 0) {
        await connectRedis.del(...keys);
      }
    }
  } catch (error) {
    console.warn("Redis application cache invalidation error:", error.message);
  }
}


// Helper to resolve company
async function resolveCompanyFromReq(req) {
  if (req.user?.companyId) {
    return await Company.findById(req.user.companyId);
  }
  let company = await Company.findById(req.user?._id);
  if (company) return company;

  const recruiter = await Recruiter.findOne({
    $or: [{ _id: req.user?._id }, { email: req.user?.email }],
  });
  if (recruiter && recruiter.companyId) {
    return await Company.findById(recruiter.companyId);
  }
  return null;
}

// 1. Create Job (Strictly Recruiter Only)
async function createJob(req, res) {
  try {
    const recruiter = req.recruiter || req.user;
    if (!recruiter) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Only active recruiters can create and publish jobs.",
      });
    }

    const {
      title,
      description,
      requirements,
      skillsRequired,
      experienceLevel,
      experience,
      jobType,
      employmentType,
      location,
      salaryRange,
      assessmentRequired,
      policy,
      assessment,
      policies,
      minEducation,
      termsAndConditions,
    } = req.body;
    const parsedAssessment =
      typeof assessment === "string" ? JSON.parse(assessment) : assessment;
    //image upload
    const image = req.file || req.body.image;

    if (!title || !description || !image) {
      return res.status(400).json({ message: "Job title, description and Image are required" });
    }

    // Resolve Company associated with this recruiter
    let company = req.company;
    if (!company || !company._id) {
      company = await Company.findById(recruiter.companyId?._id || recruiter.companyId);
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Associated company profile not found for this recruiter.",
      });
    }
    // Map jobType from employmentType if needed
    const normalizedJobType =
      jobType ||
      (employmentType
        ? employmentType.toLowerCase().replace(/\s+/g, "_")
        : "full_time");

    // Map requirements from policies or requirements
    const combinedRequirements =
      Array.isArray(requirements) && requirements.length > 0
        ? requirements
        : policies
        ? [policies]
        : [];

    // Map policy from assessment object if provided
    const resolvedPolicy = policy || {
      totalQuestions: parsedAssessment?.totalQuestions || 50,
      durationMinutes: parsedAssessment?.duration || 45,
      totalMarks: parsedAssessment?.totalQuestions || 50,
      passingMarks: parsedAssessment?.passingScore || 25,
      requireCamera: parsedAssessment?.proctoring?.camera !== false,
      requireMic: parsedAssessment?.proctoring?.mic !== false,
      maxAllowedTabSwitches: parsedAssessment?.allowedViolations || 0,
    };

    // Instantiate and save Job (assigned to this authenticated recruiter)
    const job = new Job({
      companyId: company._id,
      recruiterId: recruiter._id,
      companyName: company.name,
      companyLogo: company.logo || "",
      title,
      description,
      requirements: combinedRequirements,
      skillsRequired: skillsRequired || [],
      experienceLevel: experienceLevel || experience || "any",
      jobType: normalizedJobType,
      location: location || company.location || "Remote",
      salaryRange: salaryRange || {},
      assessmentRequired: assessmentRequired !== false,
      policy: resolvedPolicy,
      termsAndConditions: termsAndConditions || undefined,
      status: "open",
    });

    await job.save();
    try {
      await imageQueue.add("upload-image", {
        file: image,
        targetType: "job",
        targetId: job._id.toString(),
      });
    } catch (queueError) {
      await job.deleteOne();
      throw queueError;
    }

    // Create notification
    try {
      await notificationQueue.add("sendNotification", {
        recruiterId: recruiter._id,
        type: "job_created",
        title: "Job Created",
        message: `Job "${job.title}" has been created successfully`,
        referenceId: job._id,
        data: {
          jobId: job._id,
          companyId: job.companyId,
          companyName: job.companyName,
          companyLogo: job.companyLogo,
          title: job.title,
          description: job.description,
          status: job.status,
        },
      });
    } catch (notifErr) {
      console.warn("Notification error (job created):", notifErr.message);
    }

    // Push to JobQueue 
    try {
      await jobQueue.add("publishJobEvent", {
        jobId: job._id,
        eventType: "JOB_CREATED",
        title: job.title,
        companyId: job.companyId,
        recruiterId: job.recruiterId,
      });
    } catch (queueErr) {
      console.warn("Job dispatch error:", queueErr.message);
    }

    await invalidateJobCache(job.companyId, job.recruiterId);

    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      job,
      recruiter: {
        _id: recruiter._id,
        name: recruiter.name,
        email: recruiter.email,
        designation: recruiter.designation,
      },
    });
  } catch (error) {
    console.error("Create job error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2. Get Jobs for Company Admin or Recruiter
async function getMyJobs(req, res) {
  try {
    let filter = {};

    // ── Authorization & Filters ──
    if (req.role === "company") {
      const compId = req.companyId || req.company?._id;

      if (!compId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Company not found",
        });
      }

      filter = { companyId: compId };
    } else {
      const recruiterId = req.recruiter?._id || req.user?._id;

      if (!recruiterId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized recruiter",
        });
      }



      filter = { recruiterId };
    }

    // ── Pagination ──
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;
    const userId = req.user?._id;
    const cacheKey = `company:${userId}:jobs:p${page}:l${limit}`;

    // Check Job Cache
    const cachedJobs = await connectRedis.get(cacheKey);
    if (cachedJobs) {
      return res.status(200).json(JSON.parse(cachedJobs));
    }

    // ── Fetch Jobs + Total Count ──
    const [jobs, totalJobs] = await Promise.all([
      Job.find(filter)
        .populate(
          "recruiterId",
          "name email designation role profilePicture status"
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),

      Job.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalJobs / limit);

    // ── Aggregate Application Counts ──
    const jobIds = jobs.map((job) => job._id);

    const applicationCounts = await Application.aggregate([
      {
        $match: {
          jobId: { $in: jobIds },
        },
      },
      {
        $group: {
          _id: "$jobId",
          applications: { $sum: 1 },
          shortlisted: {
            $sum: {
              $cond: [{ $eq: ["$status", "shortlisted"] }, 1, 0],
            },
          },
          hired: {
            $sum: {
              $cond: [{ $eq: ["$status", "selected"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // ── Map Application Counts ──
    const countMap = new Map(
      applicationCounts.map((item) => [
        item._id.toString(),
        item,
      ])
    );

    const jobsWithCounts = jobs.map((job) => {
      const jobObj = job.toObject();

      const counts = countMap.get(job._id.toString());

      jobObj.applications = counts?.applications || 0;
      jobObj.shortlisted = counts?.shortlisted || 0;
      jobObj.hired = counts?.hired || 0;

      return jobObj;
    });


    // ── Response ──
    const response = {
      success: true,
      message: "Jobs retrieved successfully",
      count: jobsWithCounts.length,
      totalJobs,
      currentPage: page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      jobs: jobsWithCounts,
    };

    // Set Redis Cache with 1-hour expiry
    await connectRedis.set(cacheKey, JSON.stringify(response), "EX", 3600);
    return res.status(200).json(response);

  } catch (error) {
    console.error("Get my jobs error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// 2.1 Update Job Status (open, paused, closed) (Strictly Recruiter Only)
async function updateJobStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const recruiterId = req.recruiter?._id || req.user?._id;
    const job = await Job.findOne({ _id: id, recruiterId });
    if (!job) {
      return res.status(404).json({ message: "Job not found or not authorized" });
    }
    const normalizedStatus = status === "active" ? "open" : status;
    job.status = normalizedStatus;
    await job.save();
    await invalidateJobCache(job.companyId, job.recruiterId);
    await publishEvent(
      "job-status-events",
      {
        eventType: "JOB_STATUS_UPDATED",
        payload: {
          jobId: job._id,
          companyId: job.companyId,
          recruiterId: job.recruiterId,
          status: job.status,
        },
      },
      job._id
    );
    notificationQueue.add("sendNotification", {
      recruiterId: recruiterId,
      type: "job_status_updated",
      title: "Job Status Updated",
      message: `Job "${job.title}" status has been updated to ${job.status}`,
      referenceId: job._id,
      data: {
        jobId: job._id,
        companyId: job.companyId,
        recruiterId: job.recruiterId,
        title: job.title,
        status: job.status,
      },
    }).catch((notifErr) => {
      console.warn("Notification error (job status updated):", notifErr.message);
    });

    return res.status(200).json({ message: "Job status updated successfully", job });
  } catch (error) {
    console.error("Update job status error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2.2 Delete / Archive Job (Strictly Recruiter Only)
async function deleteJob(req, res) {
  try {
    const { id } = req.params;
    const recruiterId = req.recruiter?._id || req.user?._id;
    const job = await Job.findOne({ _id: id, recruiterId });
    if (!job) {
      return res.status(404).json({ message: "Job not found or not authorized to delete" });
    }
    if (job.imageFileId) {
      await deleteFile(job.imageFileId);
    }
    await job.deleteOne();
    await invalidateJobCache(job.companyId, job.recruiterId);
    await publishEvent(
      "job-events",
      {
        eventType: "JOB_DELETED",
        payload: {
          jobId: job._id,
          companyId: job.companyId,
          recruiterId: job.recruiterId,
          title: job.title,
        },
      },
      job._id
    );
    notificationQueue.add("sendNotification", {
      recruiterId: recruiterId,
      type: "job_deleted",
      title: "Job Deleted",
      message: `Job "${job.title}" has been deleted successfully`,
      referenceId: job._id,
      data: {
        jobId: job._id,
        companyId: job.companyId,
        recruiterId: job.recruiterId,
        title: job.title,
      },
    }).catch((notifErr) => {
      console.warn("Notification error (job deleted):", notifErr.message);
    });

    return res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Delete job error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2.3 Get Single Job Details (Strictly Recruiter Only)
async function getJobById(req, res) {
  try {
    const { id } = req.params;
    const recruiterId = req.recruiter?._id || req.user?._id;
    const job = await Job.findOne({ _id: id, recruiterId }).populate(
      "recruiterId",
      "name email designation role profilePicture status"
    );
    if (!job) {
      return res.status(404).json({ message: "Job not found or not authorized" });
    }
    return res.status(200).json({ message: "Job retrieved successfully", job });
  } catch (error) {
    console.error("Get job by id error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 3. Get Applications received for a Job on Company && Recruiter Side (supports ?status=shortlisted, etc.)
async function getJobApplications(req, res) {
  try {
    const { jobId } = req.params;
    const { status } = req.query;

    let filter = { jobId };

    if (status && status !== "all" && status !== "All") {
      const normalized = status.toLowerCase().replace(/\s+/g, "_");
      if (normalized === "new") {
        filter.status = "applied";
      } else if (normalized === "in_review" || normalized === "review") {
        filter.status = "under_review";
      } else if (normalized === "hired") {
        filter.status = "selected";
      } else {
        filter.status = normalized;
      }
    }
    // ── Pagination ──
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;


    const [applications, totalApplications] = await Promise.all([
      Application.find(filter)
      .populate({
        path: "jobId",
        select: "title location jobType category recruiterId",
        populate: {
          path: "recruiterId",
          select: "name email designation role profilePicture status",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
      Application.countDocuments(filter),
    ]);

  const totalPages = Math.ceil(totalApplications / limit);

    return res.status(200).json({
      success: true,
      message: "Job applications retrieved successfully",
      count: applications.length,
      totalApplications,
      currentPage: page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      applications,
    });
  } catch (error) {
    console.error("Get job applications error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}


// 4. Update Application Status (Shortlist, Reject, Select)
async function updateApplicationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const application = await Application.findOne({
      $or: [{ _id: id }, { applicationId: id }],
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    application.status = status;
    if (rejectionReason) application.rejectionReason = rejectionReason;
    await application.save();
    const job = await Job.findById(application.jobId).select("recruiterId");
    await invalidateJobCache(application.companyId, job?.recruiterId);
    await invalidateApplicationCache(application.companyId, job?.recruiterId);

    // Publish Kafka Event: APPLICATION_STATUS_UPDATED
    try {
      await publishEvent(
        "application-status-events",
        {
          eventType: "APPLICATION_STATUS_UPDATED",
          payload: {
            applicationId: application.applicationId,
            candidateId: application.candidateId,
            status,
            rejectionReason: application.rejectionReason,
          },
        },
        application.applicationId
      );
    } catch (kafkaErr) {
      console.warn("Kafka event publish skipped/warning:", kafkaErr.message);
    }

    // Create notification
    try {
      await notificationQueue.add("sendNotification", {
        recruiterId: req.user._id,
        type: "application_status_updated",
        title: "Application Status Updated",
        message: `Application status updated to ${status} for job "${application.jobId.title}"`,
        referenceId: application._id,
        data: {
          applicationId: application._id,
          candidateId: application.candidateId,
          jobId: application.jobId,
          status: application.status,
          rejectionReason: application.rejectionReason,
        },
      });
    } catch (notifErr) {
      console.warn("Notification error (application status update):", notifErr.message);
    }

    return res.status(200).json({
      message: `Application status updated to ${status}`,
      application,
    });
  } catch (error) {
    console.error("Update application status error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 5. Get All Applications for Company / Recruiter (supports ?status=shortlisted, etc.)
async function getAllApplications(req, res) {
  try {
    const company = await resolveCompanyFromReq(req);
    const { status } = req.query;

    // ── Filters ──
    let filter = {};

    if (company) {
      filter.companyId = company._id;
    } else if (req.user?._id) {
      filter = {
        $or: [
          { recruiterId: req.user._id },
          { companyId: req.user.companyId || req.user._id },
        ],
      };
    }

    // ── Status Filter ──
    if (status && !["all"].includes(status.toLowerCase())) {
      const normalized = status.toLowerCase().trim().replace(/\s+/g, "_");

      if (normalized === "new") {
        filter.status = "applied";
      } else if (["in_review", "review"].includes(normalized)) {
        filter.status = "under_review";
      } else if (normalized === "hired") {
        filter.status = "selected";
      } else {
        filter.status = normalized;
      }
    }

    // ── Pagination ──
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;
    const cacheOwnerId = company?._id || req.user?._id;
    const cacheKey = `company:${cacheOwnerId}:applications:s${filter.status || "all"}:p${page}:l${limit}`;

    // Check Application Cache
    const cachedApplications = await connectRedis.get(cacheKey);
    if (cachedApplications) {
      return res.status(200).json(JSON.parse(cachedApplications));
    }

    // ── Fetch Applications + Total Count ──
    const [applications, totalApplications] = await Promise.all([
      Application.find(filter)
        .populate({
          path: "jobId",
          select: "title location jobType category recruiterId",
          populate: {
            path: "recruiterId",
            select: "name email designation role profilePicture status",
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Application.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalApplications / limit);

    // ── Set Redis Cache with 1-hour expiry ──
    const response = {
      success: true,
      count: applications.length,
      totalApplications,
      currentPage: page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      applications,
    };

    await connectRedis.set(cacheKey, JSON.stringify(response), "EX", 3600);
    return res.status(200).json(response);

  } catch (error) {
    console.error("Get all applications error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

module.exports = {
  createJob,
  getMyJobs,
  updateJobStatus,
  deleteJob,
  getJobById,
  getJobApplications,
  updateApplicationStatus,
  getAllApplications,
};
