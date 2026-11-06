const { Queue } = require("bullmq");
const connectRedis = require("../config/redis");

const interviewQueue = new Queue("interviewQueue", {
  connection: connectRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

module.exports = interviewQueue;
