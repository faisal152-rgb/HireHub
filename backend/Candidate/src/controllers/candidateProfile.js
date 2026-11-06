const candidateProfile = require("../models/candidateProfile.js");
const { uploadFile, deleteFile } = require("../service/upload.js");


// Get candidate profile 
async function getProfile(req, res) {
    try {
        const candidateId = req.candidate._id;
        const profile = await candidateProfile.findOne({ candidate: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        return res.status(200).json({ message: "Profile found", profile });
    } catch (error) {
        console.error("Get profile error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Update logged-in candidate profile
async function updateProfile(req, res) {
    try {
        const candidateId = req.candidate._id;
        const profile = await candidateProfile.findOneAndUpdate(
            { candidate: candidateId },
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        if (req.files && req.files.profileImage && req.files.profileImage[0]) {
            const result = await uploadFile(req.files.profileImage[0], "profile");
            if (profile.profile && profile.profile.publicId) {
                // Delete old profile image if already exists
                await deleteFile(profile.profile.publicId);
            }
            profile.profile.url = result.url;
            profile.profile.publicId = result.publicId;

            await profile.save();
        }

        return res.status(200).json({ message: "Profile updated successfully", profile });
    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Add Education
async function addEducation(req, res) {
    try {
        const candidateId = req.candidate._id;
        const { degree, institution, field, startDate, endDate, grade, isCurrent } = req.body;

        if (!degree || !institution || !field) {
            return res.status(400).json({ message: "Required fields missing (degree, institution, field)" });
        }

        const profile = await candidateProfile.findOne({ candidate: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        profile.education.push({ degree, institution, field, grade, isCurrent, startDate, endDate });
        await profile.save();

        return res.status(200).json({ message: "Education added successfully", profile });
    } catch (error) {
        console.error("Add education error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Update Education
async function updateEducation(req, res) {
    try {
        const candidateId = req.candidate._id;
        const educationId = req.params.id || req.body.educationId;
        const { degree, institution, field, startDate, endDate, grade, isCurrent } = req.body;

        if (!educationId) {
            return res.status(400).json({ message: "Education ID is required" });
        }

        const profile = await candidateProfile.findOne({ candidate: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        const educationItem = profile.education.id(educationId);
        if (!educationItem) {
            return res.status(404).json({ message: "Education entry not found" });
        }
        if (degree !== undefined) educationItem.degree = degree;
        if (institution !== undefined) educationItem.institution = institution;
        if (field !== undefined) educationItem.field = field;
        if (grade !== undefined) educationItem.grade = grade;
        if (isCurrent !== undefined) educationItem.isCurrent = isCurrent;
        if (startDate !== undefined) educationItem.startDate = startDate;
        if (endDate !== undefined) educationItem.endDate = endDate;

        await profile.save();
        return res.status(200).json({ message: "Education updated successfully", profile });
    } catch (error) {
        console.error("Update education error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Delete Education
async function deleteEducation(req, res) {
    try {
        const candidateId = req.candidate._id;
        const educationId = req.params.id || req.body.educationId;

        if (!educationId) {
            return res.status(400).json({ message: "Education ID is required" });
        }

        const profile = await candidateProfile.findOne({ candidate: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        const educationItem = profile.education.id(educationId);
        if (!educationItem) {
            return res.status(404).json({ message: "Education entry not found" });
        }

        profile.education.pull(educationId);
        await profile.save();

        return res.status(200).json({ message: "Education deleted successfully", profile });
    } catch (error) {
        console.error("Delete education error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Add Experience
async function addExperience(req, res) {
    try {
        const candidateId = req.candidate._id;
        const { title, company, description, startDate, endDate, isCurrent } = req.body;

        if (!title || !company || !startDate) {
            return res.status(400).json({ message: "Required fields missing (title, company, startDate)" });
        }

        const profile = await candidateProfile.findOne({ candidate: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        profile.experience.push({ title, company, description, startDate, endDate, isCurrent });
        await profile.save();

        return res.status(200).json({ message: "Experience added successfully", profile });
    } catch (error) {
        console.error("Add experience error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Update Experience
async function updateExperience(req, res) {
    try {
        const candidateId = req.candidate._id;
        const experienceId = req.params.id || req.body.experienceId;
        const { title, company, description, startDate, endDate, isCurrent } = req.body;

        if (!experienceId) {
            return res.status(400).json({ message: "Experience ID is required" });
        }

        const profile = await candidateProfile.findOne({ candidate: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        const experienceItem = profile.experience.id(experienceId);
        if (!experienceItem) {
            return res.status(404).json({ message: "Experience entry not found" });
        }

        if (title !== undefined) experienceItem.title = title;
        if (company !== undefined) experienceItem.company = company;
        if (description !== undefined) experienceItem.description = description;
        if (startDate !== undefined) experienceItem.startDate = startDate;
        if (endDate !== undefined) experienceItem.endDate = endDate;
        if (isCurrent !== undefined) experienceItem.isCurrent = isCurrent;

        await profile.save();
        return res.status(200).json({ message: "Experience updated successfully", profile });
    } catch (error) {
        console.error("Update experience error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Delete Experience
async function deleteExperience(req, res) {
    try {
        const candidateId = req.candidate._id;
        const experienceId = req.params.id || req.body.experienceId;

        if (!experienceId) {
            return res.status(400).json({ message: "Experience ID is required" });
        }

        const profile = await candidateProfile.findOne({ candidate: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        const experienceItem = profile.experience.id(experienceId);
        if (!experienceItem) {
            return res.status(404).json({ message: "Experience entry not found" });
        }

        profile.experience.pull(experienceId);
        await profile.save();

        return res.status(200).json({ message: "Experience deleted successfully", profile });
    } catch (error) {
        console.error("Delete experience error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Add Skills
async function addSkills(req, res) {
    try {
        const candidateId = req.candidate._id;
        const { skill, skills } = req.body;
        const items = Array.isArray(skills) ? skills : (typeof skill === "string" ? [skill] : Array.isArray(req.body) ? req.body : []);

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Skill(s) required" });
        }

        const profile = await candidateProfile.findOne({ candidate: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        items.forEach((s) => {
            if (typeof s === "string") {
                const trimmed = s.trim();
                if (trimmed && !profile.skills.some(existing => existing.toLowerCase() === trimmed.toLowerCase())) {
                    profile.skills.push(trimmed);
                }
            }
        });

        await profile.save();
        return res.status(200).json({ message: "Skills added successfully", profile });
    } catch (error) {
        console.error("Add skills error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Delete Skills
async function deleteSkills(req, res) {
    try {
        const candidateId = req.candidate._id;
        const skillToDelete = req.params.skill || req.body.skill || req.query.skill;

        if (!skillToDelete) {
            return res.status(400).json({ message: "Skill is required to delete" });
        }

        const profile = await candidateProfile.findOne({ candidate: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        const initialLength = profile.skills.length;
        profile.skills = profile.skills.filter(
            (s) => s.toLowerCase() !== skillToDelete.toString().trim().toLowerCase()
        );

        if (profile.skills.length === initialLength) {
            return res.status(404).json({ message: "Skill not found in profile" });
        }

        await profile.save();
        return res.status(200).json({ message: "Skill deleted successfully", profile });
    } catch (error) {
        console.error("Delete skills error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Upload Resume
async function uploadResume(req, res) {
    try {
        const candidateId = req.candidate._id;
        const resumeFile = req.file || req.body.resume;

        if (!resumeFile) {
            return res.status(400).json({ message: "Resume file is required" });
        }

        
        const profile = await candidateProfile.findOne({ candidate: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        // Delete old resume if already exists
        if (profile.resume && profile.resume.publicId) {
            try {
                await deleteFile(profile.resume.publicId);
            } catch (err) {
                console.error("Failed to delete previous resume from storage:", err);
            }
        }

        const result = await uploadFile(resumeFile);
        if (!result || !result.url) {
            return res.status(500).json({ message: "Failed to upload resume" });
        }

        profile.resume = {
            url: result.url,
            publicId: result.fileId || result.publicId || ""
        };

        await profile.save();
        return res.status(200).json({ message: "Resume uploaded successfully", profile });
    } catch (error) {
        console.error("Upload resume error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Delete Resume
async function deleteResume(req, res) {
    try {
        const candidateId = req.candidate._id;
        const profile = await candidateProfile.findOne({ candidate: candidateId });

        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        if (!profile.resume || !profile.resume.publicId) {
            return res.status(404).json({ message: "Resume not found" });
        }

        await deleteFile(profile.resume.publicId);
        profile.resume = { url: "", publicId: "" };
        await profile.save();

        return res.status(200).json({ message: "Resume deleted successfully", profile });
    } catch (error) {
        console.error("Delete resume error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Add / Update Social Links
async function addSocialLinks(req, res) {
    try {
        const candidateId = req.candidate._id;
        const { linkedinUrl, githubUrl, portfolioUrl } = req.body;

        const profile = await candidateProfile.findOne({ candidate: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        if (linkedinUrl !== undefined) profile.linkedinUrl = linkedinUrl;
        if (githubUrl !== undefined) profile.githubUrl = githubUrl;
        if (portfolioUrl !== undefined) profile.portfolioUrl = portfolioUrl;

        await profile.save();
        return res.status(200).json({ message: "Social links updated successfully", profile });
    } catch (error) {
        console.error("Add social links error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Delete Social Links
async function deleteSocialLinks(req, res) {
    try {
        const candidateId = req.candidate._id;
        const { linkedinUrl, githubUrl, portfolioUrl, all } = req.body;

        const profile = await candidateProfile.findOne({ candidate: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        if (all) {
            profile.linkedinUrl = "";
            profile.githubUrl = "";
            profile.portfolioUrl = "";
        } else {
            if (linkedinUrl) profile.linkedinUrl = "";
            if (githubUrl) profile.githubUrl = "";
            if (portfolioUrl) profile.portfolioUrl = "";
        }

        await profile.save();
        return res.status(200).json({ message: "Social links deleted successfully", profile });
    } catch (error) {
        console.error("Delete social links error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
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
};