import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Briefcase,
  Search,
  PlusCircle,
  MoreVertical,
  MapPin,
  Users,
  Eye,
  Edit,
  Pause,
  Play,
  Trash2,
  X,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Check,
  Loader2,
} from "lucide-react";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import { useAppSelector } from "../../../app/hooks";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../components/common/Pagination";
import "../styles/companyDashboard.css";
import "../styles/job.css";
import "../styles/recruiter.css";

const policyLabels = {
  totalQuestions: "Total questions",
  durationMinutes: "Time limit",
  totalMarks: "Total marks",
  passingMarks: "Passing marks",
  requireCamera: "Camera required",
  requireMic: "Microphone required",
  maxAllowedTabSwitches: "Allowed tab switches",
};

function normalizePolicies(policy) {
  if (Array.isArray(policy)) {
    return policy.map((item) =>
      item && typeof item === "object"
        ? Object.entries(item)
            .map(([key, value]) => `${policyLabels[key] || key}: ${String(value)}`)
            .join(", ")
        : String(item)
    );
  }

  if (policy && typeof policy === "object") {
    return Object.entries(policy).map(([key, value]) => {
      const label = policyLabels[key] || key;
      const displayValue =
        typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
      return `${label}: ${displayValue}`;
    });
  }

  return policy ? [String(policy)] : [];
}

