const express = require("express");
const { register } = require("../controllers/auth/auth");

const router = express.Router();

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Logout
router.post("/logout", logout);

// Verify OTP
router.post("/verify-otp", verifyOtp);

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
