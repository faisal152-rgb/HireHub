const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { getVerificationRequest, approveVerificationRequest, rejectVerificationRequest } = require("../controllers/VerificationRequest");

const router = express.Router();

// Get all pending verification requests (recruiters awaiting verification)
router.get("/", authMiddleware,getVerificationRequest)

// Approve recruiter verification request
router.patch("/:id/approve", authMiddleware,approveVerificationRequest)

// Reject recruiter verification request
router.patch("/:id/reject", authMiddleware,rejectVerificationRequest)


module.exports = router;