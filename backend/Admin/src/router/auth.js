const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { register, login, logout, verifyOtp, resendOtp, forgotPassword, resetPassword, getCurrentUser, logoutAll } = require("../controllers/auth");
const router = express.Router();

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Logout
router.post("/logout", authMiddleware, logout);

// Verify OTP
router.post("/verify-otp", authMiddleware, verifyOtp);

// Resend OTP
router.post("/resend-otp", resendOtp);

// Forgot Password
router.post("/forgot-password", forgotPassword);

// Reset Password
router.post("/reset-password", resetPassword);

// Get current user
router.get("/me", authMiddleware, getCurrentUser);

// Logout from all devices
router.post("/logout-all", authMiddleware, logoutAll);

module.exports = router;
