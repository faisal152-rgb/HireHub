const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const session = require("../models/auth/session");
const otpModel = require("../models/auth/otp");
const sendEmail = require("../service/sendemail");
const { generateOtp, getOtpHtml } = require("../utils/generateotp");

const JWT_SECRET = process.env.JWT_SECRET || "hirehub_secret";

// Helper function to send OTP email
async function sendOTPEmail(email, userId = null) {
  const otp = generateOtp();
  const html = getOtpHtml(otp);
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

  await otpModel.deleteOne({ email });
  await otpModel.create({
    email,
    otp,
    user: userId,
    otpHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  });

  await sendEmail(
    email,
    `OTP Verification: ${otp}`,
    `Your HireHub OTP verification code is ${otp}. It will expire in 10 minutes.`,
    html
  );

  return otp;
}

// 1. Register Admin
async function register(req, res) {
  try {
    const { name, email, password, role = "admin" } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    const existUser = await User.findOne({ email });
    if (existUser) {
      return res.status(400).json({ success: false, message: "User already exists with this email" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role === "superadmin" ? "superadmin" : "admin",
      isVerified: false,
      isActive: true,
    });

    try {
      await sendOTPEmail(user.email, user._id);
    } catch (emailErr) {
      console.warn("Failed sending registration OTP email:", emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully. OTP sent for verification.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Error in register:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

// 2. Login Admin
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account is inactive or blocked. Contact administrator." });
    }

    if (!user.isVerified) {
      try {
        await sendOTPEmail(user.email, user._id);
      } catch (eErr) {
        console.warn("OTP send warning:", eErr.message);
      }
      return res.status(403).json({
        success: false,
        message: "Email is not verified. A new verification OTP has been sent to your email.",
        requireOtp: true,
        email: user.email,
      });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    await session.create({
      userId: user._id,
      accessToken,
      refreshToken: refreshTokenHash,
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.header("user-agent") || "",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "active",
    });

    user.lastLogin = new Date();
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

// 3. Logout Admin
async function logout(req, res) {
  try {
    const token =
      req.cookies?.refreshToken ||
      req.cookies?.token ||
      req.headers.authorization?.split(" ")[1];

    if (token) {
      const refreshTokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await session.updateMany(
        { $or: [{ refreshToken: refreshTokenHash }, { accessToken: token }] },
        { $set: { status: "revoked" } }
      );
    }

    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.clearCookie("token");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error in logout:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

// 4. Logout from all sessions
async function logoutAll(req, res) {
  try {
    const userId = req.user?._id || req.user?.id || req.params.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    await session.updateMany({ userId }, { $set: { status: "revoked" } });

    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.clearCookie("token");

    return res.status(200).json({
      success: true,
      message: "Logged out from all devices successfully",
    });
  } catch (error) {
    console.error("Error in logoutAll:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

// 5. Verify OTP
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const otpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    const otpData = await otpModel.findOne({
      email,
      $or: [{ otp: String(otp) }, { otpHash }],
      expiresAt: { $gt: new Date() },
    });

    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    user.isVerified = true;
    await user.save();
    await otpModel.deleteMany({ email });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

// 6. Resend OTP
async function resendOtp(req, res) {
  try {
    const { email, type } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isVerified && type !== "forgot-password" && type !== "reset-password") {
      return res.status(400).json({ success: false, message: "User is already verified" });
    }

    await sendOTPEmail(user.email, user._id);

    return res.status(200).json({
      success: true,
      message: "New OTP sent to email successfully",
    });
  } catch (error) {
    console.error("Error in resendOtp:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

// 7. Forgot Password
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await sendOTPEmail(user.email, user._id);

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email",
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

// 8. Reset Password
async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const otpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    const otpData = await otpModel.findOne({
      email,
      $or: [{ otp: String(otp) }, { otpHash }],
      expiresAt: { $gt: new Date() },
    });

    if (!otpData) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.password = newPassword;
    await user.save();
    await otpModel.deleteMany({ email });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

// 9. Get Current User
async function getCurrentUser(req, res) {
  try {
    const userId = req.user?._id || req.user?.id || req.params.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const user = await User.findById(userId).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Current user fetched successfully",
      user,
    });
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

module.exports = {
  register,
  login,
  logout,
  logoutAll,
  logoutall: logoutAll,
  verifyOtp,
  resendOtp,
  Resendotp: resendOtp,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  getme: getCurrentUser,
};