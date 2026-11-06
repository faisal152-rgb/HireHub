const express = require("express");
const { candidateAuth } = require("../middleware/auth");
const {
  getAssessmentById,
  getAssessmentByJob,
  getAssessmentPolicy,
  generateAssessment,
  evaluateSubmission,
} = require("../controllers/assessment");

const router = express.Router();

// AI Generate assessment for a job (triggered automatically when job is created or on-demand)
router.post("/generate/:jobId", candidateAuth, generateAssessment);

// AI Evaluate submission and return strengths, weaknesses, role-fit score
router.post("/evaluate", candidateAuth, evaluateSubmission);

// Get assessment policy & rules before starting the test
router.get("/policy/:id", candidateAuth, getAssessmentPolicy);

// Get assessment for a specific job (fetches questions without answer keys)
router.get("/job/:jobId", candidateAuth, getAssessmentByJob);

// Get assessment details by ID (without answer keys)
router.get("/:id", candidateAuth, getAssessmentById);

module.exports = router;
