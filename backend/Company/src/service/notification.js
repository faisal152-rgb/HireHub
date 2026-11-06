const Notification = require("../models/Notification");
const notificationQueue = require("../queues/notificationQueue");

/**
 * Service to dispatch notifications in Recruiter/Company microservice.
 * Dispatches to BullMQ queue with automatic DB fallback if queue is unavailable.
 *
 * @param {Object} data
 * @param {string} [data.recruiterId]
 * @param {string} [data.companyId]
 * @param {string} [data.type] - e.g. "application_received", "interview_reminder", "system"
 * @param {string} data.title
 * @param {string} data.message
 * @param {string} [data.referenceId]
 * @param {Object} [data.data] - Additional metadata payload
 */
const createNotification = async (data = {}) => {
  const {
    recruiterId,
    companyId,
    type = "application_received",
    title = "Notification",
    message = "",
    referenceId = null,
    data: extraData = {},
  } = data;

  const payload = {
    ...(recruiterId ? { recruiterId } : {}),
    ...(companyId ? { companyId } : {}),
    type,
    title,
    message: message || "",
    referenceId,
    data: extraData,
  };

  try {
    // 1. Try to push to BullMQ queue
    if (notificationQueue && typeof notificationQueue.add === "function") {
      const job = await notificationQueue.add("sendNotification", payload);
      return job;
    }
  } catch (queueError) {
    console.warn(
      "[NotificationService] Queue dispatch failed, falling back to direct DB creation:",
      queueError.message
    );
  }

  // 2. Safe Fallback: Create directly in DB if Redis/BullMQ is offline
  try {
    const notification = await Notification.create(payload);
    return notification;
  } catch (dbError) {
    console.error(
      "[NotificationService] Direct DB notification creation failed:",
      dbError.message
    );
    throw dbError;
  }
};

module.exports = createNotification;
