const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getApplicationStats,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
} = require("../controllers/Application");

const router = express.Router();

// Total job applications count with status breakdown
router.get("/stats", authMiddleware, getApplicationStats);

// Get all applications with filtering & pagination
router.get("/", authMiddleware, getAllApplications);

// Get single application by ID
router.get("/:id", authMiddleware, getApplicationById);

// Update application status
router.patch("/:id/status", authMiddleware, updateApplicationStatus);

module.exports = router;