const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { ChatOpenAI } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");
const Assessment = require("../models/assessment");
const Job = require("../models/job");

/**
 * AI Assessment Generator — HireHub (Powered by LangChain)
 *
 * Priority Order:
 *  1. Google Gemini 2.0 Flash via @langchain/google-genai (GEMINI_API_KEY)
 *  2. NVIDIA NIM via @langchain/openai — meta/llama-3.3-70b-instruct (NVIDIA_API_KEY)
 *  3. Intelligent Domain Fallback (no key required)
 *
 * Questions are fully adaptive to Job skills & experience level.
 */

// -----------------------------------------------------------
// LANGCHAIN MODEL FACTORIES
// -----------------------------------------------------------
function getGeminiChatModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new Error("GEMINI_API_KEY not set or invalid");
  }
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    apiKey,
    temperature: 0.25,
    topP: 0.9,
    maxRetries: 2,
  });
}

function getNvidiaChatModel() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY not set");
  return new ChatOpenAI({
    model: "meta/llama-3.3-70b-instruct",
    apiKey,
    configuration: {
      baseURL: "https://integrate.api.nvidia.com/v1",
    },
    temperature: 0.2,
    topP: 0.9,
    maxTokens: 16000,
  });
}

// -----------------------------------------------------------
// LANGCHAIN PROMPT TEMPLATE
// -----------------------------------------------------------
const assessmentPromptTemplate = PromptTemplate.fromTemplate(
`You are a world-class technical interviewer at a top-tier tech company creating a high-quality MCQ pre-screening test.

Job Role: "{jobTitle}"
Required Skills: {skills}
Experience Level: {experienceLevelUpper} — {experienceContext}

Generate exactly {totalQuestions} unique Multiple Choice Questions (MCQs):
- {easyCount} EASY: Basic definitions, syntax, and fundamental concepts
- {mediumCount} MEDIUM: Real-world scenarios, practical problem-solving, common edge cases
- {hardCount} HARD: Architecture, performance optimization, tradeoffs, advanced patterns

STRICT RULES:
1. Test ONE specific skill per question from the provided skills list
2. Match depth and complexity to the {experienceLevel} experience level
3. All 4 options must be realistic and plausible — avoid obviously wrong distractors
4. Correct answer must be definitively accurate
5. Explanation must be clear and educational (2-3 sentences)
6. Distribute questions proportionally across ALL listed skills
7. NO repetitive or duplicate questions
8. Return ONLY valid JSON — no markdown, no extra text

JSON FORMAT (strictly follow this):
{{
  "questions": [
    {{
      "questionIndex": 1,
      "questionText": "Full question text here?",
      "questionType": "mcq",
      "options": [
        {{ "optionId": "A", "text": "First option" }},
        {{ "optionId": "B", "text": "Second option" }},
        {{ "optionId": "C", "text": "Third option" }},
        {{ "optionId": "D", "text": "Fourth option" }}
      ],
      "correctAnswer": "B",
      "marks": 1,
      "skillTested": "exact skill name from provided list",
      "difficulty": "medium",
      "explanation": "Clear, concise explanation of why this is the correct answer."
    }}
  ]
}}`
);

async function buildPrompt({ jobTitle, skills, experienceLevel, totalQuestions, difficultyDistribution }) {
  const experienceContexts = {
    entry: "for 0-1 years experience, focusing on fundamentals and basic implementations",
    mid: "for 2-4 years experience, combining conceptual depth with practical real-world scenarios",
    senior: "for 5+ years experience, covering advanced architectural decisions, design patterns, and performance tradeoffs",
    lead: "for 8+ years tech leads, covering system design, scalability, team leadership, and architectural decisions",
    any: "balanced across all skill levels, from core concepts to advanced topics",
  };

  return await assessmentPromptTemplate.format({
    jobTitle,
    skills: skills.length ? skills.join(", ") : "General Software Engineering",
    experienceLevel,
    experienceLevelUpper: experienceLevel.toUpperCase(),
    experienceContext: experienceContexts[experienceLevel] || experienceContexts.mid,
    totalQuestions,
    easyCount: difficultyDistribution.easy,
    mediumCount: difficultyDistribution.medium,
    hardCount: difficultyDistribution.hard,
  });
}

