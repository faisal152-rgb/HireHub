const express = require("express");
const { candidateAuth } = require("../middleware/auth");
const {
  register,
  login,
  logout,
  logoutAll,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  getCurrentUser,
} = require("../controllers/auth");

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

// Get current user (Protected)
router.get("/me", candidateAuth, getCurrentUser);

// Logout from all devices (Protected)
router.post("/logout-all", candidateAuth, logoutAll);

module.exports = router;
