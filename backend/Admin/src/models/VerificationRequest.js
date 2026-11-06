const mongoose = require("mongoose");

const verificationRequestSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    targetType: {
      type: String,
      enum: ["Recruiter", "Company", "User"],
      default: "Recruiter",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    documents: [
      {
        title: {
          type: String,
          default: "",
        },
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          default: "",
        },
        docType: {
          type: String,
          enum: ["ID_PROOF", "BUSINESS_LICENSE", "TAX_CERTIFICATE", "EMPLOYMENT_LETTER", "OTHER"],
          default: "ID_PROOF",
        },
      },
    ],
    businessDetails: {
      companyName: {
        type: String,
        default: "",
      },
      registrationNumber: {
        type: String,
        default: "",
      },
      taxId: {
        type: String,
        default: "",
      },
      websiteUrl: {
        type: String,
        default: "",
      },
    },
    notes: {
      type: String,
      default: "",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    adminComments: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

verificationRequestSchema.index({ status: 1, createdAt: -1 });

module.exports =
  mongoose.models.VerificationRequest ||
  mongoose.model("VerificationRequest", verificationRequestSchema);
