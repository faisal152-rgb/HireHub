const express = require("express");
const { candidateAuth } = require("../middleware/auth");
const {
  checkEligibility,
  applyJob,
  submitApplication,
  appliedJobs,
  applications,
  withdrawApplication,
} = require("../controllers/application");

const router = express.Router();

// Step 1 check: Check eligibility, profile completion & job policy before applying
router.get("/eligibility/:jobId", candidateAuth, checkEligibility);

// Step 2: Apply / Initiate application (requires completed candidate profile)
router.post("/apply", candidateAuth, applyJob);

// Step 3: Final submission (after assessment & accepting terms & conditions, emits Kafka event to company)
router.post("/submit", candidateAuth, submitApplication);

// Candidate applied jobs list
router.get("/applied-jobs", candidateAuth, appliedJobs);

// Single application details
router.get("/:id", candidateAuth, applications);

// Withdraw application
router.delete("/:id/withdraw", candidateAuth, withdrawApplication);

module.exports = router;
