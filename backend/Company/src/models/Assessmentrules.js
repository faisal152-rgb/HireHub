const mongoose = require("mongoose");

const assessmentRulesSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      default: "AI Assessment Rules",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    totalQuestions: {
      type: Number,
      required: true,
      default: 50, // 50 MCQs
    },

    durationMinutes: {
      type: Number,
      required: true,
      default: 45, // 45 minutes
    },

    totalMarks: {
      type: Number,
      required: true,
      default: 50,
    },

    passingMarks: {
      type: Number,
      required: true,
      default: 25, // 50% passing threshold
    },

    allowedAttempts: {
      type: Number,
      default: 1,
    },

    linearNavigationOnly: {
      type: Boolean,
      default: true, // Candidate cannot go back once question submitted
    },

    // Anti-Cheating & Proctoring Rules
    proctoring: {
      requireCamera: {
        type: Boolean,
        default: true,
      },
      requireMic: {
        type: Boolean,
        default: true,
      },
      fullScreenMode: {
        type: Boolean,
        default: true,
      },
      maxAllowedTabSwitches: {
        type: Number,
        default: 0, // 0 = zero tolerance, triggers violation
      },
      autoSubmitOnViolation: {
        type: Boolean,
        default: true,
      },
      detectMultipleFaces: {
        type: Boolean,
        default: true,
      },
    },

    skillCategories: [
      {
        type: String,
        trim: true,
      },
    ],

    difficultyDistribution: {
      easy: {
        type: Number,
        default: 30, // 30%
      },
      medium: {
        type: Number,
        default: 50, // 50%
      },
      hard: {
        type: Number,
        default: 20, // 20%
      },
    },

    instructions: {
      type: String,
      default: "Please ensure your camera and microphone are turned on and do not switch browser tabs during the test.",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

assessmentRulesSchema.index({ jobId: 1, isActive: 1 });

module.exports = mongoose.model("AssessmentRules", assessmentRulesSchema);
