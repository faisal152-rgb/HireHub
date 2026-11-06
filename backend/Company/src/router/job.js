const express = require("express");
const { companyOrRecruiterAuth } = require("../middleware/auth");
const { recruiterAuth } = require("../middleware/recruiter");
const imageUpload = require("../middleware/upload");
const {
  createJob,
  getMyJobs,
  getJobById,
  updateJobStatus,
  deleteJob,
  getJobApplications,
  updateApplicationStatus,
  getAllApplications,
} = require("../controllers/job");

const router = express.Router();

// Create Job (Company or Recruiter — requires at least one active recruiter under company)
router.post("/create", recruiterAuth, imageUpload.single("image"), createJob);

// Get Company or Recruiter's jobs
router.get("/my-jobs", companyOrRecruiterAuth, getMyJobs);

// View all applications for company & Recruiter portal
router.get("/applications", companyOrRecruiterAuth, getAllApplications);

// Update Job Status (open, paused, closed)
router.patch("/:id/status", companyOrRecruiterAuth, updateJobStatus);

// Delete / Archive Job
router.delete("/:id", recruiterAuth, deleteJob);

// Get Single Job
router.get("/:id", recruiterAuth, getJobById);

// Company & Recruiter View applications for a specific job on company portal (supports ?status=shortlisted, etc.)
router.get("/:jobId/applications", companyOrRecruiterAuth, getJobApplications);



// Company & Recruiter Update applicant status (Shortlist, reject, select)
router.patch("/application/:id/status", companyOrRecruiterAuth, updateApplicationStatus);

module.exports = router;
