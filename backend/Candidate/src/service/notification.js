const Notification = require("../models/notification");
const notificationQueue = require("../queues/notificationQueue");

const createNotification = async (data) => {
  const { candidateId, type, title, message, content, referenceId } = data;
  try {
    const notification = await notificationQueue.add("sendNotification", {
      candidateId, type, title, message, content, referenceId
    });
    return notification;
  } catch (error) {
    console.error("Error in notification Queue:", error);
    throw error;
  }
}

module.exports = {
  createNotification
}