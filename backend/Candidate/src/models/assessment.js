const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    jobTitle: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },
    

    // Policy & Test Rules (Configured by Recruiter / Job settings)
    policy: {
      totalMarks: {
        type: Number,
        default: 100, // e.g. 50 or 100
      },
      passingMarks: {
        type: Number,
        default: 60,
      },
      durationMinutes: {
        type: Number,
        default: 45, // Total allowed test time in minutes
      },
      totalQuestions: {
        type: Number,
        default: 20,
      },
      requireCamera: {
        type: Boolean,
        default: true,
      },
      requireMic: {
        type: Boolean,
        default: true,
      },
      linearNavigationOnly: {
        type: Boolean,
        default: true, // Candidate cannot go back once an MCQ is submitted
      },
      maxAllowedTabSwitches: {
        type: Number,
        default: 0, // 0 means any tab switch triggers violation/auto-submit
      },
    },

    // AI-Generated Questions
    questions: [
      {
        questionIndex: {
          type: Number,
          required: true,
        },
        questionText: {
          type: String,
          required: true,
          trim: true,
        },
        questionType: {
          type: String,
          enum: ["mcq", "multiple_choice", "code_analysis", "short_answer"],
          default: "mcq",
        },
        options: [
          {
            optionId: {
              type: String,
              required: true,
            },
            text: {
              type: String,
              required: true,
            },
          },
        ],
        correctAnswer: {
          type: String, // Kept secure on backend for grading
          required: true,
        },
        marks: {
          type: Number,
          default: 5,
        },
        skillTested: {
          type: String,
          trim: true,
        },
        difficulty: {
          type: String,
          enum: ["easy", "medium", "hard"],
          default: "medium",
        },
        explanation: {
          type: String,
          trim: true,
        },
      },
    ],

    targetSkills: [
      {
        type: String,
        trim: true,
      },
    ],

    isAiGenerated: {
      type: Boolean,
      default: true,
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

assessmentSchema.index({ jobId: 1, companyId: 1 });

module.exports = mongoose.model("Assessment", assessmentSchema);
