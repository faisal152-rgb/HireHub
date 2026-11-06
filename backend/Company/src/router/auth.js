const express = require("express");
const {
  register,
  login,
  logout,
  logoutAll,
  refreshToken,
  verifyOtp,
  resendOtp,
  getCurrentUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth");
const { companyAuth } = require("../middleware/auth");

const router = express.Router();

// Register Company
router.post("/signup", register);

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

// Get current user / company
router.get("/me", companyAuth, getCurrentUser);

// Logout from all devices
router.post("/logout-all", companyAuth, logoutAll);

router.post("/refresh-token", refreshToken);

module.exports = router;
