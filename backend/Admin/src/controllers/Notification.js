const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const Admin = require("../models/Admin");
const notificationQueue = require("../queues/notificationQueue");

/**
 * Get all notifications for admin
 * Route: GET /notification
 */
async function getNotifications(req, res) {
  try {
    const adminId = req.query.adminId || req.admin?.id || req.user?._id;
    const { page = 1, limit = 20, isRead } = req.query;

    const filter = {};
    if (adminId && mongoose.isValidObjectId(adminId)) {
      filter.adminId = adminId;
    }

    if (isRead !== undefined) {
      filter.isRead = isRead === "true";
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, totalNotifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);

    const totalPages = Math.ceil(totalNotifications / limitNum);

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: {
        notifications,
        unreadCount,
        pagination: {
          totalNotifications,
          currentPage: pageNum,
          totalPages,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get single notification by ID
 * Route: GET /notification/:id
 */
async function getNotification(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid notification ID" });
    }

    const notification = await Notification.findById(id).lean();

    if (!notification) {
      return res.status(404).json({ success: false, error: "No notification found" });
    }

    return res.status(200).json({
      success: true,
      message: "Notification fetched successfully",
      notification,
    });
  } catch (error) {
    console.error("Error fetching notification by ID:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Broadcast notification / Create alert
 * Route: POST /notification/broadcast
 */
async function broadcastNotification(req, res) {
  try {
    const { type = "system", title, message, referenceId, targetAdminId } = req.body;
    const adminId = targetAdminId || req.admin?.id || req.user?._id;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: "Title and message are required" });
    }

    if (!adminId || !mongoose.isValidObjectId(adminId)) {
      return res.status(400).json({ success: false, error: "Valid admin ID is required" });
    }

    const payload = {
      adminId,
      type,
      title,
      message,
      referenceId: referenceId && mongoose.isValidObjectId(referenceId) ? referenceId : null,
    };

    // Push to queue if BullMQ is configured
    try {
      if (notificationQueue && typeof notificationQueue.add === "function") {
        await notificationQueue.add("broadcastNotification", payload);
      }
    } catch (queueErr) {
      console.warn("Notification queue dispatch skipped:", queueErr.message);
    }

    const notification = await Notification.create(payload);

    // Publish Kafka Event: NOTIFICATION_CREATED
    try {
      const { publishEvent } = require("../service/kafka/Producer");
      await publishEvent(
        "notification-events",
        {
          eventType: "NOTIFICATION_CREATED",
          payload: {
            notificationId: notification._id,
            adminId: notification.adminId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            referenceId: notification.referenceId,
            createdAt: notification.createdAt,
          },
        },
        notification._id
      );
    } catch (kErr) {
      console.warn("Kafka notification broadcast event failed:", kErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Notification broadcasted successfully",
      notification,
    });
  } catch (error) {
    console.error("Error broadcasting notification:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Mark notification as read
 * Route: PATCH /notification/:id/read
 */
async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid notification ID" });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Error marking notification read:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Delete single notification
 * Route: DELETE /notification/:id
 */
async function deleteNotification(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid notification ID" });
    }

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Delete all notifications for admin
 * Route: DELETE /notification/all
 */
async function deleteNotifications(req, res) {
  try {
    const adminId = req.admin?.id || req.user?._id || req.body?.adminId;

    const filter = {};
    if (adminId && mongoose.isValidObjectId(adminId)) {
      filter.adminId = adminId;
    }

    await Notification.deleteMany(filter);

    return res.status(200).json({
      success: true,
      message: "All notifications deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting all notifications:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getNotifications,
  getNotification,
  broadcastNotification,
  markNotificationRead,
  deleteNotification,
  deleteNotifications,
};
