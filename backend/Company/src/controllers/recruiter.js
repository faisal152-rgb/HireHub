const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const SessionModel = require("../models/auth/session");
const { generateQRCode, generateInviteLink } = require("../utils/generateqrcode");
const imageQueue = require("../queues/imageQueue");
const emailQueue = require("../queues/emailQueue")
const Recruiter = require("../models/Recruiter");
const Company = require("../models/auth/Company");
const RecruiterInvite = require("../models/RecruiterInvite");
const notificationQueue = require("../queues/notificationQueue");
const joinCompanyQueue = require("../queues/joinCompanyQueue");
const { publishEvent } = require("../service/kafka/Producer");
//  Redia 
const connectRedis = require("../config/redis");


// ─── Shared token/session helpers ────────────────────────────────────────────

const JWT_SECRET = () => process.env.JWT_SECRET || "hirehub_secret";

/**
 * Issue a brand-new access + refresh token pair for a recruiter and persist
 * a session document.  Returns { accessToken, refreshToken }.
 */
async function createRecruiterSession(recruiter, req) {
  const jwtSecret = JWT_SECRET();
  const payload = { id: recruiter._id, recruiterId: recruiter._id, role: recruiter.role };

  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: "15m" });
  const refreshToken = jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
  const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  await SessionModel.create({
    recruiterId: recruiter._id,
    accessToken,
    refreshToken: refreshTokenHash,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: req.ip,
    userAgent: req.header("user-agent"),
  });

  return { accessToken, refreshToken };
}

/**
 * Set the httpOnly refreshToken cookie on the response.
 */
function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}


// Helper: Resolve company instance from authenticated request
async function resolveCompany(req) {
  const user = req.user || req.company;
  if (!user) return null;
  // If user object has companyId directly
  if (user.companyId) {
    return await Company.findById(user.companyId);
  }
  // If user is the Company entity
  let company = await Company.findById(user._id || user.id);
  if (company) return company;

  // If user is a recruiter finding their company
  const recruiter = await Recruiter.findOne({
    $or: [{ _id: user._id || user.id }, { email: user.email }],
  });
  if (recruiter && recruiter.companyId) {
    return await Company.findById(recruiter.companyId);
  }
  return null;
}

// Helper: Construct the reusable company entry URL.
function buildInviteUrl(inviteCode, companyId) {
  const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
  return `${baseUrl}/recruiter/join?code=${inviteCode}&companyId=${companyId}`;
}

// 1. Generate Company Invite Link & QR Code

