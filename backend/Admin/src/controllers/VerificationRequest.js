const mongoose = require("mongoose");
const VerificationRequest = require("../models/VerificationRequest");
const Recruiter = require("../models/Recruiter");
const User = require("../models/User");
const Notification = require("../models/Notification");
const ModerationLog = require("../models/ModerationLog");

// Get All Verification Requests
async function getVerificationRequest(req, res) {
  try {
    const {
      status,
      targetType,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = {};

    // If status is provided, filter by it. Default to "pending" if none specified or return all if status="all"
    if (status && status !== "all") {
      filter.status = status;
    } else if (!status) {
      // Default to pending requests awaiting review
      filter.status = "pending";
    }

    if (targetType) {
      filter.targetType = targetType;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [requests, totalRequests, pendingCount, approvedCount, rejectedCount] =
      await Promise.all([
        VerificationRequest.find(filter)
          .populate({
            path: "recruiterId",
            select: "name email phone designation department status isVerified companyId",
          })
          .populate({
            path: "userId",
            select: "name email role isVerified isActive",
          })
          .populate({
            path: "reviewedBy",
            select: "name email",
          })
          .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        VerificationRequest.countDocuments(filter),
        VerificationRequest.countDocuments({ status: "pending" }),
        VerificationRequest.countDocuments({ status: "approved" }),
        VerificationRequest.countDocuments({ status: "rejected" }),
      ]);

    return res.status(200).json({
      success: true,
      message: "Verification requests fetched successfully",
      data: {
        requests,
        stats: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          total: pendingCount + approvedCount + rejectedCount,
        },
        pagination: {
          totalRequests,
          currentPage: pageNum,
          totalPages: Math.ceil(totalRequests / limitNum) || 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error("Error in getVerificationRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch verification requests",
      error: error.message,
    });
  }
}

// Approve Verification Request
async function approveVerificationRequest(req, res) {
  try {
    const { id } = req.params;
    const { comments = "" } = req.body;
    const adminId = req.user?._id || req.user?.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification request ID format",
      });
    }

    const verificationReq = await VerificationRequest.findById(id);
    if (!verificationReq) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found",
      });
    }

    if (verificationReq.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "This verification request has already been approved",
      });
    }

    // 1. Update verification request status
    verificationReq.status = "approved";
    verificationReq.adminComments = comments;
    verificationReq.reviewedBy = adminId || null;
    verificationReq.reviewedAt = new Date();
    await verificationReq.save();

    // 2. Mark recruiter as verified & active
    if (verificationReq.recruiterId) {
      await Recruiter.findByIdAndUpdate(verificationReq.recruiterId, {
        $set: { isVerified: true, status: "active" },
      }).catch((err) => console.warn("Failed updating recruiter verification status:", err.message));
    }

    // 3. Mark user as verified if linked
    if (verificationReq.userId) {
      await User.findByIdAndUpdate(verificationReq.userId, {
        $set: { isVerified: true },
      }).catch((err) => console.warn("Failed updating user verification status:", err.message));
    }

    // 4. Send Notification
    try {
      await Notification.create({
        recruiterId: verificationReq.recruiterId || null,
        userId: verificationReq.userId || null,
        adminId: adminId || null,
        type: "verification_approved",
        title: "Verification Request Approved",
        message: "Your profile verification request has been approved by the admin. Your account is now fully verified.",
        referenceId: verificationReq._id,
        data: {
          requestId: verificationReq._id,
          targetType: verificationReq.targetType,
          approvedAt: verificationReq.reviewedAt,
        },
      });
    } 
    catch (notifErr) {
      console.warn("Notification creation failed:", notifErr.message);
    }

    // 5. Create Moderation Log
    try {
      if (adminId) {
        await ModerationLog.create({
          moderatorId: adminId,
          action: "APPROVE_JOB", // action enum fallback or general approve
          targetType: verificationReq.targetType || "Recruiter",
          targetId: verificationReq.recruiterId || verificationReq.userId || verificationReq._id,
          reason: "Verification request approved by admin",
          notes: comments || "Documents verified successfully",
        });
      }
    } catch (logErr) {
      console.warn("Moderation log creation failed:", logErr.message);
    }
    // Publish Kafka Event: RECRUITER_UPDATED / COMPANY_UPDATED
    try {
      const { publishEvent } = require("../service/kafka/Producer");
      if (verificationReq.recruiterId) {
        await publishEvent(
          "recruiter-events",
          {
            eventType: "RECRUITER_UPDATED",
            payload: {
              recruiterId: verificationReq.recruiterId,
              isVerified: true,
              status: "active",
            },
          },
          verificationReq.recruiterId
        );
      }
      if (verificationReq.companyId) {
        await publishEvent(
          "company-events",
          {
            eventType: "COMPANY_UPDATED",
            payload: {
              companyId: verificationReq.companyId,
              isVerified: true,
              verificationStatus: "verified",
            },
          },
          verificationReq.companyId
        );
      }
    } catch (kErr) {
      console.warn("Kafka verification approval event failed:", kErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Verification request approved successfully",
      data: {
        verificationRequest: verificationReq,
      },
    });
  } catch (error) {
    console.error("Error in approveVerificationRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve verification request",
      error: error.message,
    });
  }
}

