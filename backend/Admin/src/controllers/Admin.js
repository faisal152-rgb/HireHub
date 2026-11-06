const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const Notification = require("../models/Notification");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Recruiter = require("../models/Recruiter");
const User = require("../models/User");

const getdashboard = async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments();
    const totalApplications = await Application.countDocuments();
    const totalRecruiters = await Recruiter.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalAdmins = await Admin.countDocuments();

    const activeJobs = await Job.countDocuments({ status: "active" });
    const pendingJobs = await Job.countDocuments({ status: "pending" });
    const closedJobs = await Job.countDocuments({ status: "closed" });

    const shortlistedApplications = await Application.countDocuments({
      status: "shortlisted",
    });
    const interviewApplications = await Application.countDocuments({
      status: "interview",
    });
    const rejectedApplications = await Application.countDocuments({
      status: "rejected",
    });

    const recruiterStats = await Recruiter.aggregate([
      {
        $lookup: {
          from: "jobs",
          localField: "_id",
          foreignField: "recruiter",
          as: "jobs",
        },
      },
      {
        $addFields: {
          activeJobs: {
            $size: {
              $filter: {
                input: "$jobs",
                as: "job",
                cond: { $eq: ["$$job.status", "active"] },
              },
            },
          },
          totalApplications: {
            $size: {
              $filter: {
                input: "$jobs",
                as: "job",
                cond: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$$job.applications",
                          as: "app",
                          cond: { $ne: ["$$app.status", "applied"] },
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $sort: { activeJobs: -1 },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          company: 1,
          activeJobs: 1,
          totalApplications: 1,
          createdAt: 1,
        },
      },
    ]);

    const jobStats = await Job.aggregate([
      {
        $lookup: {
          from: "jobapplications",
          localField: "_id",
          foreignField: "job",
          as: "applications",
        },
      },
      {
        $addFields: {
          applicationCount: { $size: "$applications" },
          shortlistedCount: {
            $size: {
              $filter: {
                input: "$applications",
                as: "app",
                cond: { $eq: ["$$app.status", "shortlisted"] },
              },
            },
          },
          interviewCount: {
            $size: {
              $filter: {
                input: "$applications",
                as: "app",
                cond: { $eq: ["$$app.status", "interview"] },
              },
            },
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          _id: 1,
          title: 1,
          status: 1,
          applicationCount: 1,
          shortlistedCount: 1,
          interviewCount: 1,
          createdAt: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalJobs,
        totalApplications,
        totalRecruiters,
        totalUsers,
        activeJobs,
        pendingJobs,
        closedJobs,
        shortlistedApplications,
        interviewApplications,
        rejectedApplications,
        recruiterStats,
        jobStats,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ success: false, error: "Failed to fetch dashboard stats" });
  }
};

const updateprofile= async (req, res) => {
  try {
      const updates = req.body;
      const userId = req.params.userId || req.user?._id || req.user?.id;
      if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ success: false, error: "Invalid admin ID" });
      }
      const admin = await Admin.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (!admin) {
        return res.status(404).json({ success: false, error: "Admin not found" });
      }
    try {
      await Notification.create({
        adminId: userId,
        title: "Your Profile Has Been Updated",
        message: `Your profile has been updated successfully ${admin.name || ""}`,
        type: "update",
        data: {
          admin: admin.name,
        },
      });
    } catch (notifErr) {
      console.warn("Notification creation failed:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      admin: {
        _id: userId,
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        role: updates.role,
        permissions: updates.permissions,
      },
    });
  } catch (error) {
    console.error("Error updating admins:", error);
    res.status(500).json({ success: false, error: "Failed to update admins" });
  }
};


module.exports = {
    getdashboard,
    updateprofile
}


