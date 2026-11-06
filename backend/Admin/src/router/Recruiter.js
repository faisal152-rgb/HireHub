const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getRecruiterStats,
  getAllRecruiters,
  updateRecruiterStatus,
} = require("../controllers/Recruiter");

const router = express.Router();

// Total recruiters with verification status & recruiter total create job post summary
router.get("/stats", authMiddleware, getRecruiterStats);

// Get all recruiters with their total created job posts & applications count
router.get("/all-recruiters", authMiddleware, getAllRecruiters);

// Update recruiter verification status (approve / reject / verify)
router.patch("/:recruiterId/status", authMiddleware, updateRecruiterStatus);

module.exports = router;