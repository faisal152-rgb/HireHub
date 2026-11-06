const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { getalllogs, getlogbyid } = require("../controllers/AuditLog");

const router = express.Router();

// Get all audit logs with filtering and pagination
router.get("/", authMiddleware, getalllogs);

// Get audit log by id
router.get("/:id", authMiddleware, getlogbyid);

module.exports = router;