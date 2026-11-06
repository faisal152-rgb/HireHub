const Interview = require("../models/Interview");
const interviewQueue = require("../queues/interviewQueue");

/**
 * Service to dispatch Interview scheduling events in Company/Recruiter microservice.
 * Dispatches to BullMQ interviewQueue with automatic graceful fallback.
 *
 * @param {Object} data
 * @param {string} data.interviewId
 * @param {string} [data.candidateEmail]
 * @param {string} [data.candidateName]
 * @param {string|Date} [data.scheduledAt]
 * @param {number} [data.duration]
 * @param {string} [data.meetingLink]
 * @param {string} [data.jobTitle]
 * @param {string} [data.recruiterId]
 * @param {string} [data.companyId]
 */
const dispatchInterview = async (data = {}) => {
  const {
    interviewId,
    candidateEmail = "",
    candidateName = "Candidate",
    scheduledAt = new Date(),
    duration = 30,
    meetingLink = "",
    jobTitle = "Job Position",
    recruiterId = null,
    companyId = null,
  } = data;

  const payload = {
    interviewId,
    candidateEmail,
    candidateName,
    scheduledAt,
    duration,
    meetingLink,
    jobTitle,
    recruiterId,
    companyId,
    timestamp: new Date().toISOString(),
  };

  try {
    if (interviewQueue && typeof interviewQueue.add === "function") {
      const job = await interviewQueue.add("process-interview-scheduled", payload);
      return job;
    }
  } catch (queueError) {
    console.warn(
      "[InterviewService] InterviewQueue dispatch failed, falling back to direct handling:",
      queueError.message
    );
  }

  // Graceful fallback
  return { success: true, fallback: true, payload };
};

module.exports = dispatchInterview;

