const express = require("express");
const { rateLimiterAdmin } = require("../middleware/ratelimit");
const { createServiceProxy } = require("../utils/proxy");
const router = express.Router();

const adminServiceUrl = process.env.ADMIN_SERVICE_URL || "http://localhost:3001";
const proxyToAdmin = createServiceProxy(adminServiceUrl);

// Proxy Admin routes to Admin Service (:3001)
router.use("/admin", rateLimiterAdmin, proxyToAdmin);
router.use("/user", rateLimiterAdmin, proxyToAdmin);
router.use("/platform-report", rateLimiterAdmin, proxyToAdmin);
router.use("/moderation-log", rateLimiterAdmin, proxyToAdmin);
router.use("/audit-log", rateLimiterAdmin, proxyToAdmin);

module.exports = router;
