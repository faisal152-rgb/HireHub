const Redis = require('ioredis');
const { Worker } = require('bullmq');
const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});
const notificationWorker = new Worker("notificationQueue", async (job) => {
    const notification = job.data;
    await saveNotification(notification.userId, notification.content);
}, {
    connection,
})
module.exports = {notificationWorker};