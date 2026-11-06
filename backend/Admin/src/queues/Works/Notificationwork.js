const { Worker } = require("bullmq");
const { connection } = require("../../config/redis");
const Notification = require("../../models/Notification");

const notificationWorker = new Worker(
  "notificationQueue",
  async (job) => {
    console.log(`[Admin NotificationWorker] Processing job ${job.id}`);
    const {
      adminId,
      recruiterId,
      candidateId,
      moderatorId,
      userId,
      type = "system",
      title = "Notification",
      message,
      content,
      referenceId = null,
      data = {},
    } = job.data;

    const notification = await Notification.create({
      adminId: adminId || null,
      recruiterId: recruiterId || null,
      candidateId: candidateId || null,
      moderatorId: moderatorId || null,
      userId: userId || null,
      type,
      title,
      message: message || content || "",
      referenceId,
      data,
    });

    console.log(`[Admin NotificationWorker] Notification created with ID: ${notification._id}`);
    return notification;
  },
  {
    connection,
  }
);

notificationWorker.on("completed", (job) => {
  console.log(`[Admin NotificationWorker] Job ${job.id} completed`);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`[Admin NotificationWorker] Job ${job?.id} failed:`, err.message);
});

module.exports = { notificationWorker };