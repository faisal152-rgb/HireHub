const Interview = require("../models/interview");
const Job = require("../models/job");

// 1. Get Upcoming Interviews for Logged-In Candidate
async function upcomingInterviews(req, res) {
  try {
    const candidateId = req.candidate._id;

    const interviews = await Interview.find({
      candidateId,
      status: { $in: ["scheduled", "ongoing", "rescheduled"] },
      scheduledAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // allow ongoing within 1 hr
    }).sort({ scheduledAt: 1 });

    // Populate Job details
    const jobIds = interviews.map((item) => item.jobId);
    const jobs = await Job.find({ _id: { $in: jobIds } });
    const jobMap = new Map(jobs.map((j) => [j._id.toString(), j]));

    const result = interviews.map((item) => {
      const job = jobMap.get(item.jobId?.toString());
      return {
        _id: item._id,
        applicationId: item.applicationId,
        type: item.type,
        scheduledAt: item.scheduledAt,
        duration: item.duration,
        meetingLink: item.meetingLink,
        location: item.location,
        status: item.status,
        notes: item.notes,
        jobTitle: job?.title || "Job Interview",
        companyName: job?.companyName || "Company",
        companyLogo: job?.companyLogo || "",
      };
    });

    return res.status(200).json({
      message: "Upcoming interviews retrieved successfully",
      count: result.length,
      interviews: result,
    });
  } catch (error) {
    console.error("Upcoming interviews error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2. Get Interview History (Completed / Past / Cancelled)
async function historyInterviews(req, res) {
  try {
    const candidateId = req.candidate._id;

    const interviews = await Interview.find({
      candidateId,
      $or: [
        { status: { $in: ["completed", "cancelled"] } },
        { scheduledAt: { $lt: new Date() } },
      ],
    }).sort({ scheduledAt: -1 });

    const jobIds = interviews.map((item) => item.jobId);
    const jobs = await Job.find({ _id: { $in: jobIds } });
    const jobMap = new Map(jobs.map((j) => [j._id.toString(), j]));

    const result = interviews.map((item) => {
      const job = jobMap.get(item.jobId?.toString());
      return {
        _id: item._id,
        applicationId: item.applicationId,
        type: item.type,
        scheduledAt: item.scheduledAt,
        duration: item.duration,
        location: item.location,
        status: item.status,
        notes: item.notes,
        feedback: item.feedback,
        jobTitle: job?.title || "Job Interview",
        companyName: job?.companyName || "Company",
      };
    });

    return res.status(200).json({
      message: "Interview history retrieved successfully",
      count: result.length,
      interviews: result,
    });
  } catch (error) {
    console.error("Interview history error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 3. Get Single Interview Details
async function getInterviewDetails(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { id } = req.params;

    const interview = await Interview.findOne({ _id: id, candidateId });
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    const job = await Job.findById(interview.jobId);

    return res.status(200).json({
      message: "Interview details retrieved successfully",
      interview,
      job,
    });
  } catch (error) {
    console.error("Get interview details error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

module.exports = {
  upcomingInterviews,
  historyInterviews,
  getInterviewDetails,
};