// Normalize raw job from backend into the shape ManageJobsPage expects
function normalizeJob(job) {
  const rawAssessment = job.assessment || job.policy || {};

  return {
    id: job._id || job.id,
    title: job.title || "Untitled Job",
    category: job.category || job.jobType || "General",
    location: job.location || "—",
    type: job.jobType || job.type || "Full Time",
    experience: job.experienceLevel || job.experience || "—",
    applications: typeof job.applications === "number" ? job.applications : 0,
    shortlisted: typeof job.shortlisted === "number" ? job.shortlisted : 0,
    hired: typeof job.hired === "number" ? job.hired : 0,
    status: job.status
      ? job.status.charAt(0).toUpperCase() + job.status.slice(1).toLowerCase()
      : "Active",
    postedOn: job.createdAt
      ? new Date(job.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
    companyName: job.companyName || job.company?.name || job.recruiterId?.companyId?.name || "—",
    image: job.image || null,
    avatar: job.image || job.companyLogo || null,
    recruiter: job.recruiterId && typeof job.recruiterId === "object"
      ? job.recruiterId
      : null,
    description: job.description || "",
    requirements: Array.isArray(job.requirements)
      ? job.requirements
      : job.requirements
      ? [job.requirements]
      : [],
    policies: normalizePolicies(job.policy),
    assessment: {
      totalQuestions: rawAssessment.totalQuestions ?? job.totalQuestions ?? 0,
      durationMinutes: rawAssessment.durationMinutes ?? job.durationMinutes ?? 0,
      passingScore: rawAssessment.passingScore ?? rawAssessment.passingMarks ?? job.passingScore ?? 0,
      proctoring:
        rawAssessment.proctoring ??
        (rawAssessment.requireCamera === true ||
          rawAssessment.requireMic === true ||
          job.proctoring === true),
    },
  };
}

export default function ManageJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Jobs");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [sortBy, setSortBy] = useState("Newest");
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobModalTab, setJobModalTab] = useState("Overview"); // Overview, Requirements, Policies, Assessment
  const [openMenuId, setOpenMenuId] = useState(null);
  const { page, limit, goToPage, setLimit } = usePagination();
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const { role } = useAppSelector((s) => s.auth);
  const isRecruiter = role === "recruiter";

  const filteredJobs = useMemo(() => {
    let result = jobs.filter((job) => {
      const q = search.toLowerCase().trim();
      const matchQuery =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        job.category.toLowerCase().includes(q);

      const matchCategory =
        categoryFilter === "All Jobs" || job.category === categoryFilter;

      const matchStatus =
        statusFilter === "All Statuses" || job.status === statusFilter;

      return matchQuery && matchCategory && matchStatus;
    });

    if (sortBy === "Applications") {
      result = [...result].sort((a, b) => b.applications - a.applications);
    } else if (sortBy === "Title") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [jobs, search, categoryFilter, statusFilter, sortBy]);

  // Fetch jobs from backend on mount (Supports both Recruiter and Company Admin)
  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const res = await api.get(endpoint.company.getMyJobs, {
          params: { page, limit },
        });
        const raw = res.data?.jobs || res.data?.data || [];
        if (isMounted) {
          setJobs(Array.isArray(raw) ? raw.map(normalizeJob) : []);
          const nextTotal = Number(res.data?.totalJobs ?? res.data?.count ?? raw.length);
          setTotalJobs(nextTotal);
          const nextTotalPages = Number(
            res.data?.totalPages ?? Math.ceil(nextTotal / limit)
          );
          setTotalPages(nextTotalPages);
          const serverPage = Number(res.data?.currentPage) || page;
          goToPage(Math.min(serverPage, Math.max(1, nextTotalPages)));
          if (res.data?.limit) setLimit(res.data.limit);
        }
      } catch (err) {
        console.error("Fetch jobs error:", err);
        if (isMounted)
          setLoadError(
            err.response?.data?.message ||
              "Could not load jobs. Please refresh or check your connection."
          );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchJobs();
    return () => { isMounted = false; };
  }, [isRecruiter, page, limit, goToPage, setLimit]);

  useEffect(() => {
    goToPage(1);
  }, [search, categoryFilter, statusFilter, sortBy, goToPage]);

  const handleToggleStatus = async (id) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    const newStatus =
      job.status === "Active" ? "paused" : job.status === "Paused" ? "active" : "active";

    // Optimistic update in UI
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, status: newStatus.charAt(0).toUpperCase() + newStatus.slice(1) }
          : j
      )
    );
    setOpenMenuId(null);

    // Sync with backend
    try {
      await api.patch(`/job/${id}/status`, { status: newStatus });
    } catch (err) {
      console.error("Toggle status error:", err);
      // Revert optimistic update on failure
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, status: job.status } : j))
      );
    }
  };

  const handleDeleteJob = async (id) => {
    // Optimistic removal
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setOpenMenuId(null);
    if (selectedJob?.id === id) setSelectedJob(null);

    try {
      await api.delete(`/job/${id}`);
    } catch (err) {
      console.error("Delete job error:", err);
    }
  };

  return (
    <div className="comp-page-container">
      {/* ── Page Header matching Reference 4 ('Manage Jobs') ── */}
      <div className="comp-page-header">
        <div className="comp-page-title-group">
          <h1>{isRecruiter ? "Manage Jobs" : "Recruiter Job Postings"}</h1>
          <p>
            {isRecruiter
              ? "View, edit, pause, and publish your assigned job openings."
              : "Overview of job posts created and managed by your company recruiters."}
          </p>
        </div>
        {isRecruiter ? (
          <Link to="/company/post-job" className="comp-btn comp-btn-primary">
            <PlusCircle size={16} />
            <span>Post a Job</span>
          </Link>
        ) : (
          <Link to="/company/add-recruiter" className="comp-btn comp-btn-primary">
            <PlusCircle size={16} />
            <span>+ Add Recruiter</span>
          </Link>
        )}
      </div>

      {/* ── Filter Bar matching Reference 4 ── */}
      <div className="comp-filter-bar-modern">
        <div className="comp-filter-search-box">
          <Search size={16} className="comp-search-icon" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select
            className="comp-filter-select-modern"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All Jobs">All Jobs</option>
            <option value="Development">Development</option>
            <option value="Design">Design</option>
            <option value="Data & Analytics">Data & Analytics</option>
          </select>

          <select
            className="comp-filter-select-modern"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All Statuses">Status</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
            <option value="Draft">Draft</option>
          </select>

          <select
            className="comp-filter-select-modern"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="Newest">Sort by</option>
            <option value="Applications">Most Applications</option>
            <option value="Title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* ── Jobs Table matching Reference 4 ── */}
      <div className="comp-table-card">
        <div className="comp-table-wrap" style={{ border: "none" }}>
          <table className="comp-modern-table">
            <thead>
              <tr>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Job Title</span>
                    <span style={{ fontSize: 13, opacity: 0.5 }}>⇅</span>
                  </div>
                </th>
                {!isRecruiter && <th>Posted By</th>}
                <th>Category</th>
                <th>Location</th>
                <th>Applications</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={isRecruiter ? 6 : 7} style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                    <Loader2 size={22} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} />
                    Loading jobs...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={isRecruiter ? 6 : 7} style={{ textAlign: "center", padding: 40, color: "#ef4444" }}>
                    {loadError}
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={isRecruiter ? 6 : 7} style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
                    <Briefcase size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, fontSize: 15 }}>No jobs found</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      {isRecruiter ? "Post your first job to get started." : "Invite a recruiter to start posting jobs."}
                    </div>
                  </td>
                </tr>
              ) : filteredJobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setSelectedJob(job);
                        setJobModalTab("Overview");
                      }}
                    >
                      {job.avatar ? (
                        <img
                          src={job.avatar}
                          alt={`${job.title} image`}
                          className="comp-row-avatar"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="comp-row-avatar comp-job-recruiter-initials">
                          {job.title.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>
                        {job.title}
                      </span>
                    </div>
                  </td>
                  {!isRecruiter && (
                    <td>
                      <div className="comp-job-recruiter">
                        {(
                          job.recruiter?.profilePicture?.url ||
                          (typeof job.recruiter?.profilePicture === "string"
                            ? job.recruiter.profilePicture
                            : "")
                        ) ? (
                          <img
                            src={
                              job.recruiter.profilePicture.url ||
                              job.recruiter.profilePicture
                            }
                            alt={job.recruiter.name || "Recruiter"}
                            className="comp-job-recruiter-avatar"
                          />
                        ) : (
                          <span className="comp-job-recruiter-avatar comp-job-recruiter-initials">
                            {(job.recruiter?.name || "R")
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                        <span className="comp-job-recruiter-name">
                          {job.recruiter?.name || "Recruiter unavailable"}
                        </span>
                      </div>
                    </td>
                  )}
                  <td>
                    <span className="comp-category-badge">
                      {job.category}
                    </span>
                  </td>
                  <td style={{ color: "#334155", fontWeight: 500 }}>
                    {job.location}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>
                      {job.applications}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`comp-pill-badge ${
                        job.status === "Active"
                          ? "badge-active"
                          : job.status === "Paused"
                          ? "badge-paused"
                          : "badge-draft"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", position: "relative" }}>
                    <button
                      type="button"
                      className="comp-icon-btn comp-action-trigger"
                      aria-label={`Actions for ${job.title}`}
                      aria-expanded={openMenuId === job.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenuId((cur) => (cur === job.id ? null : job.id));
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openMenuId === job.id && (
                      <div className="comp-action-menu" role="menu">
                        <button
                          type="button"
                          className="comp-action-menu-item"
                          onClick={() => {
                            setSelectedJob(job);
                            setJobModalTab("Overview");
                            setOpenMenuId(null);
                          }}
                        >
                          <Eye size={14} />
                          <span>View Details</span>
                        </button>
                        <button
                          type="button"
                          className="comp-action-menu-item"
                          onClick={() => {
                            navigate(`/company/manage-applications?job=${encodeURIComponent(job.title)}`);
                            setOpenMenuId(null);
                          }}
                        >
                          <Users size={14} />
                          <span>Applicants</span>
                        </button>
                        <button
                          type="button"
                          className="comp-action-menu-item"
                          onClick={() => handleToggleStatus(job.id)}
                        >
                          {job.status === "Active" ? (
                            <>
                              <Pause size={14} />
                              <span>Pause Job</span>
                            </>
                          ) : (
                            <>
                              <Play size={14} />
                              <span>Activate Job</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="comp-action-menu-item danger"
                          onClick={() => handleDeleteJob(job.id)}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalJobs}
        pageSize={limit}
        onPageChange={goToPage}
      />

      {/* ── View Job Details Modal matching Reference 6 ── */}
      {selectedJob && (
        <div className="comp-modal-overlay" onClick={() => setSelectedJob(null)}>
          <div
            className="comp-modal-card"
            style={{ maxWidth: 840 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", gap: 16 }}>
                {selectedJob.image ? (
                  <img
                    src={selectedJob.image}
                    alt={`${selectedJob.title} image`}
                    style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover"}}
                  />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: "#eef2ff",
                      color: "#4f46e5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Briefcase size={26} />
                  </div>
                )}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#0a0909ff" }}>
                      {selectedJob.title}
                    </h2>
                    <span className="comp-badge comp-badge-active">
                      ● {selectedJob.status}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: 13.5 }}>
                    {selectedJob.companyName || "Company"} • {selectedJob.type} • {selectedJob.location} •{" "}
                    {selectedJob.experience}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="comp-modal-close"
                onClick={() => setSelectedJob(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs matching Reference 6 */}
            <div className="comp-tabs">
              {["Overview", "Requirements", "Policies", "Assessment"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`comp-tab ${jobModalTab === tab ? "active" : ""}`}
                  onClick={() => setJobModalTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Modal Body: Left Content + Right Quick Info Box */}
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 24 }}>
              {/* Tab Content */}
              <div>
                {jobModalTab === "Overview" && (
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#070707ff" }}>
                      Job Description
                    </h4>
                    <p style={{ color: "#475569", fontSize: 13.5, lineHeight: 1.7, marginBottom: 20 }}>
                      {selectedJob.description}
                    </p>

                    <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#070707ff" }}>
                      Key Responsibilities
                    </h4>
                    <ul style={{ paddingLeft: 20, color: "#475569", fontSize: 13.5, lineHeight: 1.8 }}>
                      {selectedJob.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {jobModalTab === "Requirements" && (
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#070707ff" }}>
                      Candidate Requirements
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {selectedJob.requirements.map((req, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 14px",
                            background: "#f8fafc",
                            borderRadius: 8,
                            fontSize: 13.5,
                            color: "#334155",
                          }}
                        >
                          <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                          <span>{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {jobModalTab === "Policies" && (
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#070707ff" }}>
                      Application & Hiring Policies
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {selectedJob.policies.map((pol, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 14px",
                            background: "#f8fafc",
                            borderRadius: 8,
                            fontSize: 13.5,
                            color: "#334155",
                          }}
                        >
                          <ShieldCheck size={16} style={{ color: "#6366f1" }} />
                          <span>{pol}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {jobModalTab === "Assessment" && (
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#070707ff" }}>
                      Assessment Specifications
                    </h4>
                    <div className="comp-stat-card" style={{ background: "#f8fafc" }}>
                      <p style={{ margin: "0 0 8px 0", fontSize: 13.5 }}>
                        <strong>Questions:</strong> {selectedJob.assessment.totalQuestions} MCQs
                      </p>
                      <p style={{ margin: "0 0 8px 0", fontSize: 13.5 }}>
                        <strong>Time Limit:</strong> {selectedJob.assessment.durationMinutes} minutes
                      </p>
                      <p style={{ margin: "0 0 8px 0", fontSize: 13.5 }}>
                        <strong>Passing Score:</strong> {selectedJob.assessment.passingScore}%
                      </p>
                      <p style={{ margin: 0, fontSize: 13.5 }}>
                        <strong>Proctoring:</strong>{" "}
                        {selectedJob.assessment.proctoring ? "Active Webcam Anti-Cheat" : "Standard"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar: Quick Info Card matching Reference 6 */}
              <div>
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px 0" }}>
                    Quick Info
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: "#64748b" }}>Applications</span>
                      <strong style={{ fontSize: 15 }}>{selectedJob.applications}</strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: "#64748b" }}>Shortlisted</span>
                      <strong style={{ fontSize: 15, color: "#059669" }}>
                        {selectedJob.shortlisted}
                      </strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: "#64748b" }}>Hired</span>
                      <strong style={{ fontSize: 15, color: "#4f46e5" }}>
                        {selectedJob.hired}
                      </strong>
                    </div>
                  </div>

                  <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                    <button
                      type="button"
                      className="comp-btn comp-btn-primary"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => {
                        navigate(`/company/manage-applications?job=${encodeURIComponent(selectedJob.title)}`);
                        setSelectedJob(null);
                      }}
                    >
                      <span>Manage Applicants</span>
                    </button>
                    <button
                      type="button"
                      className="comp-btn comp-btn-secondary"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => setSelectedJob(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
