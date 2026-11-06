const express = require("express");
const { rateLimiterRecruiter } = require("../middleware/ratelimit");
const { createServiceProxy } = require("../utils/proxy");
const router = express.Router();

const companyServiceUrl = process.env.COMPANY_SERVICE_URL || "http://localhost:3002";
const proxyToCompany = createServiceProxy(companyServiceUrl);

// Proxy Company routes (auth, profile, notifications)
router.use("/company", rateLimiterRecruiter, proxyToCompany);

// Proxy Recruiter routes (profile, invite, team management)
router.use("/recruiter", rateLimiterRecruiter, proxyToCompany);

// Proxy Job routes
router.use("/job", rateLimiterRecruiter, proxyToCompany);

// Proxy Interview routes
router.use("/interview", rateLimiterRecruiter, proxyToCompany);

// Proxy Assessment Rules routes
router.use("/assessment-rules", rateLimiterRecruiter, proxyToCompany);

// Proxy Notification routes (standalone prefix)
router.use("/notification", rateLimiterRecruiter, proxyToCompany);

module.exports = router;
