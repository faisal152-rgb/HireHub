const auth = require("../models/auth/Company");
const SessionModel = require("../models/auth/session");
const OtpModel = require("../models/auth/otp");
const Recruiter = require("../models/Recruiter");
const emailQueue = require("../queues/emailQueue")
const { publishEvent } = require("../service/kafka/Producer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { generateOtp, getOtpHtml } = require("../utils/generateotp");


const sendotptocompany = async (normalizedEmail, company) => {
    const recipientEmail = normalizedEmail || company?.email;
    const otpCode = generateOtp();
    const html = getOtpHtml(otpCode);
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");

    await OtpModel.deleteMany({ email: recipientEmail });
    await OtpModel.create({
      email: recipientEmail,
      companyId: company._id,
      otp: otpCode,
      otpHash,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    console.log(`[sendotptocompany] Sending OTP ${otpCode} to ${recipientEmail}`);
    try {
      const job = await emailQueue.add("company-otp", {
        type: "generic",
        to: recipientEmail,
        subject: "HireHub - OTP Verification Code",
        text: `Your OTP is ${otpCode}`,
        html,
      });
      console.log(`[sendotptocompany] OTP Email queued for ${recipientEmail}, jobId: ${job.id}`);
      return job;
    } catch (emailErr) {
      console.error(`[sendotptocompany] Email sending failed to ${recipientEmail}:`, emailErr.message);
      console.log(`\n========================================\n[DEV OTP] OTP for ${recipientEmail}: ${otpCode}\n========================================\n`);
      throw emailErr;
    }
};


// 1. Register Company
async function register(req, res) {
  try {
    const { name, email, phone, password, role } = req.body;
    const resolvedIndustry = req.body.industry || req.body.companyType || "Technology";
    const resolvedCompanySize = req.body.companySize || req.body.size || "1-50";

    if (!name || !email || !phone || !resolvedIndustry || !resolvedCompanySize || !password) {
      return res.status(400).json({ message: "Name, email, phone, industry/companyType, companySize, and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existCompany = await auth.findOne({ 
      $or: [
        { email: normalizedEmail },
        { phone: phone }
      ] 
    });
    if (existCompany) {
      return res.status(400).json({ message: "Company already exists with this email or phone" });
    }

    const company = await auth.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone,
      industry: resolvedIndustry,
      companySize: resolvedCompanySize,
      password: password,
      role: role || "Company",
      isVerified: false,
      isActive: true,
    });

    // send otp to the company email (non-blocking for registration flow)
    try {
      await sendotptocompany(normalizedEmail, company);
    } catch (otpErr) {
      console.warn("Failed to send OTP email:", otpErr.message);
    }

    // ── Publish COMPANY_REGISTERED event to Kafka ──────────────────────────
    try {
      await publishEvent(
        "company-events",
        {
          eventType: "COMPANY_REGISTERED",
          payload: {
            companyId: company._id,
            name: company.name,
            email: company.email,
            phone: company.phone,
            industry: company.industry,
            companySize: company.companySize,
            role: company.role,
            inviteCode: company.inviteCode,
            isVerified: company.isVerified,
            isActive: company.isActive,
            registeredAt: company.createdAt,
          },
        },
        company._id
      );
    } catch (kafkaErr) {
      console.warn("Kafka event publish skipped (COMPANY_REGISTERED):", kafkaErr.message);
    }

    return res.status(201).json({
      message: "Company registration successfully completed, company will get verified soon",
      status: "Success",
      company: {
        _id: company._id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        industry: company.industry,
        companySize: company.companySize,
        role: company.role,
        inviteCode: company.inviteCode,
        isVerified: company.isVerified,
        isActive: company.isActive,
      },
    });
  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2. Login Company or Recruiter
async function login(req, res) {
  try {
    const { email,phone, password } = req.body;
    if ((!email && !phone) || !password) {
      return res.status(400).json({ message: "Email or Phone and password are required" });
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
    const company = await auth.findOne({
       $or: [
         { email: normalizedEmail },
         { phone: phone }
       ] 
    });
    if (!company) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordMatch = await company.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!company.isVerified) {
      try {
        await sendotptocompany(company.email, company);
      } catch (err) {
        console.warn("Failed to send OTP during login:", err.message);
      }
      return res.status(400).json({ message: "Company not verified. OTP sent to your email." });
    }

    const jwtSecret = process.env.JWT_SECRET || "hirehub_secret";
    const companyRole = (company.role || "company").toLowerCase();

    const accessToken = jwt.sign(
      { id: company._id, role: companyRole },
      jwtSecret,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: company._id, role: companyRole },
      jwtSecret,
      { expiresIn: "7d" }
    );
    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await SessionModel.create({
      companyId: company._id,
      accessToken,
      refreshToken: refreshTokenHash,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.header("user-agent"),
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      company: {
        _id: company._id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        role: company.role,
        inviteCode: company.inviteCode,
        isVerified: company.isVerified,
        recruitersCount: company.recruiters ? company.recruiters.length : 0,
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
    const token =
      req.cookies?.refreshToken || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const session = await SessionModel.findOne({ refreshTokenHash, revoked: false });

    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    session.revoked = true;
    session.status = "revoked";
    await session.save();
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
    const userId = req.user?._id;
    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    await SessionModel.updateMany(
      { companyId: userId },
      { revoked: true, status: "revoked" }
    );
    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Logged out from all sessions successfully" });
  } catch (error) {
    console.error("Logout all error:", error.message);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 4. Refresh Token
async function refreshToken(req, res) {
  // Cookie name must match what login sets ("refreshToken")
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({
      message: "Unauthorized: No refresh token",
      status: "Failed"
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "hirehub_secret");
  } catch (err) {
    return res.status(401).json({
      message: "Refresh token invalid or expired",
      status: "Failed"
    });
  }

  const userId = decoded.id || decoded._id;
  if (!userId || !mongoose.isValidObjectId(userId)) {
    return res.status(401).json({
      message: "Refresh token has an invalid user ID",
      status: "Failed"
    });
  }

  try {
    const refreshTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const session = await SessionModel.findOne({
      refreshTokenHash,
      revoked: false,
      status: "active",
      companyId: { $exists: true, $ne: null },
    });
    if (!session) {
      return res.status(401).json({
        message: "Session not found or revoked",
        status: "Failed"
      });
    }

    // Revoke the old session
    session.revoked = true;
    session.status = "revoked";
    await session.save();

    // Issue new tokens
    const jwtSecret = process.env.JWT_SECRET || "hirehub_secret";
    const userRole = (decoded.role || "company").toLowerCase();
    const newAccessToken = jwt.sign(
      { id: decoded.id, role: userRole },
      jwtSecret,
      { expiresIn: "15m" }
    );
    const newRefreshToken = jwt.sign(
      { id: decoded.id, role: userRole },
      jwtSecret,
      { expiresIn: "7d" }
    );
    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

    // Create a new session for the rotated tokens
    await SessionModel.create({
      companyId: session.companyId,
      recruiterId: session.recruiterId,
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenHash,
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.header("user-agent"),
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      token: newAccessToken, // alias for frontend compatibility
    });
  } catch (error) {
    console.error("Refresh token error:", error.message);
    return res.status(500).json({ message: error.message, status: "Failed" });
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
    const company = await auth.findOne({ email: normalizedEmail });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
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

    company.isVerified = true;
    await company.save();
    await OtpModel.deleteMany({ email: normalizedEmail });

    // ── Publish COMPANY_VERIFIED event to Kafka ────────────────────────────
    try {
      await publishEvent(
        "company-events",
        {
          eventType: "COMPANY_VERIFIED",
          payload: {
            companyId: company._id,
            name: company.name,
            email: company.email,
            phone: company.phone,
            industry: company.industry,
            companySize: company.companySize,
            role: company.role,
            inviteCode: company.inviteCode,
            isVerified: true,
            isActive: company.isActive,
            verifiedAt: new Date(),
          },
        },
        company._id
      );
    } catch (kafkaErr) {
      console.warn("Kafka event publish skipped (COMPANY_VERIFIED):", kafkaErr.message);
    }

    return res.status(200).json({
      message: "OTP verified successfully. Company account is now active.",
      company: {
        id: company._id,
        name: company.name,
        email: company.email,
        isVerified: company.isVerified,
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
    const company = await auth.findOne({ email: normalizedEmail });
    if (!company) {
      return res.status(404).json({ message: "No company account found with this email" });
    }

    if (company.isVerified && type !== "forgot-password" && type !== "reset-password") {
      return res.status(400).json({ message: "Company is already verified. Please sign in or reset password." });
    }

    await sendotptocompany(normalizedEmail, company);

    return res.status(200).json({
      message: "OTP resent successfully to your email",
    });
  } catch (error) {
    console.error("Resend OTP error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to resend OTP" });
  }
}

// 7. Get Current User / Company
async function getCurrentUser(req, res) {
  try {
    const user = req.user?.toObject ? req.user.toObject() : { ...req.user };
    delete user.password;

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// 8. Forgot Password
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const company = await auth.findOne({ email: normalizedEmail });
    if (!company) {
      console.warn(`[forgotPassword] Company not found for ${normalizedEmail}`);
      return res.status(404).json({ message: "No registered company found with this email address." });
    }

    await sendotptocompany(normalizedEmail, company);
    console.log(`[forgotPassword] Password reset OTP sent to ${normalizedEmail}`);

    return res.status(200).json({ message: "Password reset OTP sent to your company email." });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to send reset OTP" });
  }
}

// 9. Reset Password
async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const company = await auth.findOne({ email: normalizedEmail });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
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

    company.password = newPassword;
    await company.save();
    await OtpModel.deleteMany({ email: normalizedEmail });

    // Revoke all sessions on password reset
    await SessionModel.updateMany({ companyId: company._id }, { status: "revoked" });

    return res.status(200).json({ message: "Password reset successfully. Please login again." });
  } catch (error) {
    console.error("Reset password error:", error.message);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

module.exports = {
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
};
