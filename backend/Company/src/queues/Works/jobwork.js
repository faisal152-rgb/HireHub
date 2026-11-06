const { Worker } = require("bullmq");
const connectRedis = require("../../config/redis");
const Job = require("../../models/Job");
const Notification = require("../../models/Notification");
const { publishEvent } = require("../../service/kafka/Producer");

const jobWorker = new Worker(
  "jobQueue",
  async (job) => {
    console.log(`[Company JobWorker] Processing job ${job.id} (name: ${job.name})`);
    const { jobId, eventType, recruiterId, companyId, title } = job.data;

    if (!jobId) {
      console.warn(`[Company JobWorker] No jobId provided for job ${job.id}`);
      return;
    }

    try {
      const jobDoc = await Job.findById(jobId);
      if (jobDoc) {
        console.log(`[Company JobWorker] Successfully verified job "${jobDoc.title}" (${jobDoc._id})`);
        
        if (eventType === "JOB_CREATED") {
          try {
            await publishEvent("job-events", {
              eventType: "JOB_CREATED",
              payload: {
                jobId: jobDoc._id,
                companyId: jobDoc.companyId,
                companyName: jobDoc.companyName,
                companyLogo: jobDoc.companyLogo,
                title: jobDoc.title,
                description: jobDoc.description,
                image: jobDoc.image,
                requirements: jobDoc.requirements,
                skillsRequired: jobDoc.skillsRequired,
                experienceLevel: jobDoc.experienceLevel,
                jobType: jobDoc.jobType,
                location: jobDoc.location,
                salaryRange: jobDoc.salaryRange,
                assessmentRequired: jobDoc.assessmentRequired,
                policy: jobDoc.policy,
                termsAndConditions: jobDoc.termsAndConditions,
                status: jobDoc.status,
              },
            }, jobDoc._id);
          } catch (kafkaErr) {
            console.warn(`[Company JobWorker] Kafka publish error:`, kafkaErr.message);
          }
        }
      }
    } catch (err) {
      console.error(`[Company JobWorker] Error processing job ${jobId}:`, err.message);
      throw err;
    }

    console.log(`[Company JobWorker] Completed job task for: ${title || jobId}`);
    return { success: true, jobId };
  },
  {
    connection: connectRedis,
  }
);

jobWorker.on("completed", (job) => {
  console.log(`[Company JobWorker] Job ${job.id} completed successfully`);
});

jobWorker.on("failed", (job, err) => {
  console.error(`[Company JobWorker] Job ${job?.id} failed:`, err.message);
});

jobWorker.on("error", (err) => {
  console.warn(`[Company JobWorker] Worker connection issue:`, err.message);
});

module.exports = { jobWorker };
