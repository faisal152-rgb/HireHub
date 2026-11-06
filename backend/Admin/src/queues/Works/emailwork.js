const { Worker } = require("bullmq");
const { connection } = require("../../config/redis");
const sendEmail = require("../../service/sendemail");

const emailWorker = new Worker(
    "emailQueue",
    async (job) => {
        console.log(`[Recruiter EmailWorker] Processing job ${job.id}`);
        const { to, subject, text, html } = job.data;
        await sendEmail(to, subject, text, html);
        console.log(`[Recruiter EmailWorker] Email sent to: ${to}`);
    },
    {
        connection,
    }
);

emailWorker.on("completed", (job) => {
    console.log(`[Recruiter EmailWorker] Job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
    console.error(`[Recruiter EmailWorker] Job ${job?.id} failed:`, err.message);
});

module.exports = { emailWorker };