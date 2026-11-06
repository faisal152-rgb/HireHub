const { Worker } = require("bullmq");
const connectRedis = require("../../config/redis");
const Interview = require("../../models/Interview");
const sendEmail = require("../../service/sendemail");
const notificationQueue = require("../../queues/notificationQueue");
const interviewWorker = new Worker(
  "interviewQueue",
  async (job) => {
    console.log(`[Company InterviewWorker] Processing job ${job.id} (name: ${job.name})`);
    const {
      interviewId,
      candidateEmail,
      candidateName,
      scheduledAt,
      duration,
      meetingLink,
      jobTitle,
      recruiterId,
    } = job.data;

    // 1. Send email confirmation to candidate if candidateEmail exists
    if (candidateEmail) {
      try {
        const formattedDate = scheduledAt ? new Date(scheduledAt).toLocaleString() : "TBD";
        const emailSubject = `Interview Scheduled: ${jobTitle || "Job Position"}`;
        const emailBody = `
          <h3>Interview Invitation</h3>
          <p>Dear ${candidateName || "Candidate"},</p>
          <p>Your interview for the position of <strong>${jobTitle || "Job Position"}</strong> has been scheduled.</p>
          <p><strong>Date & Time:</strong> ${formattedDate}</p>
          <p><strong>Duration:</strong> ${duration || 30} minutes</p>
          ${meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ""}
          <p>Best regards,<br/>Hiring Team</p>
        `;

        await sendEmail(
          candidateEmail,
          emailSubject,
          `Your interview has been scheduled for ${formattedDate}.`,
          emailBody
        );
        console.log(`[Company InterviewWorker] Sent interview invitation to: ${candidateEmail}`);
      } catch (emailErr) {
        console.warn(`[Company InterviewWorker] Email notification warning:`, emailErr.message);
      }
    }

    // 2. Notify recruiter if recruiterId exists
    if (recruiterId) {
      try {
        await notificationQueue.add("sendNotification", {
          recruiterId,
          type: "interview_reminder",
          title: "Interview Scheduled Confirmation",
          message: `Interview with ${candidateName || "Candidate"} scheduled for ${scheduledAt ? new Date(scheduledAt).toLocaleString() : "TBD"}`,
          referenceId: interviewId,
        });
      } catch (notifErr) {
        console.warn(`[Company InterviewWorker] Recruiter notification warning:`, notifErr.message);
      }
    }

    return { success: true, interviewId };
  },
  {
    connection: connectRedis,
  }
);

interviewWorker.on("completed", (job) => {
  console.log(`[Company InterviewWorker] Job ${job.id} completed successfully`);
});

interviewWorker.on("failed", (job, err) => {
  console.error(`[Company InterviewWorker] Job ${job?.id} failed:`, err.message);
});

interviewWorker.on("error", (err) => {
  console.warn(`[Company InterviewWorker] Worker connection issue:`, err.message);
});

module.exports = { interviewWorker };
