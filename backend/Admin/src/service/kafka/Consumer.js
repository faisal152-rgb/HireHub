const { kafka } = require("../../config/kafka");
const Application = require("../../models/Application");
const Job = require("../../models/Job");
const Notification = require("../../models/Notification");
const Recruiter = require("../../models/Recruiter");
const Company = require("../../models/Company");
const Candidate = require("../../models/Candidate");
const Interview = require("../../models/Interview");
const AuditLog = require("../../models/AuditLog");
const User = require("../../models/User");

const consumer = kafka.consumer({ groupId: "admin-service-group" });

async function startKafkaConsumer() {
  try {
    await consumer.connect();
    console.log("[Kafka Consumer] Connected successfully in Admin Service");

    // Subscribe to all platform and service topics
    await consumer.subscribe({
      topics: [
        "application-events",
        "job-events",
        "recruiter-events",
        "interview-events",
        "application-status-events",
        "application-review-events",
        "platform-report-events",
        "audit-log-events",
        "notification-events",
        "company-events",
        "candidate-events",
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

          console.log(`[Kafka Consumer] Received [${eventType}] on topic [${topic}]`);

          // 1. Job Events (From Company / Recruiter Service)
          if (topic === "job-events") {
            const targetJobId = payload.jobId || payload._id;

            if (eventType === "JOB_CREATED" || eventType === "JOB_UPDATED" || eventType === "JOB_STATUS_UPDATED") {
              if (targetJobId) {
                const jobData = {
                  companyId: payload.companyId || null,
                  recruiterId: payload.recruiterId || payload.userId || null,
                  companyName: payload.companyName || "Company",
                  companyLogo: payload.companyLogo || "",
                  title: payload.title || "Job Title",
                  description: payload.description || "Job Description",
                  requirements: Array.isArray(payload.requirements) ? payload.requirements : [],
                  skillsRequired: Array.isArray(payload.skillsRequired) ? payload.skillsRequired : [],
                  experienceLevel: payload.experienceLevel || "any",
                  jobType: payload.jobType || "full_time",
                  location: payload.location || "Remote",
                  salaryRange: payload.salaryRange || {},
                  deadline: payload.deadline ? new Date(payload.deadline) : undefined,
                  status: payload.status || "open",
                };

                await Job.findByIdAndUpdate(targetJobId, { $set: jobData }, { upsert: true, new: true });
                console.log(`[Kafka Consumer] Synced job: ${payload.title || targetJobId} (${eventType})`);
              }
            } else if (eventType === "JOB_DELETED") {
              if (targetJobId) {
                await Job.findByIdAndDelete(targetJobId);
                console.log(`[Kafka Consumer] Deleted job: ${targetJobId}`);
              }
            }
          }

          // 2. Company Events
          if (topic === "company-events") {
            const targetCompanyId = payload.companyId || payload._id;
            if (targetCompanyId) {
              const companyData = {
                name: payload.name || "Company Name",
                email: payload.email || `${targetCompanyId}@hirehub.internal`,
                phone: payload.phone || "",
                industry: payload.industry || "Technology",
                companySize: payload.companySize || "1-10",
                description: payload.description || "",
                website: payload.website || "",
                logo: payload.logo || payload.companyLogo || "",
                location: payload.location || "",
                country: payload.country || "",
                verificationStatus: payload.verificationStatus || (payload.isVerified ? "verified" : "pending"),
                isVerified: payload.isVerified || payload.verificationStatus === "verified" || false,
              };

              await Company.findByIdAndUpdate(targetCompanyId, { $set: companyData }, { upsert: true, new: true });

              // Handle specific public event types
              if (eventType === "COMPANY_REGISTERED") {
                console.log(`[Admin Kafka] New company registered: ${companyData.name} (${targetCompanyId})`);
                // Create admin notification for new company registration
                await Notification.create({
                  type: "system",
                  title: "New Company Registered",
                  message: `A new company "${companyData.name}" has registered and is pending verification.`,
                  referenceId: targetCompanyId,
                  data: { companyId: targetCompanyId, name: companyData.name, email: companyData.email },
                }).catch((err) => console.warn("Company registration notification warning:", err.message));
              } else if (eventType === "COMPANY_VERIFIED") {
                console.log(`[Admin Kafka] Company verified: ${companyData.name} (${targetCompanyId})`);
              } else {
                console.log(`[Admin Kafka] Synced company: ${companyData.name} (${eventType})`);
              }
            }
          }

          // 3. Recruiter Events
          if (topic === "recruiter-events") {
            const targetRecruiterId = payload.recruiterId || payload._id;
            if (targetRecruiterId && payload.companyId) {
              const recruiterData = {
                companyId: payload.companyId,
                name: payload.name || "Recruiter",
                email: payload.email || `${targetRecruiterId}@hirehub.internal`,
                phone: payload.phone || "",
                designation: payload.designation || "HR / Talent Acquisition",
                department: payload.department || "Human Resources",
                role: payload.role || "recruiter",
                status: payload.status || "active",
                isVerified: payload.isVerified !== undefined ? payload.isVerified : true,
                isProfileCompleted: payload.isProfileCompleted || false,
              };

              await Recruiter.findByIdAndUpdate(targetRecruiterId, { $set: recruiterData }, { upsert: true, new: true });
              console.log(`[Kafka Consumer] Synced recruiter: ${recruiterData.name} (${eventType})`);
            }
          }

          // 4. Application Events (Candidate Service / Company Service)
          if (topic === "application-events") {
            const targetAppId = payload.applicationId || payload._id;

            if (eventType === "APPLICATION_CREATED" || eventType === "APPLICATION_SUBMITTED") {
              if (targetAppId && payload.candidateId && payload.jobId) {
                const applicationData = {
                  candidateId: payload.candidateId,
                  jobId: payload.jobId,
                  companyId: payload.companyId || null,
                  status: payload.status || "applied",
                  resumeUrl: payload.resumeUrl || payload.resume || "",
                  coverLetter: payload.coverLetter || "",
                  assessmentScore: payload.assessmentScore || 0,
                  assessmentPassed: payload.assessmentPassed || false,
                  appliedAt: payload.appliedAt ? new Date(payload.appliedAt) : new Date(),
                };

                await Application.findByIdAndUpdate(targetAppId, { $set: applicationData }, { upsert: true, new: true });

                // Increment applications count on Job
                await Job.findByIdAndUpdate(payload.jobId, { $inc: { applicationsCount: 1 } }).catch(() => {});

                console.log(`[Kafka Consumer] Synced application: ${targetAppId}`);
              }
            } else if (eventType === "APPLICATION_WITHDRAWN") {
              if (targetAppId) {
                await Application.findByIdAndUpdate(targetAppId, {
                  $set: {
                    status: "rejected",
                    rejectionReason: payload.rejectionReason || "Withdrawn by candidate",
                    rejectedAt: new Date(),
                  },
                });
                console.log(`[Kafka Consumer] Application withdrawn: ${targetAppId}`);
              }
            }
          }

          // 5. Application Status Updates
          if (topic === "application-status-events") {
            if (eventType === "APPLICATION_STATUS_UPDATED") {
              const targetAppId = payload.applicationId || payload._id;
              const { candidateId, status, rejectionReason } = payload;

              if (targetAppId) {
                const updateData = { status };
                if (status === "shortlisted") updateData.shortlistedAt = new Date();
                if (status === "selected") updateData.selectedAt = new Date();
                if (status === "rejected") {
                  updateData.rejectedAt = new Date();
                  if (rejectionReason) updateData.rejectionReason = rejectionReason;
                }

                await Application.findByIdAndUpdate(targetAppId, { $set: updateData });

                // Create alert notification for candidate / admin
                if (candidateId) {
                  await Notification.create({
                    candidateId,
                    userId: candidateId,
                    type: "application",
                    title: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                    message: `Application status has been updated to: ${status}${
                      rejectionReason ? `. Reason: ${rejectionReason}` : ""
                    }`,
                    referenceId: targetAppId,
                    data: { applicationId: targetAppId, status },
                  }).catch((err) => console.warn("Failed creating status notification:", err.message));
                }

                console.log(`[Kafka Consumer] Application ${targetAppId} status updated to: ${status}`);
              }
            }
          }

          // 6. Interview Events
          if (topic === "interview-events") {
            const targetInterviewId = payload.interviewId || payload._id;

            if (
              eventType === "INTERVIEW_SCHEDULED" ||
              eventType === "INTERVIEW_CREATED" ||
              eventType === "INTERVIEW_RESCHEDULED"
            ) {
              if (targetInterviewId && payload.applicationId && payload.candidateId && payload.jobId) {
                const interviewData = {
                  applicationId: payload.applicationId,
                  candidateId: payload.candidateId,
                  companyId: payload.companyId || null,
                  jobId: payload.jobId,
                  type: payload.type || "online",
                  scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : new Date(),
                  duration: payload.duration || 30,
                  meetingLink: payload.meetingLink || "",
                  location: payload.location || "",
                  status: eventType === "INTERVIEW_RESCHEDULED" ? "rescheduled" : payload.status || "scheduled",
                  notes: payload.notes || "",
                };

                await Interview.findByIdAndUpdate(targetInterviewId, { $set: interviewData }, { upsert: true, new: true });
                console.log(`[Kafka Consumer] Synced interview: ${targetInterviewId} (${eventType})`);
              }
            } else if (eventType === "INTERVIEW_CANCELLED") {
              if (targetInterviewId) {
                await Interview.findByIdAndUpdate(targetInterviewId, {
                  $set: { status: "cancelled", notes: payload.notes || "Interview cancelled" },
                });
                console.log(`[Kafka Consumer] Interview cancelled: ${targetInterviewId}`);
              }
            }
          }

          // 7. Candidate Events
          if (topic === "candidate-events") {
            const targetCandidateId = payload.candidateId || payload.userId || payload._id;

            if (
              eventType === "CANDIDATE_CREATED" ||
              eventType === "CANDIDATE_UPDATED" ||
              eventType === "CANDIDATE_REGISTERED" ||
              eventType === "CANDIDATE_VERIFIED"
            ) {
              if (targetCandidateId) {
                const candidateData = {
                  userId: payload.userId || targetCandidateId,
                  name: payload.name || "Candidate",
                  email: payload.email || `${targetCandidateId}@hirehub.internal`,
                  phone: payload.phone || "",
                  role: payload.role || "candidate",
                  location: payload.location || "",
                  country: payload.country || "",
                  skills: Array.isArray(payload.skills) ? payload.skills : [],
                  resumeUrl: payload.resumeUrl || payload.resume || "",
                  isVerified: payload.isVerified || false,
                  isActive: payload.isActive !== undefined ? payload.isActive : true,
                };

                await Candidate.findByIdAndUpdate(targetCandidateId, { $set: candidateData }, { upsert: true, new: true });

                if (eventType === "CANDIDATE_REGISTERED") {
                  console.log(`[Admin Kafka] New candidate registered: ${candidateData.name} (${targetCandidateId})`);
                  // Create admin notification for new candidate registration
                  await Notification.create({
                    type: "system",
                    title: "New Candidate Registered",
                    message: `A new candidate "${candidateData.name}" (${candidateData.email}) has registered on the platform.`,
                    referenceId: targetCandidateId,
                    data: { candidateId: targetCandidateId, name: candidateData.name, email: candidateData.email },
                  }).catch((err) => console.warn("Candidate registration notification warning:", err.message));
                } else if (eventType === "CANDIDATE_VERIFIED") {
                  console.log(`[Admin Kafka] Candidate verified: ${candidateData.name} (${targetCandidateId})`);
                } else {
                  console.log(`[Admin Kafka] Synced candidate: ${candidateData.name} (${eventType})`);
                }
              }
            }
          }

          // 8. Audit Log Events
          if (topic === "audit-log-events") {
            if (eventType === "AUDIT_LOG_CREATED" || eventType === "LOG_CREATED") {
              const adminId = payload.adminId || payload.userId;
              if (adminId && payload.action) {
                await AuditLog.create({
                  adminId,
                  action: payload.action,
                  targetType: payload.targetType || payload.entityType || "System",
                  targetId: payload.targetId || payload.entityId || null,
                  details: payload.details || {},
                  ipAddress: payload.ipAddress || "",
                });
                console.log(`[Kafka Consumer] Created audit log for action: ${payload.action}`);
              }
            }
          }

          // 9. Notification Events
          if (topic === "notification-events") {
            if (eventType === "NOTIFICATION_CREATED") {
              if (payload.title && payload.message) {
                await Notification.create({
                  adminId: payload.adminId || null,
                  userId: payload.userId || null,
                  recruiterId: payload.recruiterId || null,
                  candidateId: payload.candidateId || null,
                  type: payload.type || "system",
                  title: payload.title,
                  message: payload.message,
                  referenceId: payload.referenceId || null,
                  isRead: payload.isRead || payload.read || false,
                  data: payload.data || {},
                });
                console.log(`[Kafka Consumer] Stored notification: ${payload.title}`);
              }
            }
          }
        } catch (error) {
          console.error("[Kafka Consumer] Error processing message:", error.message);
        }
      },
    });
  } catch (error) {
    console.error("[Kafka Consumer] Initialization failed in Admin Service:", error.message);
  }
}

module.exports = { startKafkaConsumer };
