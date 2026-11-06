const { Queue } = require("bullmq");
const { connection } = require("../config/redis");


const emailQueue = new Queue("emailQueue", {
  connection,
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


module.exports = emailQueue;
module.exports.emailQueue = emailQueue;

