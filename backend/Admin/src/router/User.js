const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getUserStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
} = require("../controllers/User");

const router = express.Router();

// Total users count with status breakdown (active, inactive, verified, unverified, by role)
router.get("/stats", authMiddleware, getUserStats);

// Get all users with status & role filtering (paginated)
router.get("/", authMiddleware, getAllUsers);

// Get single user by ID
router.get("/:userId", authMiddleware, getUserById);

// Update user status (isActive, isVerified, role)
router.patch("/:userId/status", authMiddleware, updateUserStatus);

// General update user route
router.patch("/:userId", authMiddleware, updateUserStatus);

module.exports = router;