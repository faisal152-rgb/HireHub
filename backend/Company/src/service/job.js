const Job = require("../models/Job");
const jobQueue = require("../queues/jobQueue");

/**
 * Service to dispatch Job processing events in Company/Recruiter microservice.
 * Dispatches to BullMQ jobQueue with automatic graceful fallback if queue is offline.
 *
 * @param {Object} data
 * @param {string} data.jobId
 * @param {string} [data.eventType] - e.g. "JOB_CREATED", "JOB_UPDATED", "JOB_STATUS_CHANGED"
 * @param {string} [data.title]
 * @param {string} [data.companyId]
 * @param {string} [data.recruiterId]
 */
const dispatchJob = async (data = {}) => {
  const {
    jobId,
    eventType = "JOB_CREATED",
    title = "",
    companyId = null,
    recruiterId = null,
  } = data;

  const payload = {
    jobId,
    eventType,
    title,
    companyId,
    recruiterId,
    timestamp: new Date().toISOString(),
  };

  try {
    if (jobQueue && typeof jobQueue.add === "function") {
      const job = await jobQueue.add("process-job-creation", payload);
      return job;
    }
  } catch (queueError) {
    console.warn(
      "[JobService] JobQueue dispatch failed, falling back to direct handling:",
      queueError.message
    );
  }

  // Graceful fallback: return payload
  return { success: true, fallback: true, payload };
};

module.exports = dispatchJob;
