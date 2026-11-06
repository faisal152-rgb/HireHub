const mongoose = require("mongoose");
const User = require("../models/User");



// Get user stats
async function getUserStats(req, res) {
    try {
        // Safe check for admin role
        if (req.user && req.user.role && req.user.role !== "admin" && req.user.role !== "superadmin") {
            return res.status(403).json({ success: false, message: "Unauthorized: Admin access required" });
        }

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Promise.all returns an array, so destructure as array []
        const [
            totalCount,
            totalVerified,
            totalUnverified,
            totalActive,
            totalInactive,
            totalBlocked,
            totalCandidates,
            totalRecruiters,
            totalAdmins,
            newUsersToday,
            newUsersThisMonth,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isVerified: true }),
            User.countDocuments({ isVerified: false }),
            User.countDocuments({ isActive: true }),
            User.countDocuments({ isActive: false }),
            User.countDocuments({ $or: [{ isActive: false }, { isBanned: true }] }),
            User.countDocuments({ role: "candidate" }),
            User.countDocuments({ role: "recruiter" }),
            User.countDocuments({ role: { $in: ["admin", "superadmin"] } }),
            User.countDocuments({ createdAt: { $gte: startOfToday } }),
            User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        ]);

        const totalUnblocked = totalActive;
        const divisor = totalCount > 0 ? totalCount : 1;

        const verificationRate = Number(((totalVerified / divisor) * 100).toFixed(2));
        const activeRate = Number(((totalActive / divisor) * 100).toFixed(2));
        const bannedRate = Number(((totalBlocked / divisor) * 100).toFixed(2));

        res.status(200).json({ 
            success: true,
            message: "User stats fetched successfully",
            data: {
                totalCount,
                totalVerified,
                totalUnverified,
                totalActive,
                totalInactive,
                totalBlocked,
                totalUnblocked,
                verificationRate,
                activeRate,
                bannedRate,
                byRole: {
                    candidate: totalCandidates,
                    recruiter: totalRecruiters,
                    admin: totalAdmins,
                },
                recent: {
                    today: newUsersToday,
                    thisMonth: newUsersThisMonth,
                },
            } 
        });
    } catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch user stats",
            error: error.message 
        });
    }
}


// Get all users with status & role filtering (paginated)
async function getAllUsers(req, res) {
    try {
        const {
            page = 1,
            limit = 10,
            role,
            isActive,
            isVerified,
            search,
            sortBy = "createdAt",
            sortOrder = "desc",
            userId,
        } = req.query;

        // If requested for a specific user via query or params
        const targetUserId = req.params?.userId || userId;
        if (targetUserId) {
            if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
                return res.status(400).json({ success: false, message: "Invalid User ID format" });
            }
            const user = await User.findById(targetUserId).select("-password");
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
            return res.status(200).json({
                success: true,
                message: "User fetched successfully",
                data: { user },
            });
        }

        const filter = {};

        if (role) {
            filter.role = role;
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === "true" || isActive === true;
        }

        if (isVerified !== undefined) {
            filter.isVerified = isVerified === "true" || isVerified === true;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
        const skip = (pageNum - 1) * limitNum;

        const [users, totalUsers] = await Promise.all([
            User.find(filter)
                .select("-password")
                .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            User.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: {
                users,
                pagination: {
                    totalUsers,
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalUsers / limitNum) || 1,
                    limit: limitNum,
                },
            },
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch users",
            error: error.message,
        });
    }
}


// Get single user by ID
async function getUserById(req, res) {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid User ID format" });
        }

        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            message: "User fetched successfully",
            data: { user },
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user",
            error: error.message,
        });
    }
}

// updateUserStatus (update user status, isVerified, role, or profile fields)
async function updateUserStatus(req, res) {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid User ID format" });
        }

        const { status, isActive, isVerified, role, name, email } = req.body;

        const updateFields = {};

        // Handle status or isActive boolean/string
        if (status !== undefined) {
            if (typeof status === "boolean") {
                updateFields.isActive = status;
            } else if (status === "active" || status === "true") {
                updateFields.isActive = true;
            } else if (status === "inactive" || status === "blocked" || status === "false") {
                updateFields.isActive = false;
            }
        }

        if (isActive !== undefined) {
            updateFields.isActive = isActive === true || isActive === "true";
        }

        if (isVerified !== undefined) {
            updateFields.isVerified = isVerified === true || isVerified === "true";
        }

        if (role !== undefined) {
            const validRoles = ["candidate", "recruiter", "admin"];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid role. Allowed roles are: ${validRoles.join(", ")}`,
                });
            }
            updateFields.role = role;
        }

        if (name !== undefined) updateFields.name = name;
        if (email !== undefined) updateFields.email = email;

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one valid field (status, isActive, isVerified, role, name, email) is required",
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Publish Kafka Event: CANDIDATE_UPDATED or RECRUITER_UPDATED
        try {
          const { publishEvent } = require("../service/kafka/Producer");
          if (updatedUser.role === "candidate" || !updatedUser.role) {
            await publishEvent(
              "candidate-events",
              {
                eventType: "CANDIDATE_UPDATED",
                payload: {
                  userId: updatedUser._id,
                  candidateId: updatedUser._id,
                  name: updatedUser.name,
                  email: updatedUser.email,
                  role: updatedUser.role,
                  isActive: updatedUser.isActive,
                  isVerified: updatedUser.isVerified,
                },
              },
              updatedUser._id
            );
          } else if (updatedUser.role === "recruiter") {
            await publishEvent(
              "recruiter-events",
              {
                eventType: "RECRUITER_UPDATED",
                payload: {
                  userId: updatedUser._id,
                  name: updatedUser.name,
                  email: updatedUser.email,
                  isActive: updatedUser.isActive,
                  isVerified: updatedUser.isVerified,
                },
              },
              updatedUser._id
            );
          }
        } catch (kErr) {
          console.warn("Kafka user status update event failed:", kErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "User status updated successfully",
            data: { updatedUser },
        });
    } catch (error) {
        console.error("Error updating user status:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update user status",
            error: error.message,
        });
    }
}

module.exports = {
  getUserStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
};