// Reject Verification Request
async function rejectVerificationRequest(req, res) {
  try {
    const { id } = req.params;
    const { reason, comments = "" } = req.body;
    const adminId = req.user?._id || req.user?.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification request ID format",
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const verificationReq = await VerificationRequest.findById(id);
    if (!verificationReq) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found",
      });
    }

    // 1. Update verification request status
    verificationReq.status = "rejected";
    verificationReq.rejectionReason = reason.trim();
    verificationReq.adminComments = comments;
    verificationReq.reviewedBy = adminId || null;
    verificationReq.reviewedAt = new Date();
    await verificationReq.save();

    // 2. Mark recruiter verification as false
    if (verificationReq.recruiterId) {
      await Recruiter.findByIdAndUpdate(verificationReq.recruiterId, {
        $set: { isVerified: false },
      }).catch((err) => console.warn("Failed updating recruiter rejection status:", err.message));
    }

    // 3. Mark user as unverified if linked
    if (verificationReq.userId) {
      await User.findByIdAndUpdate(verificationReq.userId, {
        $set: { isVerified: false },
      }).catch((err) => console.warn("Failed updating user rejection status:", err.message));
    }

    // 4. Send Notification
    try {
      await Notification.create({
        recruiterId: verificationReq.recruiterId || null,
        userId: verificationReq.userId || null,
        adminId: adminId || null,
        type: "verification_rejected",
        title: "Verification Request Rejected",
        message: `Your verification request has been rejected. Reason: ${reason.trim()}`,
        referenceId: verificationReq._id,
        data: {
          requestId: verificationReq._id,
          rejectionReason: reason.trim(),
          reviewedAt: verificationReq.reviewedAt,
        },
      });
    } catch (notifErr) {
      console.warn("Notification creation failed:", notifErr.message);
    }

    // 5. Create Moderation Log
    try {
      if (adminId) {
        await ModerationLog.create({
          moderatorId: adminId,
          action: "FLAG_CONTENT",
          targetType: verificationReq.targetType || "Recruiter",
          targetId: verificationReq.recruiterId || verificationReq.userId || verificationReq._id,
          reason: `Verification rejected: ${reason.trim()}`,
          notes: comments || "",
        });
      }
    } catch (logErr) {
      console.warn("Moderation log creation failed:", logErr.message);
    }
    // Publish Kafka Event: RECRUITER_UPDATED (unverified/rejected)
    try {
      const { publishEvent } = require("../service/kafka/Producer");
      if (verificationReq.recruiterId) {
        await publishEvent(
          "recruiter-events",
          {
            eventType: "RECRUITER_UPDATED",
            payload: {
              recruiterId: verificationReq.recruiterId,
              isVerified: false,
              rejectionReason: reason.trim(),
            },
          },
          verificationReq.recruiterId
        );
      }
    } catch (kErr) {
      console.warn("Kafka verification rejection event failed:", kErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Verification request rejected successfully",
      data: {
        verificationRequest: verificationReq,
      },
    });
  }
   catch (error) {
    console.error("Error in rejectVerificationRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject verification request",
      error: error.message,
    });
  }
  }



module.exports = {
  getVerificationRequest,
  approveVerificationRequest,
  rejectVerificationRequest,
};
