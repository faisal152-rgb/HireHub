const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");

/**
 * Get all audit logs with filters and pagination
 * Route: GET /audit-log
 */
async function getalllogs(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      adminId,
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

    if (adminId) {
      if (!mongoose.isValidObjectId(adminId)) {
        return res.status(400).json({ success: false, error: "Invalid admin ID" });
      }
      filter.adminId = adminId;
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
      AuditLog.find(filter)
        .populate("adminId", "name email role")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalLogs / limitNum);

    return res.status(200).json({
      success: true,
      message: "Logs fetched successfully",
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
    console.error("Error fetching audit logs:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get single audit log by ID
 * Route: GET /audit-log/:id
 */
async function getlogbyid(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid log ID" });
    }

    const log = await AuditLog.findById(id)
      .populate("adminId", "name email role")
      .lean();

    if (!log) {
      return res.status(404).json({ success: false, error: "No log found" });
    }

    return res.status(200).json({
      success: true,
      message: "Log fetched successfully",
      log,
    });
  } catch (error) {
    console.error("Error fetching audit log by ID:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getalllogs,
  getlogbyid,
};