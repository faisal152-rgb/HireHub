const Notification = require("../models/Notification");
//  Redia 
const connectRedis = require("../config/redis");

async function resolveNotificationFilter(req) {
  const userId = req.user?._id;
  if (req.role === "recruiter" || req.recruiter) {
    return { recruiterId: req.recruiter?._id || userId };
  }
  // Company admins only receive notifications explicitly addressed to the company.
  const companyId = req.companyId || req.company?._id || userId;
  return { companyId };
}

// 1. Get all notifications (Recruiter & Company)
async function allNotification(req, res) {
  try {
    const baseFilter = await resolveNotificationFilter(req);
    const { page = 1, limit = 50, unreadOnly } = req.query;

    const filter = { ...baseFilter };
    if (unreadOnly === "true") {
      filter.isRead = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...baseFilter, isRead: false });

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
      data: notifications, // fallback compatibility
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2. Mark notification as read
async function readNotification(req, res) {
  try {
    const baseFilter = await resolveNotificationFilter(req);
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, ...baseFilter },
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
    const baseFilter = await resolveNotificationFilter(req);

    await Notification.updateMany(
      { ...baseFilter, isRead: false },
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

// 4. Delete / Clear single notification
async function clearNotification(req, res) {
  try {
    const baseFilter = await resolveNotificationFilter(req);
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({ _id: id, ...baseFilter });
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

// 5. Clear all notifications
async function clearAllNotifications(req, res) {
  try {
    const baseFilter = await resolveNotificationFilter(req);
    await Notification.deleteMany(baseFilter);

    return res.status(200).json({
      message: "All notifications cleared successfully",
    });
  } catch (error) {
    console.error("Clear all notifications error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

module.exports = {
  allNotification,
  readNotification,
  markAllAsRead,
  clearNotification,
  clearAllNotifications,
};
