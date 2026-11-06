const { Worker } = require("bullmq");
const connectRedis = require("../../config/redis");
const Recruiter = require("../../models/Recruiter");
const { publishEvent } = require("../../service/kafka/Producer");

const joinCompanyWorker = new Worker(
  "joinCompanyQueue",
  async (job) => {
    console.log(`[Company JoinCompanyWorker] Processing job ${job.id} (name: ${job.name})`);
    const { eventType, recruiterId, companyId } = job.data;

    if (!recruiterId) {
      throw new Error(`No recruiterId provided for join-company job ${job.id}`);
    }

    if (eventType !== "RECRUITER_ADDED") {
      throw new Error(`Unsupported event type "${eventType}" for join-company job ${job.id}`);
    }

    try {
      const recruiter = await Recruiter.findById(recruiterId);
      if (!recruiter) {
        throw new Error(`Recruiter ${recruiterId} was not found`);
      }

      const recruiterCompanyId = recruiter.companyId.toString();
      if (companyId && companyId !== recruiterCompanyId) {
        throw new Error(`Recruiter ${recruiterId} does not belong to company ${companyId}`);
      }

      await publishEvent(
        "company-events",
        {
          eventType: "RECRUITER_ADDED",
          payload: {
            recruiterId: recruiter._id.toString(),
            companyId: recruiterCompanyId,
            name: recruiter.name,
            email: recruiter.email,
            phone: recruiter.phone,
            image: recruiter.profilePicture?.url || null,
            designation: recruiter.designation,
            department: recruiter.department,
            role: recruiter.role,
            status: recruiter.status,
            profilePicture: recruiter.profilePicture || null,
            joinedAt: recruiter.joinedAt,
          },
        },
        recruiterCompanyId
      );

      console.log(`[Company JoinCompanyWorker] Published recruiter ${recruiterId}`);
      return { success: true, recruiterId };
    } catch (err) {
      console.error(`[Company JoinCompanyWorker] Error processing job ${job.id}:`, err.message);
      throw err;
    }
  },
  {
    connection: connectRedis,
  }
);

joinCompanyWorker.on("completed", (job) => {
  console.log(`[Company JoinCompanyWorker] JoinCompany ${job.id} completed successfully`);
});

joinCompanyWorker.on("failed", (job, err) => {
  console.error(`[Company JoinCompanyWorker] ${job?.id} failed:`, err.message);
});

joinCompanyWorker.on("error", (err) => {
  console.warn(`[Company JoinCompanyWorker] Worker connection issue:`, err.message);
});

module.exports = { joinCompanyWorker };
