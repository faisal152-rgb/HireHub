const Redis = require('ioredis');
const { Worker } = require('bullmq');
const {sendEmail} = require("./sendemail")

const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});
const emailWorker = new Worker("emailQueue", async (job) => {
    const to = job.data.to;
    const subject = job.data.subject;
    const text = job.data.text;
    const html = job.data.html
    await sendEmail(to, subject, text, html);
}, {
    connection,
})
module.exports = {emailWorker};