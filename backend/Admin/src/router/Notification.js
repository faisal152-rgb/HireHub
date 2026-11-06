const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getNotifications,
  getNotification,
  broadcastNotification,
  markNotificationRead,
  deleteNotification,
  deleteNotifications,
} = require("../controllers/Notification");

const router = express.Router();

// Get all notifications for admin
router.get("/", authMiddleware, getNotifications);

// Broadcast notification / Create alert
router.post("/broadcast", authMiddleware, broadcastNotification);

// Delete all notifications for admin
router.delete("/all", authMiddleware, deleteNotifications);

// Get single notification by ID
router.get("/:id", authMiddleware, getNotification);

// Mark notification as read
router.patch("/:id/read", authMiddleware, markNotificationRead);

// Delete single notification by ID
router.delete("/:id", authMiddleware, deleteNotification);

module.exports = router;
