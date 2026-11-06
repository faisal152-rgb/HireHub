const mongoose = require("mongoose");

const coverLetterSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "Standard Cover Letter",
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CoverLetter", coverLetterSchema);
