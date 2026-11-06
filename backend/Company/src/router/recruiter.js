const express = require("express");
const { companyAuth } = require("../middleware/auth");
const { recruiterAuth } = require("../middleware/recruiter");
const imageUpload = require("../middleware/upload");
const {
  getProfile,
  getCompanyRecruiterProfile,
  updateProfile,
  updateProfilePicture,
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
} = require("../controllers/recruiter");




const router = express.Router();


// Recruiter joins company via Invite Link or QR Code (no auth needed — recruiter opens the link)
router.post("/join-company", imageUpload.single("image"), joinCompany);
router.post("/refresh-token", recruiterrefreshToken);


// Company Invite Link & QR Code endpoints
router.get("/company/invite", companyAuth, getCompanyInvite);
router.post("/company/invite/regenerate", companyAuth, regenerateCompanyInvite);
router.get("/company/invite/regenerate", companyAuth, regenerateCompanyInvite);

// Verify single-use invite link / QR code status 
router.get("/company/invite/verify", verifyInviteCode);
router.get("/company/invite/verify/:inviteToken", verifyInviteCode);
router.post("/company/invite/verify", verifyInviteCode);
router.post("/company/invite/verify-membership", recruiterAuth, verifyCompanyMembership);

// Send One-Time Invite Link + QR Code to recruiter's email
router.post("/company/invite/send", companyAuth, sendInviteToRecruiter);


// Company Team Management
router.get("/company/recruiters", companyAuth, getCompanyRecruiters);
router.patch("/company/recruiters/:recruiterId/status", companyAuth, updateRecruiterStatus);
router.get("/company/recruiters/:recruiterId", companyAuth, getCompanyRecruiterProfile);
router.delete("/company/recruiters/:recruiterId", companyAuth, removeRecruiter);

// Recruiter Profile (Own Profile by Authenticated Recruiter)
router.get("/profile", recruiterAuth, getProfile);
router.patch("/profile/update", recruiterAuth, updateProfile);
router.patch("/profile/picture", recruiterAuth, imageUpload.single("image"), updateProfilePicture);

module.exports = router;
