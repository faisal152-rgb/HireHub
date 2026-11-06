const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    companyLogo: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: [
      {
        type: String,
        trim: true,
      },
    ],
    skillsRequired: [
      {
        type: String,
        trim: true,
      },
    ],
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior", "lead", "any"],
      default: "any",
    },
    jobType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship", "remote", "hybrid", "on_site"],
      default: "full_time",
    },
    location: {
      type: String,
      trim: true,
      default: "Remote",
    },
    salaryRange: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: "USD",
      },
    },
    applicationsCount: {
      type: Number,
      default: 0,
    },
    deadline: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["open", "closed", "draft"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

jobSchema.index({ companyId: 1, status: 1 });
jobSchema.index({ recruiterId: 1, status: 1 });

module.exports = mongoose.models.Job || mongoose.model("Job", jobSchema);
