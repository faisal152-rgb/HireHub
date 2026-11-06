const mongoose = require("mongoose");

const candidateProfile = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
    },
    email:{
      type: String,
      trim: true,
    },
    

    profile: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    location: {
      type: String,
      trim: true,
    },

    skills: [
      {
        type: String,
        trim: true,
      },
    ],

    education: [
      {
        degree: {
          type: String,
          trim: true,
        },
        institution: {
          type: String,
          trim: true,
        },
        field: {
          type: String,
          trim: true,
        },
        grade: {
          type: String,
          trim: true,
        },
        isCurrent: {
          type: Boolean,
          default: false,
        },
        startDate: Date,
        endDate: Date,
      },
    ],

    experience: [
      {
        title: {
          type: String,
          trim: true,
        },
        company: {
          type: String,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        startDate: Date,
        endDate: Date,
        isCurrent: {
          type: Boolean,
          default: false,
        },
      },
    ],

    resume: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      }
    },

    portfolioUrl: {
      type: String,
      trim: true,
      default: "",
    },

    githubUrl: {
      type: String,
      trim: true,
      default: "",
    },

    linkedinUrl: {
      type: String,
      trim: true,
      default: "",
    },

    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CandidateProfile", candidateProfile);
