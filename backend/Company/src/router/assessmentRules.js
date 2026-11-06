const express = require("express");
const { recruiterAuth } = require("../middleware/recruiter");
const {
  setAssessmentRules,
  getRulesByJob,
  updateRules,
} = require("../controllers/assessmentRules");

const router = express.Router();

router.post("/set", recruiterAuth, setAssessmentRules);
router.get("/job/:jobId", recruiterAuth, getRulesByJob);
router.patch("/:id", recruiterAuth, updateRules);

module.exports = router;
