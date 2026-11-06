const { Queue } = require("bullmq");
const { connection } = require("../config/redis");

const notificationQueue = new Queue("notificationQueue", {
  connection,
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
