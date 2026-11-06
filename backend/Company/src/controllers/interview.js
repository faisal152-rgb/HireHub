const Interview = require("../models/Interview");
const Application = require("../models/Application");
const Job = require("../models/Job");
const { publishEvent } = require("../service/kafka/Producer");
const notificationQueue = require("../queues/notificationQueue");
const dispatchInterview = require("../service/interview");
//  Redia 
const connectRedis = require("../config/redis");
const interviewQueue = require("../queues/interviewQueue");

async function invalidateInterviewCache(companyId, recruiterId) {
  try {
    const ids = [companyId, recruiterId].filter(Boolean);
    for (const id of ids) {
      const keys = await connectRedis.keys(`company:${id}:interviews*`);
      if (keys && keys.length > 0) {
        await connectRedis.del(...keys);
      }
    }
  } catch (err) {
    console.warn("Redis interview cache invalidation error:", err.message);
  }
}

// 1. Schedule Interview for an Applicant
async function scheduleInterview(req, res) {
  try {
    const recruiterId = req.recruiter?._id || (req.role === "recruiter" ? req.user._id : null);
    const companyId = req.companyId || req.company?._id || req.user._id;
    const {
      applicationId,
      type,
      scheduledAt,
      duration,
      meetingLink,
      location,
      notes,
    } = req.body;

    if (!applicationId || !scheduledAt) {
      return res.status(400).json({ message: "applicationId and scheduledAt are required" });
    }

    const application = await Application.findOne({
      $or: [{ _id: applicationId }, { applicationId }],
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const job = await Job.findById(application.jobId);

    const interview = new Interview({
      applicationId: application.applicationId || application._id,
      candidateId: application.candidateId,
      companyId: application.companyId || companyId,
      recruiterId: recruiterId || undefined,
      jobId: application.jobId,
      candidateName: application.candidate?.name || application.candidateName || "Candidate",
      candidateEmail: application.candidate?.email || application.candidateEmail || "",
      type: type || "online",
      scheduledAt: new Date(scheduledAt),
      duration: duration || 30,
      meetingLink: meetingLink || "",
      location: location || "",
      status: "scheduled",
      notes: notes || "",
    });

    await interview.save();

    // Update application status to interview
    application.status = "interview";
    await application.save();

    // Emit Kafka Event: INTERVIEW_SCHEDULED so User service receives and notifies candidate
    await publishEvent("interview-events", {
      eventType: "INTERVIEW_SCHEDULED",
      payload: {
        interviewId: interview._id,
        applicationId: interview.applicationId,
        candidateId: interview.candidateId,
        companyId: interview.companyId,
        jobId: interview.jobId,
        type: interview.type,
        scheduledAt: interview.scheduledAt,
        duration: interview.duration,
        meetingLink: interview.meetingLink,
        location: interview.location,
        status: interview.status,
        notes: interview.notes,
      },
    }, interview._id);

    // Create notification
    if (recruiterId) {
      await notificationQueue.add("sendNotification", {
        recruiterId,
        type: "interview_scheduled",
        title: "Interview Scheduled",
        message: `Interview scheduled for "${interview.candidateName}" for the job "${job?.title || 'Job'}"`,
        referenceId: interview._id,
        data: {
          interviewId: interview._id,
          applicationId: interview.applicationId,
          candidateId: interview.candidateId,
          jobId: interview.jobId,
          type: interview.type,
          scheduledAt: interview.scheduledAt,
          duration: interview.duration,
          meetingLink: interview.meetingLink,
          location: interview.location,
          status: interview.status,
          notes: interview.notes,
        },
      });
    }

    // Push to InterviewQueue via Service
    try {
      await interviewQueue.add({
        interviewId: interview._id,
        candidateEmail: interview.candidateEmail,
        candidateName: interview.candidateName,
        scheduledAt: interview.scheduledAt,
        duration: interview.duration,
        meetingLink: interview.meetingLink,
        jobTitle: job?.title || "Job Position",
        recruiterId,
        companyId,
      });
    } catch (queueErr) {
      console.warn("Interview dispatch error:", queueErr.message);
    }
    // Invalidate cached interviews for both company and recruiter
    await invalidateInterviewCache(companyId, recruiterId);

    return res.status(201).json({
      message: "Interview scheduled successfully and notified to candidate",
      interview,
    });
  } catch (error) {
    console.error("Schedule interview error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2. Get All Interviews for Recruiter / Company
async function getMyInterviews(req, res) {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    // ── Pagination ──
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );
    const skip = (page - 1) * limit;

    // ── Status Filter ──
    const rawStatus = req.query.status;
    const status = Array.isArray(rawStatus)
      ? rawStatus[rawStatus.length - 1]
      : rawStatus;

    const cacheKey = `company:${userId}:interviews:s${status || "all"}:p${page}:l${limit}`;

    // Check Interview Cache 
    const cachedInterviews = await connectRedis.get(cacheKey);
    if (cachedInterviews) {
      const parsed = JSON.parse(cachedInterviews);
      return res.status(200).json({
        success: true,
        message: "Interviews retrieved successfully",
        count: parsed.interviews?.length || 0,
        total: parsed.total || 0,
        currentPage: page,
        totalPages: parsed.totalPages || 1,
        limit,
        hasNextPage: page < (parsed.totalPages || 1),
        hasPrevPage: page > 1,
        interviews: parsed.interviews || [],
      });
    }

    // ── Company / Recruiter Filter ──
    const companyId = req.companyId || req.company?._id || (req.role === "company" ? userId : null);
    const filter = companyId ? { $or: [{ companyId }, { recruiterId: userId }] } : { recruiterId: userId };

    if (typeof status === "string" && status.toLowerCase() !== "all") {
      filter.status = status;
    }

    // ── Fetch Interviews + Total Count ──
    const [interviews, total] = await Promise.all([
      Interview.find(filter)
        .populate("jobId", "title category location jobType")
        .sort({ scheduledAt: 1, _id: 1 })
        .skip(skip)
        .limit(limit),

      Interview.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    // ── Set Redis Cache with 1-hour expiry ──
    await connectRedis.set(
      cacheKey,
      JSON.stringify({
        interviews,
        total,
        currentPage: page,
        totalPages,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }),
      "EX",
      3600
    );

    // ── Response ──
    return res.status(200).json({
      success: true,
      message: "Interviews retrieved successfully",
      count: interviews.length,
      total,
      currentPage: page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      interviews,
    });

  } catch (error) {
    console.error("Get interviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// 3. Reschedule Interview
async function rescheduleInterview(req, res) {
  try {
    const { id } = req.params;
    const { scheduledAt, duration, meetingLink, notes } = req.body;

    const interview = await Interview.findById(id);
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (scheduledAt) interview.scheduledAt = new Date(scheduledAt);
    if (duration) interview.duration = duration;
    if (meetingLink) interview.meetingLink = meetingLink;
    if (notes) interview.notes = notes;
    interview.status = "rescheduled";

    await interview.save();

    // Emit Kafka Event
    await publishEvent("interview-events", {
      eventType: "INTERVIEW_RESCHEDULED",
      payload: {
        interviewId: interview._id,
        applicationId: interview.applicationId,
        candidateId: interview.candidateId,
        scheduledAt: interview.scheduledAt,
        duration: interview.duration,
        meetingLink: interview.meetingLink,
        status: interview.status,
      },
    }, interview._id);
     await notificationQueue.add("sendNotification", {
      recruiterId: req.user._id,
      type: "interview_rescheduled",
      title: "Interview Rescheduled",
      message: `Interview rescheduled for "${interview.candidateName}" for the job "${interview.jobId?.title || 'Job'}"`,
      referenceId: interview._id,
      data: {
        interviewId: interview._id,
        applicationId: interview.applicationId,
        candidateId: interview.candidateId,
        jobId: interview.jobId,
        type: interview.type,
        scheduledAt: interview.scheduledAt,
        duration: interview.duration,
        meetingLink: interview.meetingLink,
        location: interview.location,
        status: interview.status,
        notes: interview.notes,
      },
     })

     // Invalidate cached interviews
     await invalidateInterviewCache(interview.companyId, interview.recruiterId);

    return res.status(200).json({
      message: "Interview rescheduled successfully",
      interview,
    });
  } catch (error) {
    console.error("Reschedule interview error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 4. Cancel Interview
async function cancelInterview(req, res) {
  try {
    const { id } = req.params;
    const interview = await Interview.findById(id);
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    interview.status = "cancelled";
    await interview.save();

    // Emit Kafka Event
    await publishEvent("interview-events", {
      eventType: "INTERVIEW_CANCELLED",
      payload: {
        interviewId: interview._id,
        applicationId: interview.applicationId,
        candidateId: interview.candidateId,
        status: "cancelled",
      },
    }, interview._id);
     await notificationQueue.add("sendNotification", {
      recruiterId: req.user._id,
      type: "interview_cancelled",
      title: "Interview Cancelled",
      message: `Interview cancelled for "${interview.candidateName}" for the job "${interview.jobId?.title || 'Job'}"`,
      referenceId: interview._id,
      data: {
        interviewId: interview._id,
        applicationId: interview.applicationId,
        candidateId: interview.candidateId,
        jobId: interview.jobId,
        type: interview.type,
        scheduledAt: interview.scheduledAt,
        duration: interview.duration,
        meetingLink: interview.meetingLink,
        location: interview.location,
        status: interview.status,
        notes: interview.notes,
      },
     });

     // Invalidate cached interviews
     await invalidateInterviewCache(interview.companyId, interview.recruiterId);

    return res.status(200).json({
      message: "Interview cancelled successfully",
      interview,
    });
  } catch (error) {
    console.error("Cancel interview error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 5. Submit Feedback / Complete Interview
async function submitFeedback(req, res) {
  try {
    const { id } = req.params;
    const { feedback, rating, status = "completed" } = req.body;

    const interview = await Interview.findById(id);
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    interview.feedback = feedback || "";
    if (rating) interview.rating = rating;
    interview.status = status;
    await interview.save();

    // Invalidate cached interviews
    await invalidateInterviewCache(interview.companyId, interview.recruiterId);

    return res.status(200).json({
      message: "Interview feedback submitted successfully",
      interview,
    });
  } catch (error) {
    console.error("Submit feedback error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

module.exports = {
  scheduleInterview,
  getMyInterviews,
  rescheduleInterview,
  cancelInterview,
  submitFeedback,
};