async function getCompanyInvite(req, res) {
  try {
    const company = await resolveCompany(req);
    if (!company) {
      return res.status(404).json({ message: "Company profile not found" });
    }

    let inviteCode = company.inviteCode;
    let inviteUrl = "";
    let qrCode = "";

    if (!inviteCode) {
      const generated = await generateInviteLink(company);
      inviteCode = generated.inviteCode;
      inviteUrl = generated.inviteUrl;
      qrCode = generated.qrCode;
    } else {
      inviteUrl = buildInviteUrl(inviteCode, company._id);
      qrCode = await generateQRCode(inviteUrl);
    }

    return res.status(200).json({
      success: true,
      companyId: company._id,
      companyName: company.name,
      inviteCode,
      inviteUrl,
      qrCode,
      isOneTimeUse: false,
      expiresAt: null,
      isReusableCompanyQr: true,
      requiresJoiningAuthorization: true,
    });
  } catch (error) {
    console.error("Get company invite error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2. Regenerate a Fresh Company Invite Link & QR Code
async function regenerateCompanyInvite(req, res) {
  try {
    const company = await resolveCompany(req);
    if (!company) {
      return res.status(404).json({ message: "Company profile not found" });
    }

    const { inviteCode, inviteUrl, qrCode } = await generateInviteLink(company);

    return res.status(200).json({
      success: true,
      companyId: company._id,
      companyName: company.name,
      inviteCode,
      inviteUrl,
      qrCode,
      message: "New invite link and QR code generated successfully",
    });
  } catch (error) {
    console.error("Regenerate invite error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 3. Send Invite Link & QR Code to Recruiter's Email

async function sendInviteToRecruiter(req, res) {
  try {
    const { email, inviteCode: clientInviteCode } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Recruiter email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const company = await resolveCompany(req);
    if (!company) {
      return res.status(404).json({ message: "Company profile not found" });
    }

    // Check if recruiter already exists and is active under this or another company
    const existingRecruiter = await Recruiter.findOne({ email: normalizedEmail });
    if (existingRecruiter) {
      if (existingRecruiter.companyId.toString() === company._id.toString()) {
        return res.status(400).json({
          code: "RECRUITER_ALREADY_MEMBER",
          message: "A recruiter with this email is already a member of your company. Please try another email.",
        });
      }
      return res.status(400).json({
        message: "This email is already registered with another company on HireHub",
      });
    }



    // Reuse a client-provided unused invite or generate a recruiter-specific
    // one-time invite without replacing the reusable company invite code.
    let invite;
    if (clientInviteCode) {
      invite = await RecruiterInvite.findOne({
        inviteCode: String(clientInviteCode).trim().toUpperCase(),
        companyId: company._id,
        isUsed: false,
      });
    }

    if (invite) {
      invite.email = normalizedEmail;
      await invite.save();
    } else {
      const generated = await generateInviteLink(company, {
        email: normalizedEmail,
        persistOnCompany: false,
      });
      invite = generated.invite;
    }

    const inviteUrl = buildInviteUrl(invite.inviteCode, company._id);

    await emailQueue.add(
      "recruiter-invite",
      {
        type: "recruiter-invite",
        to: normalizedEmail,
        company: {
          name: company.name,
        },
        inviteCode: invite.inviteCode,
        inviteUrl,
        qrCodeUrl: inviteUrl,
      }
    );

    // Create notification
    try {
      await createNotification({
        recruiterId: req.user._id,
        type: "invitation_sent",
        title: "Invitation Sent",
        message: `Invitation for ${company.name} has been sent to ${normalizedEmail}`,
        referenceId: invite._id,
        data: {
          inviteId: invite._id,
          companyId: invite.companyId,
          email: invite.email,
          inviteCode: invite.inviteCode,
          inviteUrl: inviteUrl,
        },
      });
    } catch (notifErr) {
      console.warn("Notification error (invitation sent):", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `One-time joining link queued for ${normalizedEmail}. The QR code can be reused for membership verification.`,
      inviteCode: invite.inviteCode,
      inviteUrl,
      qrCodeUrl: inviteUrl,
    });
  } catch (error) {
    console.error("Send invite error:", error);
    return res.status(500).json({ message: "Failed to send invitation email", error: error.message });
  }
}

// 4. Verify Invite Code (Called when recruiter opens link or scans QR)
async function verifyInviteCode(req, res) {
  try {
    let rawCode = req.query?.code ?? req.params?.inviteToken ?? req.params?.code ?? req.body?.code;
    if (!rawCode) {
      return res.status(400).json({ valid: false, message: "Invite code is required" });
    }

    if (Array.isArray(rawCode)) {
      rawCode = rawCode[0];
    }
    if (typeof rawCode === "object" && rawCode !== null) {
      rawCode = rawCode.code || rawCode.token || "";
    }
    rawCode = String(rawCode).trim();

    if (!rawCode) {
      return res.status(400).json({ valid: false, message: "Invite code is required" });
    }

    if (rawCode.includes("code=")) {
      const match = rawCode.match(/code=([^&]+)/);
      if (match && match[1]) {
        rawCode = decodeURIComponent(match[1]).trim();
      }
    }

    const formattedCode = rawCode.toUpperCase();
    let invite = await RecruiterInvite.findOne({ inviteCode: formattedCode }).populate(
      "companyId",
      "name email isActive"
    );

    if (!invite) {
      const fallbackCompany = await Company.findOne({ inviteCode: formattedCode });
      if (fallbackCompany) {
        if (!fallbackCompany.isActive) {
          return res.status(403).json({ valid: false, message: "This company is no longer active." });
        }
        return res.status(200).json({
          valid: true,
          companyId: fallbackCompany._id,
          companyName: fallbackCompany.name,
          email: "",
          isCompanyQr: true,
          requiresJoiningAuthorization: true,
          message: "Company QR code verified. An authorized joining invitation is required for new members.",
        });
      }
      return res.status(404).json({ valid: false, message: "Invalid invite code" });
    }

    if (!invite.companyId || !invite.companyId.isActive) {
      return res.status(403).json({ valid: false, message: "This company is no longer active." });
    }

    // isUsed check only applies to one-time (email) invites, not reusable company invites
    const isReusableCompanyInvite = !invite.email && !invite.expiresAt;
    if (!isReusableCompanyInvite && invite.isUsed) {
      // Look up existing recruiter who used this invite
      const usedByRecruiter = invite.usedBy
        ? await Recruiter.findById(invite.usedBy)
        : await Recruiter.findOne({ email: invite.email, companyId: invite.companyId._id });

      if (usedByRecruiter) {
        if (usedByRecruiter.status === "inactive") {
          return res.status(403).json({
            valid: false,
            message: "Your company access has been revoked. Contact the company administrator.",
          });
        }

        return res.status(200).json({
          valid: true,
          companyId: invite.companyId._id,
          companyName: invite.companyId.name,
          email: usedByRecruiter.email || invite.email || "",
          recruiterName: usedByRecruiter.name || "",
          recruiterId: usedByRecruiter._id,
          alreadyUsed: true,
          isExistingMember: true,
          requiresLogin: true,
          message: "Existing company membership recognized. Re-verify membership to access workspace.",
        });
      }

      return res.status(400).json({
        valid: false,
        message: "This invite link / QR code has already been used and is no longer valid.",
        alreadyUsed: true,
      });
    }

    // expiresAt check only applies when a non-null expiry is explicitly set
    if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
      return res.status(400).json({
        valid: false,
        message: "This invite link / QR code has expired. Please request a new invite.",
        expired: true,
      });
    }

    return res.status(200).json({
      valid: true,
      companyId: invite.companyId._id,
      companyName: invite.companyId.name,
      email: invite.email || "",
      isReusableCompanyInvite: !invite.email && !invite.expiresAt,
      message: "Invite code is valid and ready to use.",
    });
  } catch (error) {
    console.error("Verify invite error:", error);
    return res.status(500).json({ valid: false, message: "Internal server error", error: error.message });
  }
}

// Verify a reusable company QR for an authenticated existing recruiter.
async function verifyCompanyMembership(req, res) {
  try {
    let rawCode = req.body?.code || req.query?.code;
    if (Array.isArray(rawCode)) rawCode = rawCode[0];
    rawCode = String(rawCode || "").trim();
    if (rawCode.includes("code=")) {
      const match = rawCode.match(/code=([^&]+)/);
      rawCode = match?.[1] ? decodeURIComponent(match[1]).trim() : "";
    }

    if (!rawCode) {
      return res.status(400).json({ success: false, message: "Company QR code is required." });
    }

    const formattedCode = rawCode.toUpperCase();
    const invite = await RecruiterInvite.findOne({ inviteCode: formattedCode });
    const company = invite
      ? await Company.findOne({ _id: invite.companyId, isActive: true })
      : await Company.findOne({ inviteCode: formattedCode, isActive: true });

    if (!company) {
      return res.status(404).json({ success: false, message: "Invalid company QR code." });
    }

    const recruiterId = req.user?._id || req.recruiter?._id;
    const recruiter = await Recruiter.findOne({
      _id: recruiterId,
      companyId: company._id,
    });

    if (!recruiter || recruiter.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Your company access has been revoked. Contact the company administrator.",
      });
    }

    // Security check: if this one-time invite was claimed by a specific recruiter, ensure it matches
    if (invite && invite.usedBy && invite.usedBy.toString() !== recruiter._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "This invitation QR code was assigned to another recruiter.",
      });
    }

    // Issue a fresh access + refresh token pair so the client always holds a
    // valid short-lived access token after re-scanning the QR.
    const { accessToken, refreshToken } = await createRecruiterSession(recruiter, req);
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      alreadyMember: true,
      message: "Existing company membership verified. Access granted.",
      redirect: "/recruiter/dashboard",
      recruiterId: recruiter._id,
      companyId: company._id,
      accessToken,
    });
  } catch (error) {
    console.error("Verify company membership error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// 5. Recruiter Joins Company (Via One-Time Invite Link or QR Code)
async function joinCompany(req, res) {
  try {
    const {
      inviteCode,
      name,
      email,
      phone,
      designation,
      department,
      addedVia,
    } = req.body;
    const image = req.file || req.body.image;

    if (!inviteCode || !name || !email) {
      return res.status(400).json({
        message: "Invite code, name, and email are required to join company",
      });
    }

    let rawCode = inviteCode;
    if (Array.isArray(rawCode)) rawCode = rawCode[0];
    if (typeof rawCode === "object" && rawCode !== null) rawCode = rawCode.code || rawCode.token || "";
    rawCode = String(rawCode || "").trim();

    if (rawCode.includes("code=")) {
      const match = rawCode.match(/code=([^&]+)/);
      if (match && match[1]) {
        rawCode = decodeURIComponent(match[1]).trim();
      }
    }

    const formattedCode = rawCode.toUpperCase();
    const normalizedEmail = String(email || "").toLowerCase().trim();

    // 1. Look up one-time invite record
    let invite = await RecruiterInvite.findOne({ inviteCode: formattedCode });
    let company;

    if (invite) {
      company = await Company.findById(invite.companyId);
    } else {
      // The reusable company QR identifies a company, but cannot authorize a join.
      company = await Company.findOne({ inviteCode: formattedCode, isActive: true });
      if (company) {
        return res.status(403).json({
          success: false,
          message: "A valid one-time joining invitation is required to join this company.",
          requiresJoiningAuthorization: true,
        });
      }
    }

    if (!company || !company.isActive) {
      return res.status(404).json({ message: "Invalid or inactive company invite code" });
    }

    // Check if recruiter already registered
    const existingRecruiter = await Recruiter.findOne({ email: normalizedEmail });
    if (existingRecruiter) {
      if (!existingRecruiter.companyId || existingRecruiter.companyId.toString() !== company._id.toString()) {
        return res.status(400).json({
          message: "This email is already registered under another company",
        });
      }

      // Check if recruiter access was revoked
      if (existingRecruiter.status === "inactive") {
        return res.status(403).json({
          message: "Your company access has been revoked. Contact the company administrator.",
        });
      }

      // If invite has usedBy, verify it matches this recruiter
      if (invite && invite.usedBy && invite.usedBy.toString() !== existingRecruiter._id.toString()) {
        return res.status(403).json({
          message: "This invitation QR code was assigned to another recruiter.",
        });
      }

      if (invite && invite.email && invite.email !== normalizedEmail) {
        return res.status(403).json({
          message: `This invitation was sent specifically to ${invite.email}.`,
        });
      }

      // Re-verify existing membership and issue fresh tokens without creating duplicate account
      const { accessToken, refreshToken } = await createRecruiterSession(existingRecruiter, req);
      setRefreshCookie(res, refreshToken);

      return res.status(200).json({
        success: true,
        alreadyMember: true,
        message: `Existing company membership verified for ${company.name}`,
        accessToken,
        recruiter: {
          id: existingRecruiter._id,
          name: existingRecruiter.name,
          email: existingRecruiter.email,
          companyId: company._id,
          companyName: company.name,
          image: existingRecruiter.profilePicture?.url || "",
          designation: existingRecruiter.designation,
          department: existingRecruiter.department,
          status: existingRecruiter.status,
        },
      });
    }

    // New recruiter join flow — enforce one-time invitation rules
    //Redis Get Method

    const redisData = await connectRedis.get(`recruiter:invite:${formattedCode}`);
    if (redisData) {
      return res.status(400).json({
        message: "This invite link / QR code has already been used or has expired.",
        alreadyUsed: true,
      })
    }

    if (invite) {
      // Check 1: One-time use validation
      if (invite.isUsed) {
        return res.status(400).json({
          message: "This invite link / QR code has already been used and is no longer valid. Please request a new invitation.",
          alreadyUsed: true,
        });
      }

      // Check 2: Expiration validation
      if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
        return res.status(400).json({
          message: "This invite link / QR code has expired. Please request a new invitation.",
          expired: true,
        });
      }

      // Check 3: If invite was sent specifically to an email, enforce it
      if (invite.email && invite.email !== normalizedEmail) {
        return res.status(400).json({
          message: `This invitation was sent specifically to ${invite.email}. Please register with that email.`,
        });
      }
    }

    if (!image) {
      return res.status(400).json({
        message: "A profile image is required to join company",
      });
    }

    // Claim the one-time authorization before creating the membership. This
    // makes concurrent join requests deterministic: only one can proceed.
    const claimedInvite = invite
      ? await RecruiterInvite.findOneAndUpdate(
        {
          _id: invite._id,
          isUsed: false,
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        },
        {
          $set: { isUsed: true, usedAt: new Date() },
        },
        { new: true }
      )
      : null;

    if (invite && !claimedInvite) {
      return res.status(409).json({
        message: "This joining invitation has already been used or has expired.",
        alreadyUsed: true,
      });
    }

    // Redis Set Method
    await connectRedis.set(
      `recruiter:invite:${formattedCode}`,
      JSON.stringify({
        email: normalizedEmail,
        status: "used",
        recruiterId: "pending",
      }),
      "EX",
      1800
    );

    // Create new Recruiter linked to company
    let newRecruiter;
    try {
      newRecruiter = await Recruiter.create({
        companyId: company._id,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : "",
        profilePicture: {
          url: "",
          publicId: "",
        },
        designation: designation ? designation.trim() : "Recruiter",
        department: department ? department.trim() : "Human Resources",
        role: "recruiter",
        status: "active",
        addedVia: addedVia === "qr_code" ? "qr_code" : "invite_link",
        isVerified: true,
        isProfileCompleted: true,
        joinedAt: new Date(),
      });

      // Image Add Queue
      await imageQueue.add("upload-image", {
        file: image,
        targetType: "recruiter",
        targetId: newRecruiter._id.toString(),
      });
    } catch (createError) {
      if (newRecruiter) {
        await Recruiter.deleteOne({ _id: newRecruiter._id });
      }
      if (claimedInvite) {
        await RecruiterInvite.updateOne(
          { _id: claimedInvite._id, usedBy: null },
          { $set: { isUsed: false, usedAt: null } }
        );
      }
      // Clear the Redis dedup key so the invite can be retried after failure
      await connectRedis.del(`recruiter:invite:${formattedCode}`);
      throw createError;
    }

    // Push to joinCompanyQueue 
    try {
    await joinCompanyQueue.add("publishCompanyEvent", {
      recruiterId: newRecruiter._id.toString(),
      eventType: "RECRUITER_ADDED",
      name: newRecruiter.name,
      email: newRecruiter.email,
      companyId: company._id.toString(),
    });
    } catch (queueErr) {
      console.warn("Recuiter Join error:", queueErr.message);
    }
  
    // Create notification
    try {
      await notificationQueue.add("sendNotification", {
        companyId: company._id,
        type: "recruiter_added",
        title: "New Recruiter Joined",
        message: `${newRecruiter.name} has joined ${company.name} as a recruiter.`,
        referenceId: newRecruiter._id,
        data: {
          recruiterId: newRecruiter._id,
          companyId: company._id,
          companyName: company.name,
          recruiterName: newRecruiter.name,
          recruiterEmail: newRecruiter.email,
          designation: newRecruiter.designation,
          department: newRecruiter.department,
          status: newRecruiter.status,
          joinedAt: newRecruiter.joinedAt,
        },
      });
    } catch (notifErr) {
      console.warn(
        "Notification error (recruiter added):",
        notifErr.message
      );
    }

    // Link recruiter to company's recruiters array
    await Company.updateOne(
      { _id: company._id },
      { $addToSet: { recruiters: newRecruiter._id } }
    );

    // Invalidate company's recruiters cache so the new recruiter appears immediately
    try {
      const recKeys = await connectRedis.keys(`company:${company._id}:recruiters*`);
      if (recKeys && recKeys.length > 0) {
        await connectRedis.del(...recKeys);
      }
    } catch (cacheErr) {
      console.warn("Redis invalidation error (joinCompany):", cacheErr.message);
    }

    if (claimedInvite) {
      await RecruiterInvite.updateOne(
        { _id: claimedInvite._id },
        { $set: { usedBy: newRecruiter._id } }
      );
    }

    const { accessToken, refreshToken } = await createRecruiterSession(newRecruiter, req);
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      success: true,
      message: `Successfully joined ${company.name} as a recruiter`,
      accessToken,
      recruiter: {
        id: newRecruiter._id,
        name: newRecruiter.name,
        email: newRecruiter.email,
        companyId: company._id,
        companyName: company.name,
        image: newRecruiter.profilePicture?.url || "",
        designation: newRecruiter.designation,
        department: newRecruiter.department,
        status: newRecruiter.status,
      },
    });
  } catch (error) {
    console.error("Join company error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// Recruiter Refresh Token
async function recruiterrefreshToken(req, res) {
  // Cookie name must match what joinCompany / login sets ("refreshToken")
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No refresh token",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET());
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Refresh token invalid or expired",
    });
  }

  const recruiterId = decoded.recruiterId || decoded.id || decoded._id;
  if (!recruiterId || !mongoose.isValidObjectId(recruiterId)) {
    return res.status(401).json({
      success: false,
      message: "Refresh token has an invalid recruiter ID",
    });
  }

  try {
    const refreshTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const session = await SessionModel.findOne({
      refreshTokenHash,
      revoked: false,
      status: "active",
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session not found or revoked",
      });
    }

    // Verify the recruiter still exists and is active
    const recruiter = await Recruiter.findById(recruiterId);
    if (!recruiter) {
      return res.status(401).json({
        success: false,
        message: "Recruiter account not found",
      });
    }
    if (recruiter.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Your company access has been revoked. Contact the company administrator.",
      });
    }

    // Revoke the old session
    session.revoked = true;
    session.status = "revoked";
    await session.save();

    // Issue new token pair and create a fresh session
    const { accessToken, refreshToken: newRefreshToken } = await createRecruiterSession(recruiter, req);
    setRefreshCookie(res, newRefreshToken);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken,
      token: accessToken, // alias for frontend compatibility
    });
  } catch (error) {
    console.error("Recruiter refresh token error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 6. Get All Recruiters Added to Company
async function getCompanyRecruiters(req, res) {
  try {
    const company = await resolveCompany(req);
    if (!company) {
      return res.status(404).json({ message: "Company profile not found" });
    }
    // ── Pagination ──
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );
    const skip = (page - 1) * limit;

    const companyId = company._id;
    const cacheKey = `company:${companyId}:recruiters:p${page}:l${limit}`;

    // 1. Check Redis Cache
    const cachedData = await connectRedis.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      return res.status(200).json({
        success: true,
        message: "Recruiters fetched successfully from cache",
        source: "Redis Cache",
        companyId,
        companyName: company.name,
        count: parsed.recruiters?.length || 0,
        totalRecruiters: parsed.totalRecruiters || 0,
        totalPages: parsed.totalPages || 1,
        currentPage: page,
        limit,
        hasNextPage: page < (parsed.totalPages || 1),
        hasPrevPage: page > 1,
        recruiters: parsed.recruiters || [],
        data: parsed.recruiters || [],
      });
    }

    const [recruiters, totalRecruiters] = await Promise.all([
      Recruiter.find({ companyId: company._id }).sort({
        createdAt: -1,
      })
        .skip(skip)
        .limit(limit),
      Recruiter.countDocuments({ companyId: company._id })
    ]);
    const totalPages = Math.ceil(totalRecruiters / limit);

    // 3. Store in Redis for 10 minutes
    await connectRedis.set(
      cacheKey,
      JSON.stringify({ recruiters, totalRecruiters, totalPages }),
      "EX",
      600
    );
    return res.status(200).json({
      success: true,
      message: "Recruiters fetched successfully",
      companyId: company._id,
      companyName: company.name,
      count: recruiters.length,
      totalRecruiters,
      currentPage: page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      recruiters,
    });
  } catch (error) {
    console.error("Get company recruiters error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 7. Update recruiter active/inactive/pending status
async function updateRecruiterStatus(req, res) {
  try {
    const company = await resolveCompany(req);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company profile not found",
      });
    }

    const { recruiterId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(recruiterId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recruiter ID",
      });
    }

    const allowedStatuses = ["active", "pending", "inactive"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be one of: active, pending, inactive",
      });
    }

    const recruiter = await Recruiter.findOne({
      _id: recruiterId,
      companyId: company._id,
    });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found under this company",
      });
    }

    const previousStatus = recruiter.status;
    recruiter.status = status;
    await recruiter.save();

    if (status === "inactive") {
      await Company.updateOne(
        { _id: company._id },
        { $pull: { recruiters: recruiter._id } }
      );
      // Revoke all active sessions for this recruiter
      await SessionModel.updateMany(
        { recruiterId: recruiter._id, revoked: false },
        { revoked: true, status: "revoked" }
      );
    } else if (!company.recruiters?.includes(recruiter._id)) {
      await Company.updateOne(
        { _id: company._id },
        { $addToSet: { recruiters: recruiter._id } }
      );
    }

    try {
      await publishEvent(
        "company-events",
        {
          eventType: "RECRUITER_STATUS_UPDATED",
          payload: {
            recruiterId: recruiter._id,
            companyId: company._id,
            previousStatus,
            status: recruiter.status,
            updatedAt: new Date(),
          },
        },
        company._id
      );
    } catch (kafkaErr) {
      console.warn("Kafka event publish skipped (RECRUITER_STATUS_UPDATED):", kafkaErr.message);
    }

    try {
      await createNotification({
        recruiterId: recruiter._id,
        type: "recruiter_status_updated",
        title: "Recruiter Access Updated",
        message: `Your recruiter access has been updated from ${previousStatus} to ${recruiter.status}.`,
        referenceId: recruiter._id,
        data: {
          recruiterId: recruiter._id,
          companyId: company._id,
          previousStatus,
          status: recruiter.status,
        },
      });
    } catch (notifErr) {
      console.warn("Notification error (recruiter status updated):", notifErr.message);
    }
    // ── Update Redis Cache ──
    try {
      const recKeys = await connectRedis.keys(`company:${company._id}:recruiters*`);
      if (recKeys && recKeys.length > 0) {
        await connectRedis.del(...recKeys);
      }
      await connectRedis.del(`recruiter:${recruiter._id}`);
      await connectRedis.del(`recruiter:${recruiter._id}:profile`);
      await connectRedis.del(`company:${company._id}:recruiter:${recruiter._id}`);
    } catch (cacheErr) {
      console.warn("Redis invalidation error (updateRecruiterStatus):", cacheErr.message);
    }


    return res.status(200).json({
      success: true,
      message: "Recruiter status updated successfully",
      recruiterId: recruiter._id,
      previousStatus,
      status: recruiter.status,
    });
  } catch (error) {
    console.error("Update recruiter status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// 8. Remove or Deactivate Recruiter from Company (Team Management)
async function removeRecruiter(req, res) {
  try {
    // Resolve company
    const company = await resolveCompany(req);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company profile not found",
      });
    }

    const { recruiterId } = req.params;

    // Validate recruiter ID
    if (!mongoose.Types.ObjectId.isValid(recruiterId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recruiter ID",
      });
    }

    // Find recruiter belonging to this company
    const recruiter = await Recruiter.findOne({
      _id: recruiterId,
      companyId: company._id,
    });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found under this company",
      });
    }

    // Prevent duplicate removal
    if (recruiter.status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "Recruiter is already inactive",
      });
    }

    // Deactivate recruiter
    recruiter.status = "inactive";
    await recruiter.save();

    // Revoke all active sessions for this recruiter so they are immediately signed out
    await SessionModel.updateMany(
      { recruiterId: recruiter._id, revoked: false },
      { revoked: true, status: "revoked" }
    );

    // Remove recruiter from company's recruiters array
    await Company.updateOne(
      { _id: company._id },
      {
        $pull: {
          recruiters: recruiter._id,
        },
      }
    );

    // Publish Kafka event
    try {
      await publishEvent(
        "company-events",
        {
          eventType: "RECRUITER_REMOVED",
          payload: {
            recruiterId: recruiter._id,
            companyId: company._id,
            name: recruiter.name,
            email: recruiter.email,
            phone: recruiter.phone,
            designation: recruiter.designation,
            department: recruiter.department,
            role: recruiter.role,
            status: recruiter.status,
            profilePicture: recruiter.profilePicture,
            removedAt: new Date(),
          },
        },
        company._id
      );
    } catch (kafkaErr) {
      console.warn(
        "Kafka event publish skipped (RECRUITER_REMOVED):",
        kafkaErr.message
      );
    }

    // Create notification
    try {
      await createNotification({
        recruiterId: req.user._id,
        type: "recruiter_removed",
        title: "Recruiter Removed",
        message: `Recruiter ${recruiter.name} has been removed from the company`,
        referenceId: recruiter._id,
        data: {
          recruiterId: recruiter._id,
          companyId: company._id,
          companyName: company.name,
          recruiterName: recruiter.name,
          recruiterEmail: recruiter.email,
          status: recruiter.status,
        },
      });
    } catch (notifErr) {
      console.warn(
        "Notification error (recruiter removed):",
        notifErr.message
      );
    }
    // ── Update Redis Cache ──
    try {
      const recKeys = await connectRedis.keys(`company:${company._id}:recruiters*`);
      if (recKeys && recKeys.length > 0) {
        await connectRedis.del(...recKeys);
      }
      await connectRedis.del(`recruiter:${recruiter._id}`);
      await connectRedis.del(`recruiter:${recruiter._id}:profile`);
      await connectRedis.del(`company:${company._id}:recruiter:${recruiter._id}`);
    } catch (cacheErr) {
      console.warn("Redis invalidation error (updateRecruiterStatus):", cacheErr.message);
    }


    return res.status(200).json({
      success: true,
      message: "Recruiter successfully deactivated from company",
      recruiterId: recruiter._id,
      status: recruiter.status,
    });

  } catch (error) {
    console.error("Remove recruiter error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// 8. Get a recruiter profile for the authenticated recruiter.
async function getProfile(req, res) {
  try {
    const recruiterId = req.recruiter?._id;
    if (!recruiterId) {
      return res.status(400).json({
        success: false,
        message: "Recruiter identity not found",
      });
    }
    // ── Check Redis Cache ──
    const cachedRecruiter = await connectRedis.get(`recruiter:${recruiterId}`);
    if (cachedRecruiter) {
      return res.status(200).json({
        success: true,
        message: "Recruiter profile retrieved successfully",
        profile: JSON.parse(cachedRecruiter),
        company: JSON.parse(cachedRecruiter).companyId,
      });
    }

    const profile = await Recruiter.findById(recruiterId).populate(
      "companyId",
      "name email logo website location"
    );
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Recruiter profile not found",
      });
    }
    // ── Update Redis Cache ──
    await connectRedis.set(`recruiter:${recruiterId}`,
      JSON.stringify(profile),
      "EX", 600
    );

    return res.status(200).json({
      success: true,
      message: "Recruiter profile retrieved successfully",
      profile,
      company: profile.companyId,
    });
  } catch (error) {
    console.error("Get recruiter profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// 9. Get a recruiter profile for the authenticated company.
async function getCompanyRecruiterProfile(req, res) {
  try {
    const { recruiterId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(recruiterId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recruiter ID",
      });
    }

    const companyId = req.company?._id || req.user?._id;

    // Check Redis Cache 
    const cachedData = await connectRedis.get(
      `company:${companyId}:recruiter:${recruiterId}`
    );

    if (cachedData) {
      return res.status(200).json({
        success: true,
        message: "Recruiter profile By Company retrieved successfully",
        profile: JSON.parse(cachedData),
        company: JSON.parse(cachedData).companyId,
      });
    }
    const profile = await Recruiter.findOne({
      _id: recruiterId,
      companyId,
    }).populate("companyId", "name email logo website location");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found under this company",
      });
    }

    await connectRedis.set(
      `company:${companyId}:recruiter:${recruiterId}`,
      JSON.stringify(profile),
      "EX",
      600
    );


    return res.status(200).json({
      success: true,
      message: "Recruiter profile retrieved successfully",
      profile,
      company: profile.companyId,
    });
  } catch (error) {
    console.error("Get company recruiter profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// 10. Update Recruiter Profile
async function updateProfile(req, res) {
  try {
    const recruiterId = req.recruiter?._id || req.user?._id;
    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Recruiter identity not found",
      });
    }

    const {
      name,
      phone,
      designation,
      department,
      bio,
      linkedinUrl,
    } = req.body;

    const profile = await Recruiter.findById(recruiterId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Recruiter profile not found",
      });
    }

    const updates = {
      name,
      phone,
      designation,
      department,
      bio,
      linkedinUrl,
    };

    for (const [field, value] of Object.entries(updates)) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        profile[field] = typeof value === "string" ? value.trim() : value;
      }
    }

    if (!profile.name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    profile.isProfileCompleted = !!(profile.name && profile.phone && profile.designation);
    await profile.save();

    // Delete recruiter profile cache
    try {
      await connectRedis.del(`recruiter:${recruiterId}`);
      await connectRedis.del(`recruiter:${recruiterId}:profile`);
      if (profile.companyId) {
        const compId = profile.companyId._id || profile.companyId;
        await connectRedis.del(`company:${compId}:recruiter:${recruiterId}`);
        const recKeys = await connectRedis.keys(`company:${compId}:recruiters*`);
        if (recKeys && recKeys.length > 0) {
          await connectRedis.del(...recKeys);
        }
      }
    } catch (cacheErr) {
      console.warn("Redis cache del error (updateProfile):", cacheErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Recruiter profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Update recruiter profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// 11. Recruiter Profile Picture Upload or Update
async function updateProfilePicture(req, res) {
  try {
    const recruiterId = req.recruiter?._id || req.user?._id;
    const image = req.file || req.body.image;

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Recruiter identity not found",
      });
    }

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }
    const profile = await Recruiter.findById(recruiterId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Recruiter profile not found",
      });
    }
    await imageQueue.add("upload-image", {
      file: image,
      targetType: "recruiter",
      targetId: recruiterId.toString(),
    });
    // Delete old Redis cache
    try {
      await connectRedis.del(`recruiter:${recruiterId}`);
      await connectRedis.del(`recruiter:${recruiterId}:profile`);
      if (profile.companyId) {
        const compId = profile.companyId._id || profile.companyId;
        await connectRedis.del(`company:${compId}:recruiter:${recruiterId}`);
        const recKeys = await connectRedis.keys(`company:${compId}:recruiters*`);
        if (recKeys && recKeys.length > 0) {
          await connectRedis.del(...recKeys);
        }
      }
    } catch (cacheErr) {
      console.warn("Redis cache del error (updateProfilePicture):", cacheErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      profile,
      profilePicture: profile.profilePicture,
    });
  } catch (error) {
    console.error("Update profile picture error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

module.exports = {
  getCompanyInvite,
  regenerateCompanyInvite,
  sendInviteToRecruiter,
  verifyInviteCode,
  verifyCompanyMembership,
  recruiterrefreshToken,
  joinCompany,
  getCompanyRecruiters,
  updateRecruiterStatus,
  removeRecruiter,
  getProfile,
  getCompanyRecruiterProfile,
  updateProfile,
  updateProfilePicture,
  resolveCompany,
};
