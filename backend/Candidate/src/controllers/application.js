const Application = require("../models/application");
const Job = require("../models/job");
const CandidateProfile = require("../models/candidateProfile");
const Assessment = require("../models/assessment");
const AssessmentSubmission = require("../models/Submission");
const Resume = require("../models/resume");
const CoverLetter = require("../models/coverLetter");
const { publishEvent } = require("../service/kafka/Producer");

// 1. Check Candidate Eligibility for a Job
// Checks profile completion, duplicate application, and returns policy & test details
async function checkEligibility(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }

    // Check if Job exists and is open
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.status !== "open") {
      return res.status(400).json({ message: "Job is no longer accepting applications" });
    }

    // Check Candidate Profile
    const profile = await CandidateProfile.findOne({ candidateId: candidateId });
    const isProfileComplete = profile && (profile.isProfileCompleted || (profile.phone && profile.skills?.length > 0 && (profile.resume?.url || profile.resume)));

    // Check existing application
    const existingApplication = await Application.findOne({ candidateId, jobId });

    return res.status(200).json({
      jobId,
      jobTitle: job.title,
      companyId: job.companyId,
      companyName: job.companyName,
      isProfileCompleted: !!isProfileComplete,
      missingProfileFields: !isProfileComplete ? {
        phone: !profile?.phone,
        skills: !profile?.skills?.length,
        resume: !profile?.resume?.url,
        education: !profile?.education?.length,
      } : null,
      alreadyApplied: !!existingApplication,
      applicationStatus: existingApplication ? existingApplication.status : null,
      applicationId: existingApplication ? existingApplication._id : null,
      assessmentRequired: job.assessmentRequired,
      assessmentPolicy: job.policy || {
        totalQuestions: 50,
        durationMinutes: 45,
        passingMarks: 25,
        requireCamera: true,
        requireMic: true,
        maxAllowedTabSwitches: 0,
      },
      termsAndConditions: job.termsAndConditions,
      canProceed: !!isProfileComplete && !existingApplication,
    });
  } catch (error) {
    console.error("Check eligibility error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2. Initiate Job Application (Step 1 of Flow)
// Enforces Profile Completion before allowing application initiation
async function applyJob(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { jobId, coverLetterContent } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }

    // Step 1 Check: Candidate Profile must be complete
    const profile = await CandidateProfile.findOne({ candidateId: candidateId });
    if (!profile) {
      return res.status(400).json({
        message: "Candidate profile not found. Please create and complete your profile first.",
        isProfileCompleted: false,
      });
    }

    const hasRequiredFields = profile.isProfileCompleted || (profile.phone && profile.skills?.length > 0 && (profile.resume?.url || profile.resume));

    if (!hasRequiredFields) {
      return res.status(400).json({
        message: "Please complete your candidate profile (phone, skills, resume) before applying to jobs.",
        isProfileCompleted: false,
        profile,
      });
    }

    // Check Job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.status !== "open") {
      return res.status(400).json({ message: "This job is closed for applications" });
    }

    // Check if already applied
    let application = await Application.findOne({ candidateId, jobId });
    if (application) {
      return res.status(400).json({
        message: "You have already initiated or submitted an application for this job",
        application,
      });
    }

    // Create or link Resume document if candidate has profile resume
    let resumeDoc = null;
    if (profile.resume?.url) {
      resumeDoc = await Resume.findOne({ candidateId, url: profile.resume.url });
      if (!resumeDoc) {
        resumeDoc = await Resume.create({
          candidateId,
          url: profile.resume.url,
          publicId: profile.resume.publicId || "",
          title: `${req.user.name || "Candidate"} Resume`,
        });
      }
    }

    // Create CoverLetter if provided
    let coverLetterDoc = null;
    if (coverLetterContent) {
      coverLetterDoc = await CoverLetter.create({
        candidateId,
        content: coverLetterContent,
      });
    }

    // Find assessment if required for job
    let assessmentId = job.assessmentId;
    if (!assessmentId && job.assessmentRequired) {
      const assessment = await Assessment.findOne({ jobId, isActive: true });
      if (assessment) assessmentId = assessment._id;
    }

    // Create initial Application
    application = new Application({
      candidateId,
      jobId,
      companyId: job.companyId,
      status: job.assessmentRequired ? "assessment" : "applied",
      resumeId: resumeDoc ? resumeDoc._id : undefined,
      coverLetterId: coverLetterDoc ? coverLetterDoc._id : undefined,
      assessmentId: assessmentId || undefined,
      appliedAt: new Date(),
    });

    await application.save();

    return res.status(201).json({
      message: "Application initiated successfully. Proceed to policy and assessment.",
      applicationId: application._id,
      status: application.status,
      assessmentRequired: job.assessmentRequired,
      assessmentId,
      policy: job.policy,
      termsAndConditions: job.termsAndConditions,
    });
  } catch (error) {
    console.error("Apply job error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 3. Finalize & Submit Application (After Assessment & Terms & Conditions)
// Publishes event to Kafka so Company / Recruiter service receives it immediately
async function submitApplication(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { applicationId, termsAccepted } = req.body;

    if (!applicationId) {
      return res.status(400).json({ message: "applicationId is required" });
    }

    if (!termsAccepted) {
      return res.status(400).json({ message: "You must accept the terms and conditions to submit your application" });
    }

    const application = await Application.findOne({ _id: applicationId, candidateId });
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.status === "applied" || application.status === "under_review") {
      return res.status(400).json({ message: "Application has already been submitted", application });
    }

    const job = await Job.findById(application.jobId);

    // If assessment is required, verify assessment submission
    let submission = null;
    if (job?.assessmentRequired || application.assessmentId) {
      submission = await AssessmentSubmission.findOne({
        applicationId,
        candidateId,
      });

      if (!submission || (submission.status !== "completed" && submission.status !== "auto_submitted")) {
        return res.status(400).json({
          message: "Please complete and submit the required assessment before final application submission.",
        });
      }

      application.assessmentScore = submission.totalMarksObtained;
      application.assessmentPassed = submission.isPassed;
      application.assessmentCompletedAt = submission.submittedAt || new Date();
    }

    // Update Application Status to applied / under_review
    application.status = "applied";
    application.appliedAt = new Date();
    await application.save();

    // Fetch Candidate Profile & Details to send full payload to Company Service
    const profile = await CandidateProfile.findOne({ candidateId: candidateId });
    const resume = application.resumeId ? await Resume.findById(application.resumeId) : null;
    const coverLetter = application.coverLetterId ? await CoverLetter.findById(application.coverLetterId) : null;

    // Emit Kafka Event: APPLICATION_SUBMITTED to Company / Recruiter Service
    await publishEvent(
      "application-events",
      {
        eventType: "APPLICATION_SUBMITTED",
        payload: {
          applicationId: application._id,
          candidateId: application.candidateId,
          jobId: application.jobId,
          companyId: application.companyId,
          status: application.status,
          appliedAt: application.appliedAt,
          assessmentScore: application.assessmentScore,
          assessmentPassed: application.assessmentPassed,
          resumeUrl: resume?.url || profile?.resume?.url || "",
          coverLetter: coverLetter?.content || "",
          candidate: {
            name: req.candidate.name,
            email: req.candidate.email,
            phone: profile?.phone || "",
            location: profile?.location || "",
            bio: profile?.bio || "",
            skills: profile?.skills || [],
            education: profile?.education || [],
            experience: profile?.experience || [],
            portfolioUrl: profile?.portfolioUrl || "",
            githubUrl: profile?.githubUrl || "",
            linkedinUrl: profile?.linkedinUrl || "",
          },
          submissionId: submission ? submission._id : null,
        },
      },
      application._id
    );

    return res.status(200).json({
      message: "Application submitted successfully and transmitted to company review.",
      application,
    });
  } catch (error) {
    console.error("Submit application error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 4. Get All Applied Jobs for Candidate
async function appliedJobs(req, res) {
  try {
    const candidateId = req.user._id;

    const applications = await Application.find({ candidateId })
      .populate("resumeId")
      .populate("coverLetterId")
      .populate("assessmentId")
      .sort({ createdAt: -1 });

    // Attach Job details
    const jobIds = applications.map((app) => app.jobId);
    const jobs = await Job.find({ _id: { $in: jobIds } });
    const jobMap = new Map(jobs.map((j) => [j._id.toString(), j]));

    const result = applications.map((app) => {
      const job = jobMap.get(app.jobId.toString());
      return {
        applicationId: app._id,
        status: app.status,
        appliedAt: app.appliedAt,
        assessmentScore: app.assessmentScore,
        assessmentPassed: app.assessmentPassed,
        job: job || { _id: app.jobId, title: "Job listing", companyName: "Company" },
        rejectionReason: app.rejectionReason,
      };
    });

    return res.status(200).json({
      message: "Applied jobs retrieved successfully",
      count: result.length,
      applications: result,
    });
  } catch (error) {
    console.error("Applied jobs error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 5. Get Single Application Details
async function applications(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { id } = req.params;

    const application = await Application.findOne({ _id: id, candidateId })
      .populate("resumeId")
      .populate("coverLetterId")
      .populate("assessmentId");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const job = await Job.findById(application.jobId);
    const submission = await AssessmentSubmission.findOne({ applicationId: id, candidateId })
      .select("-responses.isCorrect -responses.marksObtained");

    return res.status(200).json({
      message: "Application details retrieved successfully",
      application,
      job,
      assessmentSubmission: submission,
    });
  } catch (error) {
    console.error("Get application details error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 6. Withdraw Application
async function withdrawApplication(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { id } = req.params;

    const application = await Application.findOne({ _id: id, candidateId });
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (["selected", "rejected"].includes(application.status)) {
      return res.status(400).json({ message: `Cannot withdraw application that is already ${application.status}` });
    }

    application.status = "rejected";
    application.rejectionReason = "Withdrawn by candidate";
    await application.save();

    // Notify company via Kafka
    await publishEvent("application-events", {
      eventType: "APPLICATION_WITHDRAWN",
      payload: {
        applicationId: application._id,
        candidateId,
        jobId: application.jobId,
        companyId: application.companyId,
      },
    }, application._id);

    return res.status(200).json({
      message: "Application withdrawn successfully",
      application,
    });
  } catch (error) {
    console.error("Withdraw application error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

module.exports = {
  checkEligibility,
  applyJob,
  submitApplication,
  appliedJobs,
  applications,
  withdrawApplication,
};
