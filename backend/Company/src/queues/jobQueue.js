const { Queue } = require("bullmq");
const connectRedis = require("../config/redis");

const jobQueue = new Queue("jobQueue", {
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

module.exports = jobQueue;
