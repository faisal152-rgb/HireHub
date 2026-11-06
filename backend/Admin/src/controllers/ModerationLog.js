const mongoose = require("mongoose");
const ModerationLog = require("../models/ModerationLog");
const Admin = require("../models/Admin");
const Notification = require("../models/Notification");

/**
 * Get all moderation logs with filtering and pagination
 * Route: GET /moderation-log
 */
async function getmoderationlogs(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      moderatorId,
      action,
      targetType,
      targetId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (moderatorId) {
      if (!mongoose.isValidObjectId(moderatorId)) {
        return res.status(400).json({ success: false, error: "Invalid moderator ID" });
      }
      filter.moderatorId = moderatorId;
    }

    if (action) {
      filter.action = action;
    }

    if (targetType) {
      filter.targetType = targetType;
    }

    if (targetId) {
      if (!mongoose.isValidObjectId(targetId)) {
        return res.status(400).json({ success: false, error: "Invalid target ID" });
      }
      filter.targetId = targetId;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [logs, totalLogs] = await Promise.all([
      ModerationLog.find(filter)
        .populate("moderatorId", "name email role")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ModerationLog.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalLogs / limitNum);

    return res.status(200).json({
      success: true,
      message: "Moderation logs fetched successfully",
      data: {
        logs,
        pagination: {
          totalLogs,
          currentPage: pageNum,
          totalPages,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching moderation logs:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Create a new moderation log
 * Route: POST /moderation-log
 */
async function createrecord(req, res) {
  try {
    const {
      moderatorId,
      action,
      targetType,
      targetId,
      reason,
      notes,
    } = req.body;

    const modId = moderatorId || req.user?._id || req.admin?._id;

    if (!modId || !mongoose.isValidObjectId(modId)) {
      return res.status(400).json({ success: false, error: "Valid moderatorId is required" });
    }

    if (!action || !targetType || !targetId || !reason) {
      return res.status(400).json({
        success: false,
        error: "action, targetType, targetId, and reason are required fields",
      });
    }

    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ success: false, error: "Invalid target ID" });
    }

    const allowedActions = [
      "BLOCK_USER",
      "UNBLOCK_USER",
      "REMOVE_JOB",
      "APPROVE_JOB",
      "WARN_USER",
      "FLAG_CONTENT",
    ];
    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action. Allowed: ${allowedActions.join(", ")}`,
      });
    }

    const allowedTargetTypes = ["User", "Recruiter", "Job", "Application"];
    if (!allowedTargetTypes.includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid targetType. Allowed: ${allowedTargetTypes.join(", ")}`,
      });
    }

    const log = await ModerationLog.create({
      moderatorId: modId,
      action,
      targetType,
      targetId,
      reason,
      notes: notes || "",
    });
    try {
      await Notification.create({
        moderatorId: modId,
        title: "Moderation Log Created",
        message: "Moderation log created successfully",
        type: "update",
        data: {
          log,
        },
      });
    } catch (notifErr) {
      console.warn("Notification creation warning:", notifErr.message);
    }

    // Publish Kafka Events: AUDIT_LOG_CREATED and related action
    try {
      const { publishEvent } = require("../service/kafka/Producer");
      await publishEvent(
        "audit-log-events",
        {
          eventType: "AUDIT_LOG_CREATED",
          payload: {
            auditLogId: log._id,
            adminId: modId,
            action: log.action,
            targetType: log.targetType,
            targetId: log.targetId,
            details: { reason, notes: notes || "" },
          },
        },
        log._id
      );

      if (action === "REMOVE_JOB") {
        await publishEvent(
          "job-events",
          {
            eventType: "JOB_STATUS_UPDATED",
            payload: { jobId: targetId, status: "closed" },
          },
          targetId
        );
      } else if (action === "BLOCK_USER") {
        await publishEvent(
          "candidate-events",
          {
            eventType: "CANDIDATE_UPDATED",
            payload: { userId: targetId, candidateId: targetId, isActive: false },
          },
          targetId
        );
      }
    } catch (kErr) {
      console.warn("Kafka moderation audit event failed:", kErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Moderation record created successfully",
      log,
    });
  } catch (error) {
    console.error("Error creating moderation log:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get single moderation log by ID
 * Route: GET /moderation-log/:id
 */
async function getmoderationlog(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid log ID" });
    }

    const log = await ModerationLog.findById(id)
      .populate("moderatorId", "name email role")
      .lean();

    if (!log) {
      return res.status(404).json({ success: false, error: "No moderation log found" });
    }

    return res.status(200).json({
      success: true,
      message: "Moderation log fetched successfully",
      log,
    });
  } catch (error) {
    console.error("Error fetching moderation log:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update moderation log by ID
 * Route: PUT /moderation-log/:id
 */
async function updatemoderationlog(req, res) {
  try {
    const { id } = req.params;
    const { reason, notes, action } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid log ID" });
    }

    const updates = {};
    if (reason) updates.reason = reason;
    if (notes !== undefined) updates.notes = notes;
    if (action) updates.action = action;

    const log = await ModerationLog.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!log) {
      return res.status(404).json({ success: false, error: "No moderation log found" });
    }
    await Notification.create({
      moderatorId: log.moderatorId,
      title: "Moderation Log Updated",
      message: `Moderation log updated successfully for ${log.action}`,
      type: "update",
      data: {
        log,
      },
    });
    return res.status(200).json({
      success: true,
      message: "Moderation log updated successfully",
      log,
    });
  } catch (error) {
    console.error("Error updating moderation log:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Delete moderation log by ID
 * Route: DELETE /moderation-log/:id
 */
async function deletemoderationlog(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid log ID" });
    }

    const log = await ModerationLog.findByIdAndDelete(id);
    if (!log) {
      return res.status(404).json({ success: false, error: "No moderation log found" });
    }
    await Notification.create({
      moderatorId: log.moderatorId,
      title: "Moderation Log Deleted",
      message: `Moderation log deleted successfully for ${log.action}`,
      type: "delete",
      data: {
        log,
      },
    });
    return res.status(200).json({
      success: true,
      message: "Moderation log deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting moderation log:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getmoderationlogs,
  createrecord,
  getmoderationlog,
  updatemoderationlog,
  deletemoderationlog,
};