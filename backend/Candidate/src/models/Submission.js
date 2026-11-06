const mongoose = require("mongoose");

const assessmentSubmissionSchema = new mongoose.Schema(
  {
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
      index: true,
    },

    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },

    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },

    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Strict Linear Progress Pointer (Candidate cannot go back to previous questions)
    currentQuestionIndex: {
      type: Number,
      default: 1,
    },

    // Candidate Answers per Question
    responses: [
      {
        questionIndex: {
          type: Number,
          required: true,
        },
        selectedOption: {
          type: String,
          default: null,
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
        marksObtained: {
          type: Number,
          default: 0,
        },
        timeSpentSeconds: {
          type: Number,
          default: 0,
        },
        answeredAt: {
          type: Date,
        },
      },
    ],

    // Anti-Cheating & Proctoring Monitoring
    proctoring: {
      cameraGranted: {
        type: Boolean,
        default: false,
      },
      micGranted: {
        type: Boolean,
        default: false,
      },
      tabSwitchCount: {
        type: Number,
        default: 0,
      },
      violations: [
        {
          violationType: {
            type: String,
            enum: [
              "tab_switch",
              "window_blur",
              "fullscreen_exit",
              "multiple_faces",
              "face_not_detected",
              "audio_anomaly",
              "browser_changed",
            ],
            required: true,
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
          details: {
            type: String,
            trim: true,
          },
          snapshotUrl: {
            type: String,
            default: "",
          },
        },
      ],
      autoSubmitted: {
        type: Boolean,
        default: false,
      },
      autoSubmitReason: {
        type: String,
        enum: [
          "none",
          "tab_switched",
          "browser_switch",
          "time_expired",
          "proctoring_violation_limit",
          "manual_completion",
        ],
        default: "none",
      },
    },

    // Test Status & Evaluation
    status: {
      type: String,
      enum: [
        "not_started",
        "in_progress",
        "completed",
        "auto_submitted",
        "disqualified",
        "expired",
      ],
      default: "not_started",
    },

    totalMarksObtained: {
      type: Number,
      default: 0,
    },

    percentage: {
      type: Number,
      default: 0,
    },

    isPassed: {
      type: Boolean,
      default: false,
    },

    aiEvaluationSummary: {
      strengths: [String],
      weaknesses: [String],
      feedback: String,
      recommendedRoleFitScore: Number, // 0-100
    },

    startedAt: {
      type: Date,
    },

    submittedAt: {
      type: Date,
    },

    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

assessmentSubmissionSchema.index({ applicationId: 1, candidateId: 1 }, { unique: true });
assessmentSubmissionSchema.index({ candidateId: 1, status: 1 });

module.exports = mongoose.model("AssessmentSubmission", assessmentSubmissionSchema);
