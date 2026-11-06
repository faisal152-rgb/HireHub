const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getJobStats,
  getAllJobs,
  getJobById,
  updateJobStatus,
} = require("../controllers/Job");

const router = express.Router();

// Total job posts count grouped by status & aggregates
router.get("/stats", authMiddleware, getJobStats);

// Get all jobs with status/type filtering, search, & pagination
router.get("/", authMiddleware, getAllJobs);

// Get single job details by ID
router.get("/:jobId", authMiddleware, getJobById);

// Update job status (open, closed, draft)
router.patch("/:jobId/status", authMiddleware, updateJobStatus);

module.exports = router;