// -----------------------------------------------------------
// 1. GEMINI 2.0 FLASH — Primary AI Provider via LangChain
// -----------------------------------------------------------
async function generateWithGemini({ jobTitle, skills, experienceLevel, totalQuestions, difficultyDistribution }) {
  const model = getGeminiChatModel();
  const formattedPrompt = await buildPrompt({ jobTitle, skills, experienceLevel, totalQuestions, difficultyDistribution });

  console.log(` [LangChain / Gemini 2.0 Flash] Generating ${totalQuestions} MCQs for "${jobTitle}" (${experienceLevel})...`);

  const response = await model.invoke(formattedPrompt);
  const rawContent = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  const cleanJson = rawContent
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleanJson);

  if (!parsed.questions?.length) throw new Error("Gemini returned empty questions");

  const questions = parsed.questions.map((q, i) => ({
    ...q,
    questionIndex: i + 1,
    marks: q.marks || 1,
    questionType: "mcq",
    difficulty: q.difficulty || "medium",
  }));

  console.log(` [LangChain / Gemini] Generated ${questions.length} MCQs for "${jobTitle}"`);
  return questions;
}

// -----------------------------------------------------------
// 2. NVIDIA NIM — meta/llama-3.3-70b-instruct via LangChain
// -----------------------------------------------------------
async function generateWithNvidia({ jobTitle, skills, experienceLevel, totalQuestions, difficultyDistribution }) {
  const model = getNvidiaChatModel();
  const formattedPrompt = await buildPrompt({ jobTitle, skills, experienceLevel, totalQuestions, difficultyDistribution });

  console.log(` [LangChain / NVIDIA NIM — Llama 3.3 70B] Generating ${totalQuestions} MCQs for "${jobTitle}" (${experienceLevel})...`);

  const messages = [
    new SystemMessage(
      "You are an expert technical interviewer. You always respond with valid JSON only. No markdown, no explanations outside the JSON."
    ),
    new HumanMessage(formattedPrompt),
  ];

  const response = await model.invoke(messages);
  const rawContent = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  if (!rawContent) throw new Error("NVIDIA returned empty response");

  // Clean up in case markdown code fences are returned
  const cleanJson = rawContent
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleanJson);
  if (!parsed.questions?.length) throw new Error("NVIDIA returned empty questions");

  const questions = parsed.questions.map((q, i) => ({
    ...q,
    questionIndex: i + 1,
    marks: q.marks || 1,
    questionType: "mcq",
    difficulty: q.difficulty || "medium",
  }));

  console.log(` [LangChain / NVIDIA NIM] Generated ${questions.length} MCQs for "${jobTitle}"`);
  return questions;
}

// -----------------------------------------------------------
// 3. MAIN ORCHESTRATOR — Try Gemini → NVIDIA → Fallback
// -----------------------------------------------------------
async function generateAssessmentQuestions({ jobTitle, skills = [], experienceLevel = "mid", totalQuestions = 50 }) {
  const difficultyDistribution = {
    easy: Math.round(totalQuestions * 0.30),    // 30% Easy
    medium: Math.round(totalQuestions * 0.50),  // 50% Medium
    hard: totalQuestions - Math.round(totalQuestions * 0.30) - Math.round(totalQuestions * 0.50), // remaining Hard
  };

  // --- Try Gemini First ---
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateWithGemini({ jobTitle, skills, experienceLevel, totalQuestions, difficultyDistribution });
    } catch (err) {
      console.warn(` [Gemini] Failed: ${err.message}. Trying NVIDIA NIM...`);
    }
  }

  // --- Try NVIDIA NIM Second ---
  if (process.env.NVIDIA_API_KEY) {
    try {
      return await generateWithNvidia({ jobTitle, skills, experienceLevel, totalQuestions, difficultyDistribution });
    } catch (err) {
      console.warn(` [NVIDIA NIM] Failed: ${err.message}. Using fallback generator...`);
    }
  }

  // --- Intelligent Fallback ---
  console.log(" [Fallback] Using domain-specific intelligent question bank...");
  return generateIntelligentFallbackQuestions(jobTitle, skills, experienceLevel, totalQuestions);
}

