const AssessmentSubmission = require("../models/Submission");
const Assessment = require("../models/assessment");
const Application = require("../models/application");

// 1. Start Assessment Submission Session
async function startSubmission(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { assessmentId, applicationId, cameraGranted, micGranted } = req.body;

    if (!assessmentId || !applicationId) {
      return res.status(400).json({ message: "assessmentId and applicationId are required" });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    let submission = await AssessmentSubmission.findOne({ applicationId, candidateId });

    if (!submission) {
      const durationMs = (assessment.policy?.durationMinutes || 45) * 60 * 1000;
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + durationMs);

      submission = new AssessmentSubmission({
        assessmentId,
        applicationId,
        candidateId,
        jobId: assessment.jobId,
        companyId: assessment.companyId,
        currentQuestionIndex: 1,
        status: "in_progress",
        startedAt,
        expiresAt,
        proctoring: {
          cameraGranted: !!cameraGranted,
          micGranted: !!micGranted,
          tabSwitchCount: 0,
          violations: [],
        },
      });

      await submission.save();

      // Update application status
      await Application.findByIdAndUpdate(applicationId, {
        status: "assessment",
        assessmentId,
      });
    } else if (submission.status === "completed" || submission.status === "auto_submitted") {
      return res.status(400).json({ message: "Assessment has already been submitted", submission });
    }

    return res.status(200).json({
      message: "Assessment submission started successfully",
      submissionId: submission._id,
      currentQuestionIndex: submission.currentQuestionIndex,
      expiresAt: submission.expiresAt,
      totalQuestions: assessment.questions.length,
    });
  } catch (error) {
    console.error("Start submission error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// 2. Get Current Question (Linear progression - candidate only gets current question)
async function getCurrentQuestion(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { submissionId } = req.params;

    const submission = await AssessmentSubmission.findOne({ _id: submissionId, candidateId });
    if (!submission) {
      return res.status(404).json({ message: "Assessment submission not found" });
    }

    if (submission.status !== "in_progress") {
      return res.status(400).json({ message: "Assessment is not in progress", status: submission.status });
    }

    // Expiry check
    if (new Date() > new Date(submission.expiresAt)) {
      submission.status = "expired";
      submission.submittedAt = new Date();
      submission.proctoring.autoSubmitted = true;
      submission.proctoring.autoSubmitReason = "time_expired";
      await submission.save();
      return res.status(400).json({ message: "Assessment time has expired", submission });
    }

    const assessment = await Assessment.findById(submission.assessmentId);
    const question = assessment.questions.find((q) => q.questionIndex === submission.currentQuestionIndex);

    if (!question) {
      return res.status(200).json({ message: "No more questions. Test is ready to complete.", isFinished: true });
    }

    return res.status(200).json({
      message: "Current question retrieved",
      question: {
        questionIndex: question.questionIndex,
        questionText: question.questionText,
        questionType: question.questionType,
        options: question.options,
        marks: question.marks,
        totalQuestions: assessment.questions.length,
      },
    });
  } catch (error) {
    console.error("Get current question error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// 3. Submit Answer for Current Question & Advance Pointer (Cannot go back)
async function submitAnswer(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { submissionId, selectedOption, timeSpentSeconds } = req.body;

    const submission = await AssessmentSubmission.findOne({ _id: submissionId, candidateId });
    if (!submission) {
      return res.status(404).json({ message: "Assessment submission not found" });
    }

    if (submission.status !== "in_progress") {
      return res.status(400).json({ message: "Assessment is not active" });
    }

    const assessment = await Assessment.findById(submission.assessmentId);
    const question = assessment.questions.find((q) => q.questionIndex === submission.currentQuestionIndex);

    if (!question) {
      return res.status(400).json({ message: "Invalid question index" });
    }

    const isCorrect = selectedOption === question.correctAnswer;
    const marksObtained = isCorrect ? question.marks : 0;

    submission.responses.push({
      questionIndex: question.questionIndex,
      selectedOption: selectedOption || null,
      isCorrect,
      marksObtained,
      timeSpentSeconds: timeSpentSeconds || 0,
      answeredAt: new Date(),
    });

    // Advance pointer strictly
    submission.currentQuestionIndex += 1;

    // Check if test is completed
    const isCompleted = submission.currentQuestionIndex > assessment.questions.length;
    if (isCompleted) {
      submission.status = "completed";
      submission.submittedAt = new Date();
      submission.totalMarksObtained = submission.responses.reduce((sum, r) => sum + r.marksObtained, 0);
      const totalMarks = assessment.policy?.totalMarks || 100;
      submission.percentage = (submission.totalMarksObtained / totalMarks) * 100;
      submission.isPassed = submission.totalMarksObtained >= (assessment.policy?.passingMarks || 60);

      // Update Application
      await Application.findByIdAndUpdate(submission.applicationId, {
        status: "assessment_submitted",
        assessmentScore: submission.totalMarksObtained,
        assessmentPassed: submission.isPassed,
        assessmentCompletedAt: new Date(),
      });

      // Publish Kafka Event: APPLICATION_STATUS_UPDATED
      try {
        const { publishEvent } = require("../service/kafka/Producer");
        await publishEvent(
          "application-status-events",
          {
            eventType: "APPLICATION_STATUS_UPDATED",
            payload: {
              applicationId: submission.applicationId,
              candidateId,
              status: "assessment_submitted",
              assessmentScore: submission.totalMarksObtained,
              assessmentPassed: submission.isPassed,
            },
          },
          submission.applicationId
        );
      } catch (kErr) {
        console.warn("Kafka assessment completion event failed:", kErr.message);
      }
    }

    await submission.save();

    return res.status(200).json({
      message: isCompleted ? "Assessment completed successfully" : "Answer recorded. Moving to next question.",
      isCompleted,
      nextQuestionIndex: isCompleted ? null : submission.currentQuestionIndex,
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// 4. Log Anti-Cheating & Proctoring Violation (Auto-submit on tab/browser switch)
async function logViolation(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { submissionId, violationType, details, snapshotUrl } = req.body;

    const submission = await AssessmentSubmission.findOne({ _id: submissionId, candidateId });
    if (!submission) {
      return res.status(404).json({ message: "Assessment submission not found" });
    }

    const assessment = await Assessment.findById(submission.assessmentId);
    const maxSwitches = assessment?.policy?.maxAllowedTabSwitches ?? 0;

    if (violationType === "tab_switch" || violationType === "browser_changed") {
      submission.proctoring.tabSwitchCount += 1;
    }

    submission.proctoring.violations.push({
      violationType,
      details: details || "Proctoring anomaly detected",
      snapshotUrl: snapshotUrl || "",
      timestamp: new Date(),
    });

    // Auto submit if tab switch threshold exceeded
    if (submission.proctoring.tabSwitchCount > maxSwitches) {
      submission.status = "auto_submitted";
      submission.submittedAt = new Date();
      submission.proctoring.autoSubmitted = true;
      submission.proctoring.autoSubmitReason = "tab_switched";

      submission.totalMarksObtained = submission.responses.reduce((sum, r) => sum + r.marksObtained, 0);
      const totalMarks = assessment.policy?.totalMarks || 100;
      submission.percentage = (submission.totalMarksObtained / totalMarks) * 100;
      submission.isPassed = submission.totalMarksObtained >= (assessment.policy?.passingMarks || 60);

      await Application.findByIdAndUpdate(submission.applicationId, {
        status: "assessment_submitted",
        assessmentScore: submission.totalMarksObtained,
        assessmentPassed: submission.isPassed,
        assessmentCompletedAt: new Date(),
      });

      // Publish Kafka Event: APPLICATION_STATUS_UPDATED
      try {
        const { publishEvent } = require("../service/kafka/Producer");
        await publishEvent(
          "application-status-events",
          {
            eventType: "APPLICATION_STATUS_UPDATED",
            payload: {
              applicationId: submission.applicationId,
              candidateId,
              status: "assessment_submitted",
              assessmentScore: submission.totalMarksObtained,
              assessmentPassed: submission.isPassed,
            },
          },
          submission.applicationId
        );
      } catch (kErr) {
        console.warn("Kafka assessment auto-submit event failed:", kErr.message);
      }

      await submission.save();

      return res.status(200).json({
        message: "Assessment auto-submitted due to policy violation",
        autoSubmitted: true,
        submission,
      });
    }

    await submission.save();
    return res.status(200).json({
      message: "Violation recorded",
      tabSwitchCount: submission.proctoring.tabSwitchCount,
    });
  } catch (error) {
    console.error("Log violation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// 5. Get Submission Result
async function getSubmissionResult(req, res) {
  try {
    const candidateId = req.candidate._id;
    const { submissionId } = req.params;

    const submission = await AssessmentSubmission.findOne({ _id: submissionId, candidateId });
    if (!submission) {
      return res.status(404).json({ message: "Assessment submission not found" });
    }

    return res.status(200).json({
      message: "Assessment result retrieved successfully",
      result: {
        submissionId: submission._id,
        status: submission.status,
        totalMarksObtained: submission.totalMarksObtained,
        percentage: submission.percentage,
        isPassed: submission.isPassed,
        autoSubmitted: submission.proctoring.autoSubmitted,
        autoSubmitReason: submission.proctoring.autoSubmitReason,
        startedAt: submission.startedAt,
        submittedAt: submission.submittedAt,
        aiEvaluationSummary: submission.aiEvaluationSummary,
      },
    });
  } catch (error) {
    console.error("Get submission result error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// 6. Get All Submissions of Logged-In Candidate
async function getMySubmissions(req, res) {
  try {
    const candidateId = req.candidate._id;
    const submissions = await AssessmentSubmission.find({ candidateId })
      .populate("assessmentId", "title policy")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Candidate submissions retrieved successfully",
      submissions,
    });
  } catch (error) {
    console.error("Get my submissions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  startSubmission,
  getCurrentQuestion,
  submitAnswer,
  logViolation,
  getSubmissionResult,
  getMySubmissions,
};
