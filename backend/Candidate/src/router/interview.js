const express = require("express");
const { candidateAuth } = require("../middleware/auth");
const {
  upcomingInterviews,
  historyInterviews,
  getInterviewDetails,
} = require("../controllers/interview");

const router = express.Router();

router.get("/upcoming", candidateAuth, upcomingInterviews);
router.get("/history", candidateAuth, historyInterviews);
router.get("/details/:id", candidateAuth, getInterviewDetails);

module.exports = router;