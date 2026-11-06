const { Worker } = require("bullmq");
const { connection } = require("../../config/redis");
const Notification = require("../../models/notification");

const notificationWorker = new Worker(
  "notificationQueue",
  async (job) => {
    console.log(`[Candidate NotificationWorker] Processing job ${job.id}`);
    const { candidateId, type, title, message, content, referenceId } = job.data;

    if (!candidateId) {
      throw new Error("candidateId is required to create a notification");
    }

    const notification = await Notification.create({
      candidateId,
      type: type || "system",
      title: title || "Notification",
      message: message || content || "",
      referenceId: referenceId || null,
    });

    console.log(`[Candidate NotificationWorker] Notification created with ID: ${notification._id} for Candidate: ${candidateId}`);
    return notification;
  },
  {
    connection,
  }
);

notificationWorker.on("completed", (job) => {
  console.log(`[Candidate NotificationWorker] Job ${job.id} completed`);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`[Candidate NotificationWorker] Job ${job?.id} failed:`, err.message);
});

module.exports = { notificationWorker };