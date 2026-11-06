const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      default: null,
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      default: null,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      default: null,
    },
    moderatorId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      default: null,
    },
    type: {
      type: String,
      default: "system",
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ adminId: 1, createdAt: -1 });
notificationSchema.index({ recruiterId: 1, createdAt: -1 });
notificationSchema.index({ candidateId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
