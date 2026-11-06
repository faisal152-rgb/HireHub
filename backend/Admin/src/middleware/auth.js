const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Session = require("../models/auth/session");

async function adminAuth(req, res, next) {
  try {
    const token =
      req.cookies?.token ||
      req.cookies?.refreshToken ||
      req.cookies?.accessToken ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "No Token Provided" });
    }

    const verified = jwt.verify(
      token,
      process.env.JWT_SECRET || "hirehub_secret"
    );

    if (!verified) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const userId = verified.id || verified._id || verified.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Access denied: Admins only" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Admin Auth Error:", error.message);
    return res.status(401).json({ success: false, message: "Unauthorized or invalid session" });
  }
}

module.exports = { adminAuth };