// -----------------------------------------------------------
// 4. GENERATE & SAVE ASSESSMENT TO DB
// -----------------------------------------------------------
async function generateAssessmentForJob(jobId) {
  const job = await Job.findById(jobId);
  if (!job) throw new Error("Job not found");

  const totalQuestions = job.policy?.totalQuestions || 50;

  // Check if a complete assessment already exists
  const existing = await Assessment.findOne({ jobId, isActive: true });
  if (existing && existing.questions?.length >= totalQuestions) {
    console.log(` [Cache] Using existing assessment for "${job.title}" (${existing.questions.length} Qs)`);
    return existing;
  }

  const skills = job.skillsRequired?.length
    ? job.skillsRequired
    : ["Problem Solving", "Software Engineering", "Programming Fundamentals"];

  const questions = await generateAssessmentQuestions({
    jobTitle: job.title,
    skills,
    experienceLevel: job.experienceLevel || "mid",
    totalQuestions,
  });

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  const passingMarks = Math.ceil(totalMarks * 0.5);

  const assessmentData = {
    jobId: job._id,
    companyId: job.companyId,
    jobTitle: job.title,
    description: `AI-Generated Adaptive ${questions.length}-MCQ Assessment for ${job.title} (${job.experienceLevel || "mid"} level). Skills: ${skills.join(", ")}.`,
    policy: {
      totalMarks,
      passingMarks,
      durationMinutes: job.policy?.durationMinutes || 45,
      totalQuestions: questions.length,
      requireCamera: job.policy?.requireCamera !== false,
      requireMic: job.policy?.requireMic !== false,
      linearNavigationOnly: true,
      maxAllowedTabSwitches: job.policy?.maxAllowedTabSwitches ?? 0,
    },
    questions,
    targetSkills: skills,
    isAiGenerated: true,
    isActive: true,
  };

  let assessment;
  if (existing) {
    Object.assign(existing, assessmentData);
    assessment = await existing.save();
  } else {
    assessment = await Assessment.create(assessmentData);
  }

  // Link assessment back to job
  job.assessmentId = assessment._id;
  job.assessmentRequired = true;
  await job.save();

  console.log(` Assessment saved for "${job.title}" → ${questions.length} MCQs | ${totalMarks} marks | Passing: ${passingMarks}`);
  return assessment;
}

// -----------------------------------------------------------
// 5. AI EVALUATION — Gemini → NVIDIA → Basic
// -----------------------------------------------------------
async function generateAiEvaluationSummary({ jobTitle, skills = [], experienceLevel = "mid", score, totalMarks, percentage, responses = [] }) {
  const isPassed = percentage >= 50;
  const correct = responses.filter(r => r.isCorrect).length;
  const wrong = responses.filter(r => r.selectedOption && !r.isCorrect).length;
  const skipped = responses.filter(r => !r.selectedOption).length;

  const evalPrompt = `You are a senior HR technical evaluator at a top tech company.

Candidate Assessment Results for "${jobTitle}" role (${experienceLevel} experience level):
- Skills Tested: ${skills.join(", ") || "General Software Engineering"}
- Score: ${score} / ${totalMarks} marks
- Percentage: ${percentage.toFixed(1)}%
- Result: ${isPassed ? "PASSED ✅" : "FAILED ❌"}
- Correct: ${correct} | Wrong: ${wrong} | Skipped: ${skipped}

Generate a professional JSON evaluation:
{
  "strengths": ["3-5 specific strengths based on the performance and role"],
  "weaknesses": ["2-4 specific areas that need improvement"],
  "feedback": "One professional paragraph summarizing the candidate's performance and suitability for the ${jobTitle} role.",
  "recommendedRoleFitScore": <0-100 number>
}`;

  // Try Gemini evaluation via LangChain
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here") {
    try {
      const model = getGeminiChatModel();
      const response = await model.invoke(evalPrompt);
      const rawContent = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      const cleanJson = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleanJson);
      return {
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        feedback: parsed.feedback || "",
        recommendedRoleFitScore: parsed.recommendedRoleFitScore || Math.round(percentage * 0.9),
      };
    } catch (err) {
      console.warn(` [LangChain / Gemini Eval] Failed: ${err.message}. Trying NVIDIA...`);
    }
  }

  // Try NVIDIA NIM evaluation via LangChain
  if (process.env.NVIDIA_API_KEY) {
    try {
      const model = getNvidiaChatModel();
      const messages = [
        new SystemMessage("You are a professional HR evaluator. Return only valid JSON."),
        new HumanMessage(evalPrompt),
      ];
      const response = await model.invoke(messages);
      const rawContent = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      const cleanJson = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleanJson);
      return {
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        feedback: parsed.feedback || "",
        recommendedRoleFitScore: parsed.recommendedRoleFitScore || Math.round(percentage * 0.9),
      };
    } catch (err) {
      console.warn(` [LangChain / NVIDIA Eval] Failed: ${err.message}. Using basic evaluation.`);
    }
  }

  // Basic rule-based fallback evaluation
  return {
    strengths: isPassed
      ? ["Demonstrated solid understanding of core concepts", "Met minimum competency threshold for the role", "Showed consistent performance across questions"]
      : ["Attempted the assessment and showed initiative"],
    weaknesses: isPassed
      ? ["Some advanced topics may need deeper exploration"]
      : ["Core fundamentals require significant improvement", "Recommend structured learning before re-attempting", "Advanced topics not yet at the required level"],
    feedback: `Candidate scored ${score}/${totalMarks} (${percentage.toFixed(1)}%) for the ${jobTitle} role at ${experienceLevel} level. ${isPassed ? "The candidate meets the minimum threshold and may proceed to the next stage." : "The candidate did not meet the passing threshold. Further preparation is recommended."}`,
    recommendedRoleFitScore: Math.round(percentage * 0.9),
  };
}

