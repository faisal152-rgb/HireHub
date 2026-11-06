const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["superadmin", "admin", "moderator"],
      default: "admin",
      index: true,
    },
    permissions: [
      {
        type: String,
        enum: [
          "all",
          "manage_users",
          "manage_recruiters",
          "manage_jobs",
          "manage_applications",
          "view_analytics",
          "manage_settings",
        ],
        default: ["view_analytics", "manage_users", "manage_recruiters", "manage_jobs"],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Admin", adminSchema);
