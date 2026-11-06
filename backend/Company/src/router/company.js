const express = require("express");
const { companyAuth } = require("../middleware/auth");
const imageUpload = require("../middleware/upload");
const {
  getCompanyProfile,
  updateCompanyProfile,
  updateCompanyLogo,
  getPublicCompanyProfile,
} = require("../controllers/company");

const router = express.Router();

// 1. Get authenticated company profile (with recruiters list and stats)
router.get("/profile", companyAuth, getCompanyProfile);

// 2. Update authenticated company profile details
router.patch("/profile", companyAuth, updateCompanyProfile);

// 3. Update company logo
router.patch("/profile/logo", companyAuth, imageUpload.single("logo"), updateCompanyLogo);

// 4. Public company profile (with active jobs)
router.get("/public/:id", getPublicCompanyProfile);
router.get("/:id", getPublicCompanyProfile);


module.exports = router;
