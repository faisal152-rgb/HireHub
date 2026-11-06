const { Worker } = require("bullmq");
const connectRedis = require("../../config/redis");
const Notification = require("../../models/Notification");

const notificationWorker = new Worker(
  "notificationQueue",
  async (job) => {
    console.log(`[Company NotificationWorker] Processing job ${job.id}`);
    const { recruiterId, companyId, userId, type, title, message, content, referenceId } = job.data;
    
    const targetRecruiterId = recruiterId || userId;
    if (!targetRecruiterId && !companyId) {
      throw new Error("recruiterId or companyId is required to create a notification");
    }

    const notification = await Notification.create({
      ...(targetRecruiterId ? { recruiterId: targetRecruiterId } : {}),
      ...(companyId ? { companyId } : {}),
      type: type || "system",
      title: title || "Notification",
      message: message || content || "",
      referenceId: referenceId || null,
    });

    console.log(`[Company NotificationWorker] Notification created with ID: ${notification._id}`);
    return notification;
  },
  {
    connection: connectRedis,
  }
);

notificationWorker.on("completed", (job) => {
  console.log(`[Company NotificationWorker] Job ${job.id} completed`);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`[Company NotificationWorker] Job ${job?.id} failed:`, err.message);
});

notificationWorker.on("error", (err) => {
  console.warn(`[Company NotificationWorker] Worker connection issue:`, err.message);
});

module.exports = { notificationWorker };
