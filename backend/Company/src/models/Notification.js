const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: [
        "application_received",
        "application_status_updated",
        "job_created",
        "job_deleted",
        "job_status_updated",
        "interview_reminder",
        "interview_scheduled",
        "interview_rescheduled",
        "interview_cancelled",
        "assessment_rules_set",
        "assessment_rules_updated",
        "account_updated",
        "recruiter_added",
        "recruiter_removed",
        "recruiter_status_updated",
        "invitation_sent",
        "system",
      ],
      default: "system",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
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
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
