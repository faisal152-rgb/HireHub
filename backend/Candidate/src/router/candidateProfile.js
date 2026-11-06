const express = require("express");
const { candidateAuth } = require("../middleware/auth");
const {
    getProfile,
    updateProfile,
    addEducation,
    updateEducation,
    deleteEducation,
    addSkills,
    deleteSkills,
    uploadResume,
    deleteResume,
    addSocialLinks,
    deleteSocialLinks,
    addExperience,
    updateExperience,
    deleteExperience
} = require("../controllers/candidateProfile");

const router = express.Router();

// Get profile (logged in candidate)
router.get("/", candidateAuth, getProfile);

// Update profile
router.patch("/update", candidateAuth, updateProfile);

// Education routes
router.post("/education", candidateAuth, addEducation);
router.put("/education/:id", candidateAuth, updateEducation);
router.delete("/delete-education/:id", candidateAuth, deleteEducation);

// Experience routes
router.post("/experience", candidateAuth, addExperience);
router.put("/experience/:id", candidateAuth, updateExperience);
router.delete("/delete-experience/:id", candidateAuth, deleteExperience);

// Skills routes
router.post("/skills", candidateAuth, addSkills);
router.delete("/delete-skills/:skill?", candidateAuth, deleteSkills);

// Resume routes
router.post("/resume", candidateAuth, uploadResume);
router.delete("/delete-resume", candidateAuth, deleteResume);

// Social links routes
router.post("/social", candidateAuth, addSocialLinks);
router.delete("/delete-social-links", candidateAuth, deleteSocialLinks);

module.exports = router;