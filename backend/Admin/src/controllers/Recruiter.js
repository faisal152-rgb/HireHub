const Recruiter = require("../models/Recruiter");
const mongoose = require("mongoose");

// Get Recruiter Stats
async function getRecruiterStats(req, res) {
  try {
    const companyId = req.params.companyId || req.query.companyId;
    const filter = {};

    if (companyId) {
      if (!mongoose.isValidObjectId(companyId)) {
        return res.status(400).json({ success: false, error: "Invalid company ID" });
      }
      filter.companyId = companyId;
    }

    const [totalRecruiters, activeRecruiters, inactiveRecruiters, pendingRecruiters, verifiedRecruiters] =
      await Promise.all([
        Recruiter.countDocuments(filter),
        Recruiter.countDocuments({ ...filter, status: "active" }),
        Recruiter.countDocuments({ ...filter, status: "inactive" }),
        Recruiter.countDocuments({ ...filter, status: "pending" }),
        Recruiter.countDocuments({ ...filter, isVerified: true }),
      ]);

    res.status(200).json({
      success: true,
      message: "Recruiter stats retrieved successfully",
      data: {
        totalRecruiters,
        activeRecruiters,
        inactiveRecruiters,
        pendingRecruiters,
        verifiedRecruiters,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve recruiter stats",
      error: error.message,
    });
  }
}

// Get All Recruiters
async function getAllRecruiters(req, res) {
  try {
    const companyId = req.params.companyId || req.query.companyId;
    const { status, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    if (companyId) {
      if (!mongoose.isValidObjectId(companyId)) {
        return res.status(400).json({ success: false, error: "Invalid company ID" });
      }
      filter.companyId = companyId;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: searchRegex }, { email: searchRegex }, { department: searchRegex }];
    }

    const [recruiters, totalRecruiters] = await Promise.all([
      Recruiter.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "companyId",
          select: "name email logo website location",
        })
        .lean(),
      Recruiter.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Recruiters retrieved successfully",
      data: {
        recruiters,
        pagination: {
          totalRecruiters,
          currentPage: page,
          totalPages: Math.ceil(totalRecruiters / limit) || 1,
          limit,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve recruiters",
      error: error.message,
    });
  }
}

// Update Recruiter Status
async function updateRecruiterStatus(req, res) {
  try {
    const recruiterId = req.params.recruiterId || req.params.recruitersId;
    const { status, isVerified } = req.body;

    if (!recruiterId || !mongoose.isValidObjectId(recruiterId)) {
      return res.status(400).json({ success: false, error: "Valid Recruiter ID is required" });
    }

    const updateFields = {};
    if (status !== undefined) updateFields.status = status;
    if (isVerified !== undefined) updateFields.isVerified = isVerified;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, error: "Status or isVerified is required" });
    }

    const updatedRecruiter = await Recruiter.findByIdAndUpdate(
      recruiterId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedRecruiter) {
      return res.status(404).json({ success: false, error: "Recruiter not found" });
    }

    // Publish Kafka Event: RECRUITER_UPDATED
    try {
      const { publishEvent } = require("../service/kafka/Producer");
      await publishEvent(
        "recruiter-events",
        {
          eventType: "RECRUITER_UPDATED",
          payload: {
            recruiterId: updatedRecruiter._id,
            companyId: updatedRecruiter.companyId,
            name: updatedRecruiter.name,
            email: updatedRecruiter.email,
            status: updatedRecruiter.status,
            isVerified: updatedRecruiter.isVerified,
          },
        },
        updatedRecruiter._id
      );
    } catch (kErr) {
      console.warn("Kafka recruiter update event failed:", kErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Recruiter status updated successfully",
      data: {
        updatedRecruiter,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update recruiter status",
      error: error.message,
    });
  }
}

module.exports = {
  getRecruiterStats,
  getAllRecruiters,
  updateRecruiterStatus,
};
