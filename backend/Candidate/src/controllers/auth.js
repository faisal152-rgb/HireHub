const CandidateAuth = require("../models/auth/auth");
const SessionModel = require("../models/auth/session");
const OtpModel = require("../models/auth/otp");
const { publishEvent } = require("../service/kafka/Producer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { generateOtp, getOtpHtml } = require("../utils/generateotp");
const sendEmail = require("../service/sendemail");

// ─── Helper: Send OTP Email ───────────────────────────────────────────────────
const sendOtpToCandidate = async (normalizedEmail, candidate) => {
  const otpCode = generateOtp();
  const html = getOtpHtml(otpCode);
  const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");

  await OtpModel.deleteMany({ email: normalizedEmail });
  await OtpModel.create({
    email: normalizedEmail,
    otp: otpCode,
    otpHash,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });

  try {
    await sendEmail(
      candidate.email,
      `OTP Verification - ${otpCode}`,
      `Your OTP is ${otpCode}`,
      html
    );
  } catch (emailErr) {
    console.warn("Email sending warning (local dev):", emailErr.message);
  }
};

// 1. Register Candidate
async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existCandidate = await CandidateAuth.findOne({ email: normalizedEmail });
    if (existCandidate) {
      return res.status(400).json({ message: "Candidate already exists with this email" });
    }

    const candidate = await CandidateAuth.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role || "candidate",
      isVerified: false,
      isActive: true,
    });

    // Send OTP for email verification
    sendOtpToCandidate(normalizedEmail, candidate);

    // ── Publish CANDIDATE_REGISTERED event to Kafka ──────────────────────────
    try {
      await publishEvent(
        "candidate-events",
        {
          eventType: "CANDIDATE_REGISTERED",
          payload: {
            candidateId: candidate._id,
            name: candidate.name,
            email: candidate.email,
            role: candidate.role,
            isVerified: candidate.isVerified,
            isActive: candidate.isActive,
            registeredAt: candidate.createdAt,
          },
        },
        candidate._id
      );
    } catch (kafkaErr) {
      console.warn("Kafka event publish skipped (CANDIDATE_REGISTERED):", kafkaErr.message);
    }

    return res.status(201).json({
      message: "Registration successful. OTP sent to your email for verification.",
      status: "Success",
      candidate: {
        _id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
        isVerified: candidate.isVerified,
        isActive: candidate.isActive,
      },
    });
  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2. Login Candidate
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email && !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
    const candidate = await CandidateAuth.findOne({
      $or: [
        { email: normalizedEmail },
        { phone: phone }
      ] 
    });
    if (!candidate) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordMatch = await candidate.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!candidate.isActive) {
      return res.status(403).json({ message: "Your account has been blocked. Contact support." });
    }

    if (!candidate.isVerified) {
      // Resend OTP if not verified
      sendOtpToCandidate(normalizedEmail, candidate);
      return res.status(400).json({
        message: "Account not verified. OTP sent to your email.",
        requiresVerification: true,
      });
    }

    const jwtSecret = process.env.JWT_SECRET || "hirehub_candidate_secret";

    const accessToken = jwt.sign(
      { id: candidate._id, role: candidate.role },
      jwtSecret,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: candidate._id, role: candidate.role },
      jwtSecret,
      { expiresIn: "7d" }
    );

    await SessionModel.create({
      candidateId: candidate._id,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.header("user-agent"),
      status: "active",
    });

    // Update lastLogin
    candidate.lastLogin = new Date();
    await candidate.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      candidate: {
        _id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
        isVerified: candidate.isVerified,
        isActive: candidate.isActive,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 3. Logout
async function logout(req, res) {
  try {
    const token = req.cookies?.refreshToken || req.headers.authorization?.split(" ")[1];
    if (token) {
      await SessionModel.findOneAndUpdate(
        { refreshToken: token },
        { status: "revoked" }
      );
    }

    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error.message);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 4. Logout All Devices
async function logoutAll(req, res) {
  try {
    const candidateId = req.user?._id;
    if (!candidateId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    await SessionModel.updateMany(
      { candidateId },
      { status: "revoked" }
    );

    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Logged out from all sessions successfully" });
  } catch (error) {
    console.error("Logout all error:", error.message);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 5. Verify OTP
async function verifyOtp(req, res) {
  try {
    const { email, otp, type } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const candidate = await CandidateAuth.findOne({ email: normalizedEmail });
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const otpHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    const otpData = await OtpModel.findOne({
      email: normalizedEmail,
      $or: [{ otp: otp.trim() }, { otpHash }],
      expiresAt: { $gt: Date.now() },
    });

    if (!otpData) {
      return res.status(400).json({
        message: "OTP is invalid or has expired",
        status: "Failed",
      });
    }

    if (type === "forgot-password" || type === "reset-password") {
      return res.status(200).json({
        message: "OTP verified successfully. Please set your new password.",
        valid: true,
      });
    }

    candidate.isVerified = true;
    await candidate.save();
    await OtpModel.deleteMany({ email: normalizedEmail });

    // ── Publish CANDIDATE_VERIFIED event to Kafka ────────────────────────────
    try {
      await publishEvent(
        "candidate-events",
        {
          eventType: "CANDIDATE_VERIFIED",
          payload: {
            candidateId: candidate._id,
            name: candidate.name,
            email: candidate.email,
            role: candidate.role,
            isVerified: true,
            isActive: candidate.isActive,
            verifiedAt: new Date(),
          },
        },
        candidate._id
      );
    } catch (kafkaErr) {
      console.warn("Kafka event publish skipped (CANDIDATE_VERIFIED):", kafkaErr.message);
    }

    return res.status(200).json({
      message: "OTP verified successfully. Account is now active.",
      candidate: {
        _id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        isVerified: candidate.isVerified,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error.message);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 6. Resend OTP
async function resendOtp(req, res) {
  try {
    const { email, type } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const candidate = await CandidateAuth.findOne({ email: normalizedEmail });
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (candidate.isVerified && type !== "forgot-password" && type !== "reset-password") {
      return res.status(400).json({ message: "Candidate is already verified" });
    }

    sendOtpToCandidate(normalizedEmail, candidate);

    return res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend OTP error:", error.message);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 7. Forgot Password
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const candidate = await CandidateAuth.findOne({ email: normalizedEmail });
    if (!candidate) {
      // For security: don't reveal if email exists
      return res.status(200).json({ message: "If this email exists, a password reset OTP has been sent." });
    }

    sendOtpToCandidate(normalizedEmail, candidate);

    return res.status(200).json({ message: "Password reset OTP sent to your email." });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 8. Reset Password
async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const candidate = await CandidateAuth.findOne({ email: normalizedEmail });
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const otpHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    const otpData = await OtpModel.findOne({
      email: normalizedEmail,
      $or: [{ otp: otp.trim() }, { otpHash }],
      expiresAt: { $gt: Date.now() },
    });

    if (!otpData) {
      return res.status(400).json({ message: "OTP is invalid or has expired" });
    }

    candidate.password = newPassword;
    await candidate.save();
    await OtpModel.deleteMany({ email: normalizedEmail });

    // Revoke all sessions on password reset
    await SessionModel.updateMany({ candidateId: candidate._id }, { status: "revoked" });

    return res.status(200).json({ message: "Password reset successfully. Please login again." });
  } catch (error) {
    console.error("Reset password error:", error.message);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 9. Get Current User
async function getCurrentUser(req, res) {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error("Get current user error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  register,
  login,
  logout,
  logoutAll,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};