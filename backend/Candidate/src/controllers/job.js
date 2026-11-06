const Job = require("../models/job");

// 1. Get all available/open jobs for candidates
async function getAllJobs(req, res) {
  try {
    const { search, jobType, experienceLevel, location, page = 1, limit = 10 } = req.query;

    const filter = { status: "open" };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { skillsRequired: { $in: [new RegExp(search, "i")] } },
      ];
    }

    if (jobType) {
      filter.jobType = jobType;
    }

    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Job.countDocuments(filter);
    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      message: "Jobs retrieved successfully",
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      jobs,
    });
  } catch (error) {
    console.error("Get all jobs error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2. Get Single Job Details by ID
async function getJobById(req, res) {
  try {
    const { id } = req.params;
    const job = await Job.findById(id).populate("assessmentId");

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    return res.status(200).json({
      message: "Job details retrieved successfully",
      job,
    });
  } catch (error) {
    console.error("Get job by id error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

module.exports = {
  getAllJobs,
  getJobById,
};
