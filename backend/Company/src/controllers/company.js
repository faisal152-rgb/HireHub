const Company = require("../models/auth/Company");
const Recruiter = require("../models/Recruiter");
const Job = require("../models/Job");
const Application = require("../models/Application");
const { uploadFile } = require("../service/upload");
//  Redia 
const connectRedis = require("../config/redis");

// Helper: Resolve company from authenticated user (Company or Recruiter)
async function resolveCompany(req) {
  const user = req.user || req.company;
  if (!user) return null;

  // If user object has companyId directly (Recruiter instance)
  if (user.companyId) {
    return await Company.findById(user.companyId);
  }

  // If user is the Company entity itself
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

// 1. Get Authenticated Company Profile (with stats & populated recruiters)
async function getCompanyProfile(req, res) {
  try {
    const companyEntity = await resolveCompany(req);
    if (!companyEntity) {
      return res.status(404).json({
        success: false,
        message: "Company profile not found",
      });
    }
    // Check Redis cache first
    const cachedProfile = await connectRedis.get(
      `company:${companyEntity._id}:profile`
    );
    if (cachedProfile) {
      const parsed = JSON.parse(cachedProfile);
      return res.status(200).json({
        success: true,
        message: "Company profile retrieved successfully",
        company: parsed.company || parsed,
        stats: parsed.stats || null,
      });
    }

    // Fetch full company details excluding sensitive fields
    const company = await Company.findById(companyEntity._id)
      .select("-password")
      .populate({
        path: "recruiters",
        select: "name email phone designation department role status profilePicture addedVia createdAt",
      });

    // Compute company statistics
    const [totalJobs, openJobs, totalApplications] = await Promise.all([
      Job.countDocuments({ companyId: company._id }),
      Job.countDocuments({ companyId: company._id, status: "open" }),
      Application.countDocuments({ companyId: company._id }).catch(() => 0),
    ]);

    const stats = {
      totalRecruiters: company.recruiters ? company.recruiters.length : 0,
      totalJobs,
      openJobs,
      closedJobs: Math.max(0, totalJobs - openJobs),
      totalApplications,
    };
    // Set Redis cache with 1-hour expiry
    await connectRedis.set(
      `company:${companyEntity._id}:profile`,
      JSON.stringify({ company, stats }),
      "EX",
      3600
    );

    return res.status(200).json({
      success: true,
      message: "Company profile retrieved successfully",
      company,
      stats,
    });
  } catch (error) {
    console.error("Get company profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching company profile",
      error: error.message,
    });
  }
}

// 2. Update Company Profile Details
async function updateCompanyProfile(req, res) {
  try {
    const company = await resolveCompany(req);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company profile not found",
      });
    }

    const {
      name,
      phone,
      industry,
      companySize,
      description,
      website,
      location,
    } = req.body;

    // Validate phone number if provided
    if (phone !== undefined) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid 10-digit phone number starting with 6, 7, 8, or 9",
        });
      }

      // Check if phone number is already registered by another company
      const phoneExists = await Company.findOne({
        phone,
        _id: { $ne: company._id },
      });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "Phone number is already associated with another company",
        });
      }
      company.phone = phone;
    }

    // Validate industry if provided
    if (industry !== undefined) {
      const allowedIndustries = ["Technology", "Recruitment", "Education", "Healthcare", "Other"];
      if (!allowedIndustries.includes(industry)) {
        return res.status(400).json({
          success: false,
          message: `Invalid industry. Must be one of: ${allowedIndustries.join(", ")}`,
        });
      }
      company.industry = industry;
    }

    // Validate companySize if provided
    if (companySize !== undefined) {
      const allowedSizes = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
      if (!allowedSizes.includes(companySize)) {
        return res.status(400).json({
          success: false,
          message: `Invalid companySize. Must be one of: ${allowedSizes.join(", ")}`,
        });
      }
      company.companySize = companySize;
    }

    if (name !== undefined && name.trim()) {
      company.name = name.trim();
    }
    if (description !== undefined) {
      company.description = description.trim();
    }
    if (website !== undefined) {
      company.website = website.trim();
    }
    if (location !== undefined) {
      company.location = location.trim();
    }

    await company.save();

    // Return updated company without password
    const updatedCompany = await Company.findById(company._id)
      .select("-password")
      .populate({
        path: "recruiters",
        select: "name email phone designation department role status profilePicture",
      });

      //Delete the cached company profile
      await connectRedis.del(`company:${company._id}:profile`);
      await connectRedis.del(`company:${company._id}:publicProfile`);

    return res.status(200).json({
      success: true,
      message: "Company profile updated successfully",
      company: updatedCompany,
    });
  } catch (error) {
    console.error("Update company profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating company profile",
      error: error.message,
    });
  }
}

// 3. Update Company Logo
async function updateCompanyLogo(req, res) {
  try {
    const logo = req.file || req.body.logo;
    if (!logo) {
      return res.status(400).json({
        success: false,
        message: "Logo is required",
      });
    }
    const company = await resolveCompany(req);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company profile not found",
      });
    }
      await imageQueue.add("upload-image", {
      file: logo,
      targetType: "company",
      targetId: company._id.toString(),
    });

    return res.status(200).json({
      success: true,
      message: "Company logo updated successfully",
      logo: company.logo,
      companyId: company._id,
    });
  } catch (error) {
    console.error("Update company logo error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating company logo",
      error: error.message,
    });
  }
}

// 4. Get Public Company Profile (Publicly accessible, e.g. for candidates)
async function getPublicCompanyProfile(req, res) {
  try {
    const { id } = req.params;

    // Check Redis cache first
    const cachedProfile = await connectRedis.get(`company:${id}:publicProfile`);
    if (cachedProfile) {
      const parsed = JSON.parse(cachedProfile);
      return res.status(200).json({
        success: true,
        message: "Public company profile retrieved successfully",
        company: parsed.company || parsed,
        openJobs: parsed.openJobs || [],
      });
    }

    const company = await Company.findOne({ _id: id, isActive: true }).select(
      "name industry companySize description website logo location createdAt"
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found or inactive",
      });
    }

    // Fetch open jobs posted by this company
    const openJobs = await Job.find({ companyId: company._id, status: "open" })
      .select("title description requirements skillsRequired experienceLevel jobType location salaryRange deadline createdAt")
      .sort({ createdAt: -1 });

      //Set Redis cache with 1-hour expiry
      await connectRedis.set(
        `company:${company._id}:publicProfile`,
        JSON.stringify({
          company,
          openJobs,
        }),
        "EX",
        3600
      );

    return res.status(200).json({
      success: true,
      message: "Public company profile retrieved successfully",
      company,
      openJobs,
    });
  } catch (error) {
    console.error("Get public company profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching public company profile",
      error: error.message,
    });
  }
}


module.exports = {
  resolveCompany,
  getCompanyProfile,
  updateCompanyProfile,
  updateCompanyLogo,
  getPublicCompanyProfile,
};
