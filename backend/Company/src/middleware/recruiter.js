const jwt = require("jsonwebtoken");
const Recruiter = require("../models/Recruiter");
const SessionModel = require("../models/auth/session");
const crypto = require("crypto");

const recruiterAuth = async (req, res, next) => {
  try {
    // Only accept short-lived access tokens — never a refreshToken
    const token =
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : req.headers.authorization) ||
      req.cookies?.accessToken ||
      req.headers["x-recruiter-token"];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No recruiter token provided",
      });
    }

    const jwtSecret = process.env.JWT_SECRET || "hirehub_secret";
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Recruiter token has expired",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid recruiter token",
      });
    }

    const recruiterId = decoded.recruiterId || decoded.id || decoded._id;
    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid recruiter token payload",
      });
    }

    // Strictly find Recruiter entity (does not accept Company)
    const recruiter = await Recruiter.findById(recruiterId).populate("companyId");

    if (!recruiter) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Recruiter not found. Company tokens are not allowed for recruiter access.",
      });
    }

    if (recruiter.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Your company access has been revoked. Contact the company administrator.",
      });
    }

    // Attach recruiter & company info to request
    req.recruiter = recruiter;
    req.user = recruiter;
    req.company = recruiter.companyId;

    next();
  } catch (error) {
    console.error("Recruiter auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during recruiter authentication",
      error: error.message,
    });
  }
};

module.exports = recruiterAuth;
module.exports.recruiterAuth = recruiterAuth;
