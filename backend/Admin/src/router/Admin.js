const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { getdashboard, updateprofile} = require("../controllers/Admin");

const router = express.Router();

// Consolidated Admin Dashboard: total users with status, recruiter jobs, and application status
router.get("/dashboard/overview", authMiddleware,getdashboard)
// Update current Admin profile
router.patch("/profile", authMiddleware,updateprofile)

module.exports = router;
