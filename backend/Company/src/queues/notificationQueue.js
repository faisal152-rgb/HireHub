const { Queue } = require("bullmq");
const connectRedis = require("../config/redis");

const notificationQueue = new Queue("notificationQueue", {
  connection: connectRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1500,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

module.exports = notificationQueue;
