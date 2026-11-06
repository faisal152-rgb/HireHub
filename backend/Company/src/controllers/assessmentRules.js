const AssessmentRules = require("../models/Assessmentrules");
const Job = require("../models/Job");
const { publishEvent } = require("../service/kafka/Producer");
const notificationQueue = require("../queues/notificationQueue");
//  Redia 
const connectRedis = require("../config/redis");

// 1. Create or Set Assessment Rules for a Job
async function setAssessmentRules(req, res) {
  try {
    const recruiterId = req.user._id;
    const {
      jobId,
      title,
      description,
      totalQuestions = 50,
      durationMinutes = 45,
      totalMarks = 50,
      passingMarks = 25,
      linearNavigationOnly = true,
      proctoring,
      skillCategories,
      difficultyDistribution,
      instructions,
    } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const rules = await AssessmentRules.findOneAndUpdate(
      { jobId },
      {
        jobId,
        companyId: job.companyId,
        recruiterId,
        title: title || `${job.title} Assessment Rules`,
        description: description || "",
        totalQuestions,
        durationMinutes,
        totalMarks,
        passingMarks,
        linearNavigationOnly,
        proctoring: proctoring || {
          requireCamera: true,
          requireMic: true,
          fullScreenMode: true,
          maxAllowedTabSwitches: 0,
          autoSubmitOnViolation: true,
          detectMultipleFaces: true,
        },
        skillCategories: skillCategories || job.skillsRequired || [],
        difficultyDistribution: difficultyDistribution || {
          easy: 30,
          medium: 50,
          hard: 20,
        },
        instructions: instructions || "Please ensure camera and mic are granted. Tab switching will auto-submit.",
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update job's policy as well so it is synced
    job.policy = {
      totalQuestions,
      durationMinutes,
      passingMarks,
      requireCamera: rules.proctoring.requireCamera,
      requireMic: rules.proctoring.requireMic,
      maxAllowedTabSwitches: rules.proctoring.maxAllowedTabSwitches,
    };
    await job.save();

    // Broadcast updated job policy via Kafka
    await publishEvent("job-events", {
      eventType: "JOB_UPDATED",
      payload: {
        jobId: job._id,
        policy: job.policy,
      },
    }, job._id);

    // Create notification
    try {
      await notificationQueue.add("sendNotification", {
        recruiterId,
        type: "assessment_rules_set",
        title: "Assessment Rules Set",
        message: `Assessment rules for "${job.title}" have been configured and synced with the job.`,
        referenceId: job._id,
        data: {
          jobId: job._id,
          rulesId: rules._id,
          totalQuestions,
          passingMarks,
        },
      });
    } catch (notifErr) {
      console.warn("Notification error (set rules):", notifErr.message);
    }
    // Delete Redis cache for this job
    if (rules.jobId) {
      await connectRedis.del(`job:${rules.jobId}:rules`);
    }

    return res.status(200).json({
      message: "Assessment rules configured successfully and synced with job",
      rules,
    });
  } catch (error) {
    console.error("Set assessment rules error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 2. Get Assessment Rules by Job ID
async function getRulesByJob(req, res) {
  try {
    const { jobId } = req.params;
    // Check Redis cache first
    const cachedRules = await connectRedis.get(`job:${jobId}:rules`);
    if (cachedRules) {
      return res.status(200).json({
        message: "Assessment rules retrieved successfully",
        rules: JSON.parse(cachedRules),
      });
    }

    const rules = await AssessmentRules.findOne({ jobId, isActive: true });
    if (!rules) {
      return res.status(404).json({ message: "No active assessment rules found for this job" });
    }
    // Set Redis cache with 1-hour expiry
    await connectRedis.set(
      `job:${jobId}:rules`,
      JSON.stringify(rules),
      "EX",
      3600
    );

    return res.status(200).json({
      message: "Assessment rules retrieved successfully",
      rules,
    });
  } catch (error) {
    console.error("Get rules by job error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// 3. Update Assessment Rules by ID
async function updateRules(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const rules = await AssessmentRules.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!rules) {
      return res.status(404).json({ message: "Assessment rules not found" });
    }

    // Send notification for rules update
    try {
      await notificationQueue.add("sendNotification", {
        recruiterId: req.user?._id || rules.recruiterId,
        type: "assessment_rules_updated",
        title: "Assessment Rules Updated",
        message: `Assessment rules for "${rules.title || "Job"}" have been updated successfully.`,
        referenceId: rules.jobId,
        data: {
          rulesId: rules._id,
          jobId: rules.jobId,
        },
      });
    } catch (notifErr) {
      console.warn("Notification error (update rules):", notifErr.message);
    }
    // Delete Redis cache for this job
    if (rules.jobId) {
      await connectRedis.del(`job:${rules.jobId}:rules`);
    }

    return res.status(200).json({
      message: "Assessment rules updated successfully",
      rules,
    });
  } catch (error) {
    console.error("Update assessment rules error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

module.exports = {
  setAssessmentRules,
  getRulesByJob,
  updateRules,
};
