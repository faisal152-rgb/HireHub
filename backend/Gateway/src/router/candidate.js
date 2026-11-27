const express = require("express");
const { rateLimiterCandidate } = require("../middleware/ratelimit");
const { createServiceProxy } = require("../utils/proxy");
const router = express.Router();

const candidateServiceUrl = process.env.CANDIDATE_SERVICE_URL || "http://localhost:3003";
const proxyToCandidate = createServiceProxy(candidateServiceUrl);

// Proxy Candidate routes to Candidate Service (:3003)
router.use("/candidate", rateLimiterCandidate, proxyToCandidate);
router.use("/profile", rateLimiterCandidate, proxyToCandidate);
router.use("/jobs", rateLimiterCandidate, proxyToCandidate);
router.use("/application", rateLimiterCandidate, proxyToCandidate);
router.use("/assessment", rateLimiterCandidate, proxyToCandidate);
router.use("/submit", rateLimiterCandidate, proxyToCandidate);
router.use("/submission", rateLimiterCandidate, proxyToCandidate);

module.exports = router;