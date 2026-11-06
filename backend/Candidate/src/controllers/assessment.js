const Assessment = require("../models/assessment");
const { generateAssessmentForJob, generateAiEvaluationSummary } = require("../service/aimodels");

// 1. Get Assessment Details by ID (Without sensitive answer keys)
async function getAssessmentById(req, res) {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findById(id).select(
      "-questions.correctAnswer -questions.explanation"
    );
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }
    return res.status(200).json({
      message: "Assessment details retrieved successfully",
      assessment,
    });
  } catch (error) {
    console.error("Get assessment by id error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// 2. Get Assessment by Job ID (Auto-generates if not exists)
async function getAssessmentByJob(req, res) {
  try {
    const { jobId } = req.params;

    let assessment = await Assessment.findOne({ jobId, isActive: true }).select(
      "-questions.correctAnswer -questions.explanation"
    );

    if (!assessment) {
      return res.status(404).json({
        message: "No active assessment found for this job. It may not have been generated yet.",
        hint: "Use POST /assessment/generate/:jobId to trigger AI generation.",
      });
    }

    return res.status(200).json({
      message: "Assessment details retrieved successfully",
      totalQuestions: assessment.questions?.length,
      policy: assessment.policy,
      assessment,
    });
  } catch (error) {
    console.error("Get assessment by job error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// 3. Get Assessment Policy & Instructions (Before candidate begins test)
async function getAssessmentPolicy(req, res) {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findById(id).select("policy description targetSkills jobTitle");
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }
    return res.status(200).json({
      message: "Assessment policy retrieved successfully",
      jobTitle: assessment.jobTitle,
      targetSkills: assessment.targetSkills,
      policy: assessment.policy,
    });
  } catch (error) {
    console.error("Get assessment policy error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// 4. AI Generate Assessment for a Job using Gemini 2.0 Flash
//    Called by Recruiter service (via Kafka) or directly for a job
async function generateAssessment(req, res) {
  try {
    const { jobId } = req.params;

    const assessment = await generateAssessmentForJob(jobId);

    return res.status(201).json({
      message: `AI Assessment generated successfully with ${assessment.questions.length} MCQs`,
      assessmentId: assessment._id,
      jobTitle: assessment.jobTitle,
      totalQuestions: assessment.questions.length,
      policy: assessment.policy,
      targetSkills: assessment.targetSkills,
      isAiGenerated: assessment.isAiGenerated,
    });
  } catch (error) {
    console.error("Generate assessment error:", error);
    return res.status(500).json({ message: "Failed to generate assessment", error: error.message });
  }
}

// 5. AI Evaluate Submission (strengths, weaknesses, role fit score)
async function evaluateSubmission(req, res) {
  try {
    const { jobId, skills, experienceLevel, score, totalMarks, percentage, responses } = req.body;

    if (score === undefined || totalMarks === undefined || percentage === undefined) {
      return res.status(400).json({ message: "score, totalMarks, and percentage are required" });
    }

    const evaluation = await generateAiEvaluationSummary({
      jobTitle: req.body.jobTitle || "Software Engineer",
      skills: skills || [],
      experienceLevel: experienceLevel || "mid",
      score,
      totalMarks,
      percentage,
      responses: responses || [],
    });

    return res.status(200).json({
      message: "AI Evaluation generated successfully",
      evaluation,
    });
  } catch (error) {
    console.error("Evaluate submission error:", error);
    return res.status(500).json({ message: "Failed to generate evaluation", error: error.message });
  }
}

module.exports = {
  getAssessmentById,
  getAssessmentByJob,
  getAssessmentPolicy,
  generateAssessment,
  evaluateSubmission,
};
