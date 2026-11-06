const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\+?[0-9\s\-()]{7,20}$/, "Please enter a valid phone number"]
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    industry: {
      type: String,
      required: true,
      enum: [
        "Technology",
        "E-commerce",
        "Education",
        "Healthcare",
        "Finance",
        "Manufacturing",
        "Hospitality",
        "Government",
        "Recruitment",
        "Other"
      ],
      default: "Technology",
    },
    companySize: {
      type: String,
      required: true,
      default: "1-50",
    },
    role: {
      type: String,
      default: "company",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
    logo: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "Remote",
    },
    // Unique invite code used in Invite Link and QR Code for recruiters to join
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    // Array of Recruiters added/linked under this company
    recruiters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recruiter",
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Auto-generate inviteCode and hash password before saving
companySchema.pre("save", async function () {
  // Generate unique inviteCode if not set
  if (!this.inviteCode) {
    this.inviteCode = `COMP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  }

  // Hash password if modified
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
companySchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate a fresh new invite code
companySchema.methods.regenerateInviteCode = function () {
  this.inviteCode = `COMP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  return this.inviteCode;
};

module.exports = mongoose.model("Company", companySchema);
