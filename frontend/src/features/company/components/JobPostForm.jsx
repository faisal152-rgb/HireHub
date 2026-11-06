import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Check,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  Shield,
  Camera,
  Mic,
  Monitor,
  Lock,
  Bot,
  AlertCircle,
  CheckCircle2,
  FileText,
  Sparkles,
  Video,
  Loader2,
  RotateCcw,
} from "lucide-react";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import "../styles/companyDashboard.css";
import "../styles/job.css";

// ─── Activity: show only the active step panel ───────────────────────────────
function Activity({ active, children }) {
  if (!active) return null;
  return <div>{children}</div>;
}

export default function JobPostForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [jobImage, setJobImage] = useState(null);

  const [form, setForm] = useState({
    // Step 1
    title: "",
    category: "Development",
    employmentType: "Full Time",
    location: "",
    description: "",
    // Step 2
    minEducation: "Bachelor's",
    experience: "Fresh Graduate",
    policies: "",
    // Step 3
    totalQuestions: "",
    passingScore: "",
    duration: "",
    allowedViolations: "",
    requireCamera: false,
    requireMicrophone: false,
    requireScreenShare: false,
    requireScreenRecord: false,
    fullscreenLock: false,
    aiQuestions: false,
  });

  const [step, setStep] = useState(1);

  const steps = [
    "Job Details",
    "Eligibility & Policies",
    "Assessment Settings",
    "Review & Publish",
  ];

  const updateField = (name, value) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const handleNext = async (e) => {
    e.preventDefault();

    if (step === 1) {
      if (!form.title.trim()) {
        setNotice({ type: "error", text: "Please enter a valid Job Title." });
        return;
      }
      if (!form.location.trim()) {
        setNotice({ type: "error", text: "Please specify the Job Location." });
        return;
      }
      if (!form.description.trim()) {
        setNotice({ type: "error", text: "Please provide a Job Description." });
        return;
      }
      if (!jobImage) {
        setNotice({ type: "error", text: "Please select a job image." });
        return;
      }
    }

    setNotice({ type: "", text: "" });

    if (step < 4) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setIsSubmitting(true);
      try {
        const payload = new FormData();
        payload.append("image", jobImage);
        payload.append("title", form.title);
        payload.append("category", form.category || "Development");
        payload.append("employmentType", form.employmentType);
        payload.append("location", form.location);
        payload.append("description", form.description);
        payload.append("minEducation", form.minEducation);
        payload.append("experience", form.experience);
        payload.append("policies", form.policies);
        payload.append("assessment", JSON.stringify({
            totalQuestions: Number(form.totalQuestions),
            passingScore: Number(form.passingScore),
            duration: Number(form.duration),
            allowedViolations: Number(form.allowedViolations),
            proctoring: {
              camera: form.requireCamera,
              mic: form.requireMicrophone,
              screenShare: form.requireScreenShare,
              screenRecord: form.requireScreenRecord,
              fullscreenLock: form.fullscreenLock,
              aiQuestions: form.aiQuestions,
            },
          }));
        await api.post(endpoint.company.createJob, payload);
        setNotice({ type: "success", text: "Job successfully created and published!" });
        setTimeout(() => navigate("/company/manage-jobs"), 1600);
      } catch (err) {
        setNotice({
          type: "error",
          text:
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to publish job. Please check all details and try again.",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      category: "Development",
      employmentType: "Full Time",
      location: "",
      description: "",
      minEducation: "Bachelor's",
      experience: "Fresh Graduate",
      policies: "",
      totalQuestions: "",
      passingScore: "",
      duration: "",
      allowedViolations: "",
      requireCamera: false,
      requireMicrophone: false,
      requireScreenShare: false,
      requireScreenRecord: false,
      fullscreenLock: false,
      aiQuestions: false,
    });
    setStep(1);
    setNotice({ type: "", text: "" });
  };

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>

      {/* Page Header */}
      <div className="comp-page-header">
        <div className="comp-page-title-group">
          <h1>Post a New Job</h1>
          <p>Create a job opening and configure automated candidate assessments.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="comp-stepper">
        {steps.map((label, index) => {
          const stepNum = index + 1;
          const isCompleted = step > stepNum;
          const isActive = step === stepNum;
          return (
            <React.Fragment key={label}>
              <div
                className={`comp-step-item ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                style={{ cursor: isCompleted ? "pointer" : "default" }}
                onClick={() => { if (isCompleted) setStep(stepNum); }}
              >
                <span className="comp-step-circle">
                  {isCompleted ? <Check size={14} /> : stepNum}
                </span>
                <span>{label}</span>
              </div>
              {index < steps.length - 1 && <div className="comp-step-divider" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main Card */}
      <div className="comp-job-form-card">

        {/* Alert Banner */}
        {notice.text && (
          <div
            className={`comp-form-alert ${
              notice.type === "success" ? "comp-form-alert-success" : "comp-form-alert-error"
            }`}
          >
            {notice.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notice.text}</span>
          </div>
        )}

        <form onSubmit={handleNext}>

          {/* ── STEP 1: JOB DETAILS ──────────────────────────────────────────── */}
          <Activity active={step === 1}>
            <div className="comp-step-section-header">
              <h3 className="comp-step-section-title">
                <Briefcase size={20} color="#4f46e5" />
                <span>Job Details</span>
              </h3>
              <p className="comp-step-section-desc">
                Provide primary role specifications, job category, and expectations.
              </p>
            </div>

            <div className="comp-form-grid">
              <div className="comp-form-field">
                <label className="comp-form-label" htmlFor="job-title">Job Title </label>
                <input
                  id="job-title"
                  type="text"
                  className="comp-form-input"
                  placeholder="e.g. Frontend Developer"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  required
                />
              </div>

              <div className="comp-form-field">
                <label className="comp-form-label" htmlFor="job-category">Job Category </label>
                <select
                  id="job-category"
                  className="comp-form-select"
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  required
                >
                  <option value="Development">Software Development</option>
                  <option value="Design">UI/UX Design</option>
                  <option value="Marketing">Marketing &amp; Sales</option>
                  <option value="Data">Data Science &amp; AI</option>
                  <option value="HR">Human Resources</option>
                  <option value="Product">Product Management</option>
                </select>
              </div>

              <div className="comp-form-field">
                <label className="comp-form-label" htmlFor="job-type">Employment Type </label>
                <select
                  id="job-type"
                  className="comp-form-select"
                  value={form.employmentType}
                  onChange={(e) => updateField("employmentType", e.target.value)}
                  required
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contractual</option>
                  <option value="Internship">Internship</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>

              <div className="comp-form-field">
                <label className="comp-form-label" htmlFor="job-location">Location </label>
                <input
                  id="job-location"
                  type="text"
                  className="comp-form-input"
                  placeholder="e.g. Lahore, Pakistan or Remote"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  required
                />
              </div>

              <div className="comp-form-field full">
                <label className="comp-form-label" htmlFor="job-description">
                  Job Description &amp; Responsibilities 
                </label>
                <textarea
                  id="job-description"
                  className="comp-form-textarea"
                  rows={5}
                  placeholder="Detail the key responsibilities, daily work, and expectations..."
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  required
                />
              </div>

              <div className="comp-form-field full">
                <label className="comp-form-label" htmlFor="job-image">Job Image </label>
                <input
                  id="job-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="comp-form-input"
                  onChange={(e) => setJobImage(e.target.files?.[0] || null)}
                  required
                />
                {jobImage && (
                  <small style={{ color: "#64748b" }}>{jobImage.name}</small>
                )}
              </div>
            </div>
          </Activity>

          {/* ── STEP 2: ELIGIBILITY & POLICIES ──────────────────────────────── */}
          <Activity active={step === 2}>
            <div className="comp-step-section-header">
              <h3 className="comp-step-section-title">
                <GraduationCap size={20} color="#4f46e5" />
                <span>Eligibility &amp; Candidate Policies</span>
              </h3>
              <p className="comp-step-section-desc">
                Define the baseline qualifications, experience range, and application rules.
              </p>
            </div>

            <div className="comp-form-grid">
              <div className="comp-form-field">
                <label className="comp-form-label">Minimum Education </label>
                <select
                  className="comp-form-select"
                  value={form.minEducation}
                  onChange={(e) => updateField("minEducation", e.target.value)}
                  required
                >
                  <option value="High School">Intermediate / High School</option>
                  <option value="Bachelor's">Bachelor's Degree</option>
                  <option value="Master's">Master's Degree</option>
                  <option value="PhD">Doctorate / PhD</option>
                  <option value="Certification">Professional Certification</option>
                </select>
              </div>

              <div className="comp-form-field">
                <label className="comp-form-label">Experience Required </label>
                <select
                  className="comp-form-select"
                  value={form.experience}
                  onChange={(e) => updateField("experience", e.target.value)}
                  required
                >
                  <option value="Fresh Graduate">Fresh Graduate (0 Years)</option>
                  <option value="0.5–1.5 Years">Junior (0.5–1.5 Years)</option>
                  <option value="2–3 Years">Mid-Level (2–3 Years)</option>
                  <option value="4–5 Years">Senior (4–5 Years)</option>
                  <option value="5+ Years">Lead / Principal (5+ Years)</option>
                </select>
              </div>

              <div className="comp-form-field full">
                <label className="comp-form-label">
                  Eligibility Criteria &amp; Hiring Policy Notes
                </label>
                <textarea
                  className="comp-form-textarea"
                  rows={4}
                  placeholder="E.g., Assessment attempt limits, mandatory skills, or notice period requirements..."
                  value={form.policies}
                  onChange={(e) => updateField("policies", e.target.value)}
                />
              </div>
            </div>
          </Activity>

          {/* ── STEP 3: ASSESSMENT SETTINGS ──────────────────────────────────── */}
          <Activity active={step === 3}>
            <div className="comp-step-section-header">
              <h3 className="comp-step-section-title">
                <Shield size={20} color="#4f46e5" />
                <span>Assessment &amp; AI Proctoring Settings</span>
              </h3>
              <p className="comp-step-section-desc">
                Set candidate MCQ test parameters, passing cutoff, and anti-cheat monitoring.
              </p>
            </div>

            <div className="comp-form-grid">
              <div className="comp-form-field">
                <label className="comp-form-label">Total MCQ Questions </label>
                <input
                  type="number" min={5} max={100}
                  className="comp-form-input"
                  value={form.totalQuestions}
                  onChange={(e) => updateField("totalQuestions", e.target.value)}
                  required
                />
              </div>

              <div className="comp-form-field">
                <label className="comp-form-label">Passing Cutoff Score (%) </label>
                <input
                  type="number" min={30} max={100}
                  className="comp-form-input"
                  value={form.passingScore}
                  onChange={(e) => updateField("passingScore", e.target.value)}
                  required
                />
              </div>

              <div className="comp-form-field">
                <label className="comp-form-label">Test Duration (Minutes) </label>
                <input
                  type="number" min={15} max={180}
                  className="comp-form-input"
                  value={form.duration}
                  onChange={(e) => updateField("duration", e.target.value)}
                  required
                />
              </div>

              <div className="comp-form-field">
                <label className="comp-form-label">Allowed Tab / Head Violations </label>
                <input
                  type="number" min={0} max={10}
                  className="comp-form-input"
                  value={form.allowedViolations}
                  onChange={(e) => updateField("allowedViolations", e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <label className="comp-form-label" style={{ marginBottom: 10, display: "block" }}>
                AI Proctoring &amp; Test Security Safeguards
              </label>
              <div className="comp-toggle-grid">

                <div className={`comp-toggle-card ${form.requireCamera ? "active" : ""}`}
                  onClick={() => updateField("requireCamera", !form.requireCamera)}>
                  <div className="comp-toggle-left">
                    <div className="comp-toggle-icon"><Camera size={18} /></div>
                    <div>
                      <div className="comp-toggle-title">Webcam Monitoring</div>
                      <div className="comp-toggle-desc">Detect face absence and multi-person presence</div>
                    </div>
                  </div>
                  <div className={`comp-switch-track ${form.requireCamera ? "active" : ""}`}>
                    <div className="comp-switch-thumb" />
                  </div>
                </div>

                <div className={`comp-toggle-card ${form.requireMicrophone ? "active" : ""}`}
                  onClick={() => updateField("requireMicrophone", !form.requireMicrophone)}>
                  <div className="comp-toggle-left">
                    <div className="comp-toggle-icon"><Mic size={18} /></div>
                    <div>
                      <div className="comp-toggle-title">Microphone Audio</div>
                      <div className="comp-toggle-desc">Listen for whispered answers or background talk</div>
                    </div>
                  </div>
                  <div className={`comp-switch-track ${form.requireMicrophone ? "active" : ""}`}>
                    <div className="comp-switch-thumb" />
                  </div>
                </div>

                <div className={`comp-toggle-card ${form.requireScreenShare ? "active" : ""}`}
                  onClick={() => updateField("requireScreenShare", !form.requireScreenShare)}>
                  <div className="comp-toggle-left">
                    <div className="comp-toggle-icon"><Monitor size={18} /></div>
                    <div>
                      <div className="comp-toggle-title">Live Screen Sharing</div>
                      <div className="comp-toggle-desc">Broadcast candidate screen live to recruiter</div>
                    </div>
                  </div>
                  <div className={`comp-switch-track ${form.requireScreenShare ? "active" : ""}`}>
                    <div className="comp-switch-thumb" />
                  </div>
                </div>

                <div className={`comp-toggle-card ${form.requireScreenRecord ? "active" : ""}`}
                  onClick={() => updateField("requireScreenRecord", !form.requireScreenRecord)}>
                  <div className="comp-toggle-left">
                    <div className="comp-toggle-icon"><Video size={18} /></div>
                    <div>
                      <div className="comp-toggle-title">Session Video Recording</div>
                      <div className="comp-toggle-desc">Archive entire session footage for audit</div>
                    </div>
                  </div>
                  <div className={`comp-switch-track ${form.requireScreenRecord ? "active" : ""}`}>
                    <div className="comp-switch-thumb" />
                  </div>
                </div>

                <div className={`comp-toggle-card ${form.fullscreenLock ? "active" : ""}`}
                  onClick={() => updateField("fullscreenLock", !form.fullscreenLock)}>
                  <div className="comp-toggle-left">
                    <div className="comp-toggle-icon"><Lock size={18} /></div>
                    <div>
                      <div className="comp-toggle-title">Browser Fullscreen Lock</div>
                      <div className="comp-toggle-desc">Prevent tab switching and minimize events</div>
                    </div>
                  </div>
                  <div className={`comp-switch-track ${form.fullscreenLock ? "active" : ""}`}>
                    <div className="comp-switch-thumb" />
                  </div>
                </div>

                <div className={`comp-toggle-card ${form.aiQuestions ? "active" : ""}`}
                  onClick={() => updateField("aiQuestions", !form.aiQuestions)}>
                  <div className="comp-toggle-left">
                    <div className="comp-toggle-icon"><Bot size={18} /></div>
                    <div>
                      <div className="comp-toggle-title">AI Dynamic MCQs</div>
                      <div className="comp-toggle-desc">Auto-generate customized questions by job role</div>
                    </div>
                  </div>
                  <div className={`comp-switch-track ${form.aiQuestions ? "active" : ""}`}>
                    <div className="comp-switch-thumb" />
                  </div>
                </div>

              </div>
            </div>
          </Activity>

          {/* ── STEP 4: REVIEW & PUBLISH ──────────────────────────────────────── */}
          <Activity active={step === 4}>
            <div className="comp-step-section-header">
              <h3 className="comp-step-section-title">
                <Sparkles size={20} color="#4f46e5" />
                <span>Review &amp; Publish Job</span>
              </h3>
              <p className="comp-step-section-desc">
                Carefully inspect job details and assessment policies before posting.
              </p>
            </div>

            <div className="comp-review-grid">
              <div className="comp-review-box">
                <div className="comp-review-box-title">
                  <Briefcase size={14} /><span>Role Overview</span>
                </div>
                <div className="comp-review-item">
                  <span className="comp-review-item-label">Job Title</span>
                  <span className="comp-review-item-val">{form.title || "—"}</span>
                </div>
                <div className="comp-review-item">
                  <span className="comp-review-item-label">Category</span>
                  <span className="comp-review-item-val">{form.category}</span>
                </div>
                <div className="comp-review-item">
                  <span className="comp-review-item-label">Employment</span>
                  <span className="comp-review-item-val">{form.employmentType}</span>
                </div>
                <div className="comp-review-item">
                  <span className="comp-review-item-label">Location</span>
                  <span className="comp-review-item-val">{form.location || "—"}</span>
                </div>
              </div>

              <div className="comp-review-box">
                <div className="comp-review-box-title">
                  <GraduationCap size={14} /><span>Candidate Requirements</span>
                </div>
                <div className="comp-review-item">
                  <span className="comp-review-item-label">Min. Education</span>
                  <span className="comp-review-item-val">{form.minEducation}</span>
                </div>
                <div className="comp-review-item">
                  <span className="comp-review-item-label">Experience</span>
                  <span className="comp-review-item-val">{form.experience}</span>
                </div>
                <div className="comp-review-item">
                  <span className="comp-review-item-label">Test Passing Cutoff</span>
                  <span className="comp-review-item-val">{form.passingScore}%</span>
                </div>
                <div className="comp-review-item">
                  <span className="comp-review-item-label">Test Duration</span>
                  <span className="comp-review-item-val">{form.duration} mins</span>
                </div>
              </div>

              <div className="comp-review-box full">
                <div className="comp-review-box-title">
                  <FileText size={14} /><span>Job Description</span>
                </div>
                <p style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
                  {form.description}
                </p>
              </div>

              <div className="comp-review-box full">
                <div className="comp-review-box-title">
                  <Shield size={14} /><span>Active Security &amp; Assessment Settings</span>
                </div>
                <div className="comp-review-pill-list">
                  <span className="comp-review-pill">📝 {form.totalQuestions} Questions</span>
                  <span className="comp-review-pill">⏱ {form.duration} Minutes Duration</span>
                  <span className="comp-review-pill">🎯 {form.passingScore}% Passing Cutoff</span>
                  <span className="comp-review-pill">⚠️ Max {form.allowedViolations} Violations</span>
                  {form.requireCamera && <span className="comp-review-pill">📷 Webcam Proctoring</span>}
                  {form.requireMicrophone && <span className="comp-review-pill">🎤 Audio Monitoring</span>}
                  {form.requireScreenShare && <span className="comp-review-pill">🖥 Live Screen Share</span>}
                  {form.requireScreenRecord && <span className="comp-review-pill">🎥 Screen Recording</span>}
                  {form.fullscreenLock && <span className="comp-review-pill">🔒 Fullscreen Lock</span>}
                  {form.aiQuestions && <span className="comp-review-pill">🤖 AI Question Generator</span>}
                </div>
              </div>
            </div>
          </Activity>

          {/* ── Form Navigation Actions ───────────────────────────────────────── */}
          <div className="comp-form-actions">
            <div>
              {step > 1 ? (
                <button
                  type="button"
                  className="comp-btn comp-btn-secondary"
                  onClick={() => setStep(step - 1)}
                  disabled={isSubmitting}
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="comp-btn comp-btn-outline"
                  onClick={resetForm}
                  title="Clear all fields"
                >
                  <RotateCcw size={15} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                className="comp-btn comp-btn-secondary"
                onClick={() => navigate("/company/manage-jobs")}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="comp-btn comp-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Publishing Job...</span>
                  </>
                ) : step < 4 ? (
                  <>
                    <span>Next Step</span>
                    <ChevronRight size={16} />
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Publish Job Opening</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
