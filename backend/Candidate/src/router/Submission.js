const express = require("express");
const { candidateAuth } = require("../middleware/auth");
const {
  startSubmission,
  getCurrentQuestion,
  submitAnswer,
  logViolation,
  getSubmissionResult,
  getMySubmissions,
} = require("../controllers/Submission");

const router = express.Router();

// Start Assessment Attempt / Session
router.post("/start", candidateAuth, startSubmission);

// Get Current Question (Strict Linear Navigation)
router.get("/question/:submissionId", candidateAuth, getCurrentQuestion);

// Submit Answer for current question & move to next
router.post("/submit-answer", candidateAuth, submitAnswer);

// Log Proctoring Violation (Tab switch, window blur, mic/cam issue)
router.post("/violation", candidateAuth, logViolation);

// Get Assessment Result by submissionId
router.get("/result/:submissionId", candidateAuth, getSubmissionResult);

// Get all assessment submissions of candidate
router.get("/my-submissions", candidateAuth, getMySubmissions);

module.exports = router;
