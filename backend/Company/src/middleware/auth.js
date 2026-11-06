const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Company = require("../models/auth/Company");
const SessionModel = require("../models/auth/session");
const Recruiter = require("../models/Recruiter");

async function companyAuth(req, res, next) {
  try {
    // Only accept short-lived access tokens — never a refreshToken
    const token =
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : req.headers.authorization) ||
      req.cookies?.accessToken ||
      req.headers["x-access-token"];

    if (!token) {
      return res.status(401).json({ message: "No Token Provided" });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET || "hirehub_secret");
    if (!verified) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const userId = verified.id || verified._id || verified.companyId;

    // Use the token role to avoid resolving a recruiter session as a company
    // session (or vice versa), especially when both cookies exist.
    
    const company = await Company.findById(userId);

    if (!company) {
      return res.status(404).json({ message: "User account not found" });
    }
    req.user = company;
    req.company = company;
    req.companyId = company._id;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Unauthorized or invalid session", error: error.message });
  }
}

async function companyOrRecruiterAuth(req, res, next) {
  try {
    const token =
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : req.headers.authorization) ||
      req.cookies?.accessToken ||
      req.headers["x-access-token"] ||
      req.headers["x-recruiter-token"];

    if (!token) {
      return res.status(401).json({ message: "No Token Provided" });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET || "hirehub_secret");
    if (!verified) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const userId = verified.id || verified._id || verified.recruiterId || verified.companyId;

    // Check Recruiter first
    const recruiter = await Recruiter.findById(userId).populate("companyId");
    if (recruiter) {
      if (recruiter.status === "inactive") {
        return res.status(403).json({ message: "Recruiter account is inactive" });
      }
      req.user = recruiter;
      req.recruiter = recruiter;
      req.company = recruiter.companyId;
      req.companyId = recruiter.companyId?._id || recruiter.companyId;
      req.role = "recruiter";
      return next();
    }

    // Check Company
    const company = await Company.findById(userId);
    if (company) {
      req.user = company;
      req.company = company;
      req.companyId = company._id;
      req.role = "company";
      return next();
    }

    return res.status(401).json({ message: "User account not found" });
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Unauthorized or invalid session", error: error.message });
  }
}

module.exports = { companyAuth, companyOrRecruiterAuth };