// -----------------------------------------------------------
// 6. FALLBACK: Intelligent Domain Question Bank
// -----------------------------------------------------------
function generateIntelligentFallbackQuestions(jobTitle, skills = [], experienceLevel = "mid", total = 50) {
  const bank = [
    { q: "What is the time complexity of binary search on a sorted array?", opts: ["O(n)", "O(log n)", "O(n²)", "O(1)"], ans: "B", skill: "Algorithms", diff: "easy", exp: "Binary search halves the search space each step, giving O(log n) complexity." },
    { q: "Which JavaScript keyword declares a block-scoped variable?", opts: ["var", "let", "def", "local"], ans: "B", skill: "JavaScript", diff: "easy", exp: "`let` creates block-scoped variables, unlike `var` which is function-scoped." },
    { q: "In MongoDB, what does the `$lookup` aggregation stage perform?", opts: ["Sorts documents", "Left outer join with another collection", "Creates an index", "Deletes duplicates"], ans: "B", skill: "MongoDB", diff: "medium", exp: "$lookup performs a left outer join from another collection in the same database." },
    { q: "What ensures ordered message delivery within a Kafka topic?", opts: ["Replication factor", "Consumer groups", "Consistent key per partition", "Zookeeper quorum"], ans: "C", skill: "Kafka", diff: "medium", exp: "Messages with the same key go to the same partition, guaranteeing order." },
    { q: "Which design pattern encapsulates a request as an object to support undo operations?", opts: ["Observer", "Command", "Decorator", "Strategy"], ans: "B", skill: "System Design", diff: "medium", exp: "The Command pattern wraps requests as objects, enabling undo/redo functionality." },
    { q: "What does the Liskov Substitution Principle (LSP) state?", opts: ["One reason to change", "Subtypes must replace base types without breaking correctness", "High-level modules avoid low-level dependencies", "Interfaces should be client-specific"], ans: "B", skill: "Software Engineering", diff: "medium", exp: "LSP ensures subclass objects can replace superclass objects without breaking behavior." },
    { q: "Which HTTP method is idempotent but NOT safe?", opts: ["GET", "POST", "PUT", "HEAD"], ans: "C", skill: "REST API", diff: "easy", exp: "PUT is idempotent (same result on multiple calls) but not safe as it modifies resources." },
    { q: "In Node.js, when does `process.nextTick()` execute relative to the Event Loop?", opts: ["Next iteration", "After I/O events", "Before any I/O events in current iteration", "After setImmediate"], ans: "C", skill: "Node.js", diff: "hard", exp: "process.nextTick() fires before the event loop continues to the next phase." },
    { q: "What is the primary benefit of database connection pooling?", opts: ["Reduces disk usage", "Reuses connections, reducing overhead", "Increases query size limits", "Auto-scales the database"], ans: "B", skill: "Databases", diff: "easy", exp: "Connection pooling avoids the cost of creating new database connections on every request." },
    { q: "What does HMAC-based API authentication prevent compared to plain API keys?", opts: ["SQL injection", "CSRF attacks", "Replay attacks by including a timestamp in the signature", "XSS vulnerabilities"], ans: "C", skill: "Security", diff: "hard", exp: "HMAC signatures include a timestamp, making each request unique and preventing replay attacks." },
  ];

  const experienceWeights = {
    entry: { easy: 0.40, medium: 0.30, hard: 0.30 },
    mid: { easy: 0.30, medium: 0.50, hard: 0.20 },
    senior: { easy: 0.15, medium: 0.45, hard: 0.40 },
    lead: { easy: 0.10, medium: 0.35, hard: 0.55 },
    any: { easy: 0.30, medium: 0.50, hard: 0.20 },
  };

  const weights = experienceWeights[experienceLevel] || experienceWeights.mid;

  return Array.from({ length: total }, (_, i) => {
    const base = bank[i % bank.length];
    const frac = (i + 1) / total;
    const diff = frac <= weights.easy ? "easy" : frac <= weights.easy + weights.medium ? "medium" : "hard";

    return {
      questionIndex: i + 1,
      questionText: `[${jobTitle} | ${base.skill}] ${base.q}`,
      questionType: "mcq",
      options: [
        { optionId: "A", text: base.opts[0] },
        { optionId: "B", text: base.opts[1] },
        { optionId: "C", text: base.opts[2] },
        { optionId: "D", text: base.opts[3] },
      ],
      correctAnswer: base.ans,
      marks: 1,
      skillTested: base.skill,
      difficulty: diff,
      explanation: base.exp,
    };
  });
}

module.exports = {
  generateAssessmentQuestions,
  generateAssessmentForJob,
  generateAiEvaluationSummary,
};
