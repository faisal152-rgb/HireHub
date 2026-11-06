const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    companyLogo: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      required: true,
      trim: true,
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
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
    },
    assessmentRequired: {
      type: Boolean,
      default: true,
    },
    policy: {
      totalQuestions: {
        type: Number,
        default: 50,
      },
      durationMinutes: {
        type: Number,
        default: 45,
      },
      totalMarks: {
        type: Number,
        default: 50,
      },
      passingMarks: {
        type: Number,
        default: 25,
      },
      requireCamera: {
        type: Boolean,
        default: true,
      },
      requireMic: {
        type: Boolean,
        default: true,
      },
      maxAllowedTabSwitches: {
        type: Number,
        default: 0,
      },
    },
    termsAndConditions: {
      type: String,
      default: "By submitting this application, I confirm that all provided information is accurate and I agree to the hiring terms and anti-cheating assessment policies.",
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
      enum: ["open", "closed", "draft", "paused", "active"],
      default: "open",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ companyId: 1, status: 1 });
jobSchema.index({ title: "text", description: "text", skillsRequired: "text" });

module.exports = mongoose.model("Job", jobSchema);
