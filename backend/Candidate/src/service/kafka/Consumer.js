const { kafka } = require("../../config/kafka");
const Job = require("../../models/job");
const Application = require("../../models/application");
const Notification = require("../../models/notification");
const Interview = require("../../models/interview");

const consumer = kafka.consumer({ groupId: "candidate-service-group" });

async function startKafkaConsumer() {
  try {
    await consumer.connect();
    console.log("[Kafka Consumer] Connected successfully in Candidate Service");

    // Subscribe to topics relevant to Candidate Service
    await consumer.subscribe({
      topics: [
        "job-events",
        "application-status-events",
        "application-review-events",
        "interview-events",
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

          console.log(`[Candidate Kafka Consumer] Received [${eventType}] on topic [${topic}]`);

          // 1. Handle Job Events (Synced from Recruiter / Company Service)
          if (topic === "job-events") {
            if (eventType === "JOB_CREATED") {
              const {
                _id,
                jobId,
                companyId,
                companyName,
                companyLogo,
                title,
                description,
                requirements,
                skillsRequired,
                experienceLevel,
                jobType,
                location,
                salaryRange,
                assessmentId,
                assessmentRequired,
                policy,
                termsAndConditions,
                status,
              } = payload;

              const targetId = jobId || _id;

              await Job.findByIdAndUpdate(
                targetId,
                {
                  companyId,
                  companyName: companyName || "Company",
                  companyLogo: companyLogo || "",
                  title,
                  description,
                  requirements: Array.isArray(requirements) ? requirements : [],
                  skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : [],
                  experienceLevel: experienceLevel || "any",
                  jobType: jobType || "full_time",
                  location: location || "Remote",
                  salaryRange: salaryRange || {},
                  assessmentId: assessmentId || null,
                  assessmentRequired: assessmentRequired !== false,
                  policy: policy || {
                    totalQuestions: 50,
                    durationMinutes: 40,
                    passingMarks: 35,
                    requireCamera: true,
                    requireMic: true,
                    maxAllowedTabSwitches: 0,
                  },
                  termsAndConditions: termsAndConditions || undefined,
                  status: status || "open",
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );

              console.log(`[Candidate Kafka Consumer] Job synced: ${title} (${targetId})`);
            } else if (eventType === "JOB_UPDATED" || eventType === "JOB_STATUS_UPDATED") {
              const targetId = payload.jobId || payload._id;
              if (targetId) {
                await Job.findByIdAndUpdate(targetId, { $set: payload }, { new: true });
                console.log(`[Candidate Kafka Consumer] Job updated: ${targetId}`);
              }
            } else if (eventType === "JOB_DELETED") {
              const targetId = payload.jobId || payload._id;
              if (targetId) {
                await Job.findByIdAndUpdate(targetId, { status: "closed" });
                console.log(`[Candidate Kafka Consumer] Job marked closed: ${targetId}`);
              }
            }
          }

          // 2. Handle Application Status Updates from Company / Admin Service
          if (topic === "application-status-events") {
            if (eventType === "APPLICATION_STATUS_UPDATED") {
              const { applicationId, candidateId, status, rejectionReason } = payload;

              const updateData = { status };
              if (status === "shortlisted") updateData.shortlistedAt = new Date();
              if (status === "selected") updateData.selectedAt = new Date();
              if (status === "rejected") {
                updateData.rejectedAt = new Date();
                if (rejectionReason) updateData.rejectionReason = rejectionReason;
              }

              await Application.findByIdAndUpdate(applicationId, updateData);

              // Notify candidate using candidateId (schema field)
              if (candidateId) {
                await Notification.create({
                  candidateId,
                  type:
                    status === "shortlisted"
                      ? "shortlisted"
                      : status === "selected"
                      ? "selected"
                      : status === "rejected"
                      ? "rejected"
                      : "application",
                  title: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                  message: `Your application status has been updated to: ${status}${
                    rejectionReason ? `. Reason: ${rejectionReason}` : ""
                  }`,
                  referenceId: applicationId,
                }).catch((err) => console.warn("Candidate notification warning:", err.message));
              }

              console.log(`[Candidate Kafka Consumer] Application ${applicationId} status updated to: ${status}`);
            }
          }

          // 3. Handle Application Review Events (from Company / Admin)
          if (topic === "application-review-events") {
            if (eventType === "APPLICATION_REVIEWED" || eventType === "APPLICATION_REVIEW_CREATED") {
              const { applicationId, candidateId, reviewStatus, reviewComments, reviewScore } = payload;

              if (applicationId) {
                const reviewUpdate = {};
                if (reviewStatus) reviewUpdate.reviewStatus = reviewStatus;
                if (reviewComments) reviewUpdate.reviewComments = reviewComments;
                if (reviewScore !== undefined) reviewUpdate.reviewScore = reviewScore;

                await Application.findByIdAndUpdate(applicationId, { $set: reviewUpdate }).catch(() => {});

                // Notify candidate about review
                if (candidateId) {
                  await Notification.create({
                    candidateId,
                    type: "application_reviewed",
                    title: "Application Reviewed",
                    message: `Your application has been reviewed${reviewStatus ? `. Status: ${reviewStatus}` : ""}.`,
                    referenceId: applicationId,
                  }).catch((err) => console.warn("Review notification warning:", err.message));
                }

                console.log(`[Candidate Kafka Consumer] Application review synced: ${applicationId}`);
              }
            }
          }

          // 4. Handle Interview Events (Scheduled/Rescheduled/Cancelled from Company)
          if (topic === "interview-events") {
            const {
              interviewId,
              applicationId,
              candidateId,
              companyId,
              jobId,
              type,
              scheduledAt,
              duration,
              meetingLink,
              location,
              status,
              notes,
            } = payload;

            const targetInterviewId = interviewId || payload._id;

            if (
              eventType === "INTERVIEW_SCHEDULED" ||
              eventType === "INTERVIEW_CREATED" ||
              eventType === "INTERVIEW_RESCHEDULED"
            ) {
              const interviewDoc = await Interview.findByIdAndUpdate(
                targetInterviewId,
                {
                  applicationId,
                  candidateId,
                  companyId,
                  jobId,
                  type: type || "online",
                  scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
                  duration: duration || 30,
                  meetingLink: meetingLink || "",
                  location: location || "",
                  status: eventType === "INTERVIEW_RESCHEDULED" ? "rescheduled" : status || "scheduled",
                  notes: notes || "",
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );

              // Create candidate notification using candidateId
              if (candidateId) {
                await Notification.create({
                  candidateId,
                  type: "interview_scheduled",
                  title: eventType === "INTERVIEW_SCHEDULED" ? "New Interview Scheduled" : "Interview Rescheduled",
                  message: `Your ${type || "online"} interview has been scheduled for ${new Date(
                    scheduledAt
                  ).toLocaleString()}.${meetingLink ? ` Link: ${meetingLink}` : ""}`,
                  referenceId: interviewDoc._id,
                }).catch((err) => console.warn("Interview notification warning:", err.message));
              }

              console.log(`[Candidate Kafka Consumer] Interview ${targetInterviewId} synced`);
            } else if (eventType === "INTERVIEW_CANCELLED") {
              if (targetInterviewId) {
                await Interview.findByIdAndUpdate(targetInterviewId, { status: "cancelled" });

                if (candidateId) {
                  await Notification.create({
                    candidateId,
                    type: "interview_cancelled",
                    title: "Interview Cancelled",
                    message: "Your scheduled interview has been cancelled by the company.",
                    referenceId: targetInterviewId,
                  }).catch((err) => console.warn("Interview cancellation notification warning:", err.message));
                }
                console.log(`[Candidate Kafka Consumer] Interview ${targetInterviewId} cancelled`);
              }
            }
          }

          // 5. Handle Candidate Events (from Admin Service - block/unblock/update)
          if (topic === "candidate-events") {
            if (eventType === "CANDIDATE_UPDATED") {
              const { candidateId, userId, isActive, isVerified } = payload;
              const targetId = candidateId || userId;

              if (targetId) {
                const updateFields = {};
                if (isActive !== undefined) updateFields.isActive = isActive;
                if (isVerified !== undefined) updateFields.isVerified = isVerified;

                if (Object.keys(updateFields).length > 0) {
                  // Update in Application model for the candidate's records
                  // This allows candidate-side to reflect admin changes
                  console.log(`[Candidate Kafka Consumer] Candidate ${targetId} updated: ${JSON.stringify(updateFields)}`);
                }
              }
            }
          }

          // 6. Handle Notification Events (from Admin Service - broadcast notifications)
          if (topic === "notification-events") {
            if (eventType === "NOTIFICATION_CREATED") {
              const { candidateId, title, message: notifMessage, type, referenceId } = payload;

              if (candidateId && title && notifMessage) {
                await Notification.create({
                  candidateId,
                  type: type || "system",
                  title,
                  message: notifMessage,
                  referenceId: referenceId || null,
                }).catch((err) => console.warn("Broadcast notification warning:", err.message));

                console.log(`[Candidate Kafka Consumer] Notification synced for candidate: ${candidateId}`);
              }
            }
          }
        } catch (msgError) {
          console.error("[Candidate Kafka Consumer] Error processing message:", msgError.message);
        }
      },
    });
  } catch (error) {
    console.error("[Candidate Kafka Consumer] Initialization failed:", error.message);
  }
}

module.exports = { startKafkaConsumer };
