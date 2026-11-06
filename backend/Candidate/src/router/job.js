const express = require("express");
const { getAllJobs, getJobById } = require("../controllers/job");

const router = express.Router();

// Public / Candidate view jobs
router.get("/", getAllJobs);
router.get("/:id", getJobById);

module.exports = router;
