const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "Default Resume",
    },
    url: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      default: "application/pdf",
    },
    publicId: {
      type: String,
      default: "",
    },
    isDefault: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resume", resumeSchema);
