const { Worker } = require("bullmq");
const connectRedis = require("../../config/redis");
const sendEmail = require("../../service/sendemail");

const emailWorker = new Worker(
  "emailQueue",
  async (job) => {
    console.log(`[Company EmailWorker] Processing job ${job.id}`);
    const { type, to, subject, text, html } = job.data;

    if (type === "recruiter-invite") {
      const {
        company,
        inviteCode,
        inviteUrl,
        qrCodeUrl,
      } = job.data;

      await sendEmail.sendRecruiterInviteEmail({
        to,
        company: {
          ...company,
          inviteCode,
        },
        inviteUrl,
        qrCodeUrl,
      });
    } else {
      await sendEmail(to, subject, text, html);
    }

    console.log(`[Company EmailWorker] Email sent to: ${to}`);
  },
  {
    connection: connectRedis,
  }
);

emailWorker.on("completed", (job) => {
  console.log(`[Company EmailWorker] Job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[Company EmailWorker] Job ${job?.id} failed:`, err.message);
});

emailWorker.on("error", (err) => {
  console.warn(`[Company EmailWorker] Worker connection issue:`, err.message);
});

module.exports = { emailWorker };
