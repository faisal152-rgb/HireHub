const Notification = require("../models/notification");

// 1. Get all notifications for logged in candidate
async function allNotification(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const filter = { candidateId };
    if (unreadOnly === "true") {
      filter.isRead = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      message: "Notifications retrieved successfully",
      unreadCount,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2. Mark a single notification as read
async function readNotification(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, candidateId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Read notification error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 3. Mark all notifications as read
async function markAllAsRead(req, res) {
  try {
    const candidateId = req.candidate._id;

    await Notification.updateMany(
      { candidateId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 4. Delete / Clear a specific notification
async function clearNotification(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({ _id: id, candidateId });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({
      message: "Notification cleared successfully",
    });
  } catch (error) {
    console.error("Clear notification error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

module.exports = {
  allNotification,
  readNotification,
  markAllAsRead,
  clearNotification,
};