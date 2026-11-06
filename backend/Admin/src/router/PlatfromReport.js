const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  generatePlatformReport,
  getPlatformReports,
  deletePlatformReport
} = require("../controllers/PlatformReport");

const router = express.Router();

// Generate platform snapshot report (daily, weekly, monthly, custom)
router.post("/generate", authMiddleware, generatePlatformReport);

// Get list of platform reports
router.get("/", authMiddleware, getPlatformReports);

router.delete("/:id", authMiddleware, deletePlatformReport);

module.exports = router;