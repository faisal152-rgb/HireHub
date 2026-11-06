const Notification = require("../models/Notification");
const notificationQueue = require("../queues/notificationQueue");

/**
 * Service to dispatch notifications in Admin microservice.
 * Dispatches to BullMQ queue with automatic DB fallback if queue is unavailable.
 *
 * @param {Object} data
 * @param {string} [data.adminId]
 * @param {string} [data.recruiterId]
 * @param {string} [data.candidateId]
 * @param {string} [data.moderatorId]
 * @param {string} [data.userId]
 * @param {string} [data.type] - e.g. "system", "admin_alert", "application", "job", "update"
 * @param {string} data.title
 * @param {string} data.message
 * @param {string} [data.content]
 * @param {string} [data.referenceId]
 * @param {Object} [data.data] - Additional metadata payload
 */
const createNotification = async (data = {}) => {
  const {
    adminId,
    recruiterId,
    candidateId,
    moderatorId,
    userId,
    type = "system",
    title = "Notification",
    message = "",
    content = "",
    referenceId = null,
    data: extraData = {},
  } = data;

  const payload = {
    adminId: adminId || null,
    recruiterId: recruiterId || null,
    candidateId: candidateId || null,
    moderatorId: moderatorId || null,
    userId: userId || null,
    type,
    title,
    message: message || content,
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
module.exports.createNotification = createNotification;
