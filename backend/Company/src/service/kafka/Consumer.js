const { kafka } = require("../../config/kafka");
const Application = require("../../models/Application");
const Job = require("../../models/Job");
const Notification = require("../../models/Notification");

const consumer = kafka.consumer({ groupId: "Company-service-group" });

async function startKafkaConsumer() {
  try {
    await consumer.connect();
    console.log("[Kafka Consumer] Connected successfully in Company Service");

    await consumer.subscribe({
      topics: [
        "application-events",
        "application-status-events",
        "job-events",
        "interview-events",
        "recruiter-events",
        "company-events",
        "candidate-events",
        "notification-events",
      ],
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const rawValue = message.value?.toString();
          if (!rawValue) return;

          const data = JSON.parse(rawValue);
          const { eventType, payload } = data;

          if (!eventType || !payload) return;

          console.log(`[Company Kafka Consumer] Received [${eventType}] on topic [${topic}]`);

          // 1. Application Events (From Candidate Service)
          if (topic === "application-events") {
            if (eventType === "APPLICATION_SUBMITTED" || eventType === "APPLICATION_CREATED") {
              const {
                applicationId,
                jobId,
                companyId,
                candidateId,
                candidate,
                resumeUrl,
                coverLetter,
                assessmentScore,
                assessmentPassed,
                status,
                appliedAt,
              } = payload;

              const targetAppId = applicationId || payload._id;

              const appDoc = await Application.findOneAndUpdate(
                { applicationId: targetAppId },
                {
                  applicationId: targetAppId,
                  jobId,
                  companyId,
                  candidateId,
                  candidate: candidate || {},
                  resumeUrl: resumeUrl || "",
                  coverLetter: coverLetter || "",
                  assessmentScore: assessmentScore || 0,
                  assessmentPassed: assessmentPassed || false,
                  status: status || "applied",
                  appliedAt: appliedAt ? new Date(appliedAt) : new Date(),
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );

              // Increment applicationsCount on Job and Notify Recruiter
              const job = await Job.findByIdAndUpdate(
                jobId,
                { $inc: { applicationsCount: 1 } },
                { new: true }
              );

              if (job?.recruiterId) {
                await Notification.create({
                  recruiterId: job.recruiterId,
                  type: "application_received",
                  title: "New Job Application Received",
                  message: `${candidate?.name || "A candidate"} applied for "${job.title}". Assessment Score: ${
                    assessmentScore ?? 0
                  } marks (${assessmentPassed ? "Passed" : "Needs Review"}).`,
                  referenceId: appDoc._id,
                }).catch((err) => console.warn("Recruiter notification warning:", err.message));
              }

              console.log(`[Company Kafka Consumer] Application synced: ${targetAppId} for Job ${jobId}`);
            } else if (eventType === "APPLICATION_WITHDRAWN") {
              const targetAppId = payload.applicationId || payload._id;
              if (targetAppId) {
                await Application.findOneAndUpdate(
                  { applicationId: targetAppId },
                  { status: "rejected", rejectionReason: "Withdrawn by candidate" }
                );
                console.log(`[Company Kafka Consumer] Application withdrawn: ${targetAppId}`);
              }
            }
          }

          // 2. Application Status Events (From Admin / Platform overrides)
          if (topic === "application-status-events") {
            if (eventType === "APPLICATION_STATUS_UPDATED") {
              const targetAppId = payload.applicationId || payload._id;
              const { status, rejectionReason } = payload;

              if (targetAppId && status) {
                const updateFields = { status };
                if (rejectionReason) updateFields.rejectionReason = rejectionReason;

                await Application.findOneAndUpdate({ applicationId: targetAppId }, { $set: updateFields });
                console.log(`[Company Kafka Consumer] Application status synced: ${targetAppId} -> ${status}`);
              }
            }
          }

          // 3. Job Events (From Admin Service - admin-side job status changes)
          if (topic === "job-events") {
            if (eventType === "JOB_STATUS_UPDATED") {
              const targetJobId = payload.jobId || payload._id;
              if (targetJobId) {
                const jobUpdate = {};
                if (payload.status) jobUpdate.status = payload.status;

                await Job.findByIdAndUpdate(targetJobId, { $set: jobUpdate });

                // Notify recruiter about admin's job status change
                const job = await Job.findById(targetJobId).lean();
                if (job?.recruiterId) {
                  await Notification.create({
                    recruiterId: job.recruiterId,
                    type: "job_status_updated",
                    title: "Job Status Updated by Admin",
                    message: `Your job "${job.title}" status has been changed to "${payload.status}" by admin.`,
                    referenceId: targetJobId,
                  }).catch((err) => console.warn("Job status notification warning:", err.message));
                }

                console.log(`[Company Kafka Consumer] Job status updated: ${targetJobId} -> ${payload.status}`);
              }
            } else if (eventType === "JOB_DELETED") {
              const targetJobId = payload.jobId || payload._id;
              if (targetJobId) {
                await Job.findByIdAndUpdate(targetJobId, { status: "closed" });
                console.log(`[Company Kafka Consumer] Job closed by admin: ${targetJobId}`);
              }
            }
          }

          // 4. Interview Events (From Admin - admin-side interview overrides)
          if (topic === "interview-events") {
            if (eventType === "INTERVIEW_CANCELLED") {
              const targetInterviewId = payload.interviewId || payload._id;
              if (targetInterviewId) {
                console.log(`[Company Kafka Consumer] Interview cancel event received: ${targetInterviewId}`);
              }
            }
          }

          // 5. Recruiter Events (From Admin - recruiter status/verification updates)
          if (topic === "recruiter-events") {
            if (eventType === "RECRUITER_UPDATED") {
              const { recruiterId, status, isVerified, rejectionReason } = payload;
              if (recruiterId) {
                // Notify the recruiter about admin actions on their account
                await Notification.create({
                  recruiterId,
                  type: "account_updated",
                  title: "Account Updated by Admin",
                  message: `Your account has been updated${status ? `. Status: ${status}` : ""}${
                    isVerified !== undefined ? `. Verified: ${isVerified}` : ""
                  }${rejectionReason ? `. Reason: ${rejectionReason}` : ""}.`,
                  referenceId: recruiterId,
                }).catch((err) => console.warn("Recruiter update notification warning:", err.message));

                console.log(`[Company Kafka Consumer] Recruiter update synced: ${recruiterId}`);
              }
            }
          }

          // 6. Company Events (From Admin - company verification updates)
          if (topic === "company-events") {
            if (eventType === "COMPANY_UPDATED") {
              const { companyId, isVerified, verificationStatus } = payload;
              if (companyId) {
                console.log(`[Company Kafka Consumer] Company update received: ${companyId} verified=${isVerified}`);
              }
            }
          }

          // 7. Candidate Events (From Admin - candidate status changes that affect applications)
          if (topic === "candidate-events") {
            if (
              eventType === "CANDIDATE_UPDATED" ||
              eventType === "CANDIDATE_REGISTERED" ||
              eventType === "CANDIDATE_VERIFIED"
            ) {
              const { candidateId, userId, isActive } = payload;
              const targetId = candidateId || userId;

              if (eventType === "CANDIDATE_REGISTERED" || eventType === "CANDIDATE_VERIFIED") {
                console.log(`[Company Kafka] Candidate event received: ${eventType} for ${targetId}`);
              } else if (targetId && isActive === false) {
                // If candidate is blocked, update their pending applications
                await Application.updateMany(
                  { candidateId: targetId, status: { $in: ["applied", "assessment", "under_review"] } },
                  { $set: { status: "rejected", rejectionReason: "Candidate account blocked by admin" } }
                ).catch(() => {});

                console.log(`[Company Kafka Consumer] Candidate ${targetId} blocked - applications updated`);
              }
            }
          }

          // 8. Notification Events (From Admin - broadcast notifications to recruiters)
          if (topic === "notification-events") {
            if (eventType === "NOTIFICATION_CREATED") {
              const { recruiterId, title, message: notifMessage, type, referenceId } = payload;

              if (recruiterId && title && notifMessage) {
                await Notification.create({
                  recruiterId,
                  type: type || "system",
                  title,
                  message: notifMessage,
                  referenceId: referenceId || null,
                }).catch((err) => console.warn("Broadcast notification warning:", err.message));

                console.log(`[Company Kafka Consumer] Notification synced for recruiter: ${recruiterId}`);
              }
            }
          }
        } catch (msgError) {
          console.error("[Company Kafka Consumer] Error processing message:", msgError.message);
        }
      },
    });
  } catch (error) {
    console.error("[Company Kafka Consumer] Initialization failed:", error.message);
  }
}

module.exports = { startKafkaConsumer };
