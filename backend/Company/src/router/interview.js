const express = require("express");
const { companyOrRecruiterAuth } = require("../middleware/auth");
const {
  scheduleInterview,
  getMyInterviews,
  rescheduleInterview,
  cancelInterview,
  submitFeedback,
} = require("../controllers/interview");

const router = express.Router();

router.post("/schedule", companyOrRecruiterAuth, scheduleInterview);
router.get("/", companyOrRecruiterAuth, getMyInterviews);
router.patch("/:id/reschedule", companyOrRecruiterAuth, rescheduleInterview);
router.patch("/:id/cancel", companyOrRecruiterAuth, cancelInterview);
router.patch("/:id/feedback", companyOrRecruiterAuth, submitFeedback);

module.exports = router;
