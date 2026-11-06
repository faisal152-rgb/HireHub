const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getmoderationlogs,
  createrecord,
  getmoderationlog,
  updatemoderationlog,
  deletemoderationlog,
} = require("../controllers/ModerationLog");

const router = express.Router();

// Get all moderation logs with filtering and pagination
router.get("/", authMiddleware, getmoderationlogs);

// Create moderation action log
router.post("/", authMiddleware, createrecord);

// Get moderation log by id
router.get("/:id", authMiddleware, getmoderationlog);

// Update moderation log by id
router.put("/:id", authMiddleware, updatemoderationlog);

// Delete moderation log by id
router.delete("/:id", authMiddleware, deletemoderationlog);

module.exports = router;