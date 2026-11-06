const { Worker } = require("bullmq");
const { connection } = require("../../config/redis");
const sendEmail = require("../../service/sendemail");

const emailWorker = new Worker(
  "emailQueue",
  async (job) => {
    console.log(`[Candidate EmailWorker] Processing job ${job.id}`);
    const { to, subject, text, html } = job.data;
    await sendEmail(to, subject, text, html);
    console.log(`[Candidate EmailWorker] Email sent to: ${to}`);
  },
  {
    connection,
  }
);

emailWorker.on("completed", (job) => {
  console.log(`[Candidate EmailWorker] Job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[Candidate EmailWorker] Job ${job?.id} failed:`, err.message);
});

module.exports = { emailWorker };