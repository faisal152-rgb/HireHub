import React, { Activity, useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  X,
  FileText,
  Briefcase,
  GraduationCap,
  Sparkles,
  Loader2,
} from "lucide-react";
import InterviewSchedulerModal from "./InterviewSchedulerModal";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import { useAppSelector } from "../../../app/hooks";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../components/common/Pagination";
import "../styles/companyDashboard.css";
import "../styles/application.css";
import "../styles/recruiter.css";

// Normalize raw application from backend into the shape ApplicantsTable expects
function normalizeApplication(app) {
  const name =
    app.candidateName ||
    app.candidate?.name ||
    app.candidateId?.name ||
    "Unknown Candidate";
  const email =
    app.candidateEmail ||
    app.candidate?.email ||
    app.candidateId?.email ||
    "";
  const phone =
    app.candidate?.phone || app.candidateId?.phone || "";
  const location =
    app.candidate?.location || app.candidateId?.location || "—";
  const experience =
    app.candidate?.experience || app.candidateId?.experience || "—";

  // Map backend status to frontend display status
  const rawStatus = (app.status || "pending").toLowerCase();
  const statusMap = {
    pending: "New",
    new: "New",
    "in review": "In Review",
    review: "In Review",
    inreview: "In Review",
    shortlisted: "Shortlisted",
    selected: "Hired",
    hired: "Hired",
    rejected: "Rejected",
    interview: "In Review",
  };
  const displayStatus = statusMap[rawStatus] || "New";

  const appliedOn = app.createdAt
    ? (() => {
        const diff = Date.now() - new Date(app.createdAt).getTime();
        const hours = Math.floor(diff / 3_600_000);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
        return "Just now";
      })()
    : "—";

  const recruiter =
    app.jobId?.recruiterId && typeof app.jobId.recruiterId === "object"
      ? app.jobId.recruiterId
      : app.recruiter && typeof app.recruiter === "object"
      ? app.recruiter
      : null;

  return {
    id: app._id || app.applicationId || app.id,
    name,
    email,
    phone,
    location,
    experienceYears: experience,
    jobTitle:
      app.jobTitle || app.job?.title || app.jobId?.title || "Job Application",
    recruiter,
    appliedOn,
    status: displayStatus,
    avatar: app.candidate?.avatar || app.candidateId?.avatar || null,
    skills: app.candidate?.skills || app.candidateId?.skills || [],
    education: app.candidate?.education?.[0] ||
      app.candidateId?.education?.[0] || {
        degree: "—",
        university: "—",
      },
    history: [],
  };
}

export default function ApplicantsTable() {
  const { role } = useAppSelector((s) => s.auth);
  const isRecruiter = role === "recruiter";

  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("All Jobs");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailTab, setDetailTab] = useState("Overview"); // Overview, Resume, Skills, Experience, Education, Activity
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const { page, limit, goToPage, setLimit } = usePagination();
  const [totalApplications, setTotalApplications] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const tabs = ["All", "New", "In Review", "Shortlisted", "Rejected"];

  const requestedStatus =
    statusFilter !== "All Statuses" ? statusFilter : activeTab;

  // Fetch the selected page of applications from the backend.
  useEffect(() => {
    let isMounted = true;
    const fetchApplications = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const params = { page, limit };
        if (requestedStatus !== "All") params.status = requestedStatus;
        const res = await api.get(endpoint.company.getAllApplications, { params });
        const raw = res.data?.applications || res.data?.data || [];
        if (isMounted) {
          setCandidates(Array.isArray(raw) ? raw.map(normalizeApplication) : []);
          const total = Number(res.data?.totalApplications ?? res.data?.count ?? raw.length);
          setTotalApplications(total);
          const pages = Number(res.data?.totalPages ?? Math.ceil(total / limit));
          setTotalPages(pages);
          const serverPage = Number(res.data?.currentPage) || page;
          goToPage(Math.min(serverPage, Math.max(1, pages)));
          if (res.data?.limit) setLimit(res.data.limit);
        }
      } catch (err) {
        console.error("Fetch applications error:", err);
        if (isMounted) setLoadError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchApplications();
    return () => { isMounted = false; };
  }, [page, limit, requestedStatus, goToPage, setLimit]);

  useEffect(() => {
    goToPage(1);
  }, [activeTab, statusFilter, search, jobFilter, goToPage]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.jobTitle.toLowerCase().includes(q);

      const matchTab =
        statusFilter !== "All Statuses" ||
        activeTab === "All" ||
        c.status === activeTab;
      const matchJob = jobFilter === "All Jobs" || c.jobTitle === jobFilter;
      const matchStatus = statusFilter === "All Statuses" || c.status === statusFilter;

      return matchSearch && matchTab && matchJob && matchStatus;
    });
  }, [candidates, search, activeTab, jobFilter, statusFilter]);

  const handleUpdateStatus = async (id, newStatus) => {
    // Optimistic update
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    if (selectedCandidate?.id === id) {
      setSelectedCandidate((prev) => ({ ...prev, status: newStatus }));
    }
    setOpenMenuId(null);

    // Map frontend status label → backend status value
    const backendStatusMap = {
      Shortlisted: "shortlisted",
      Rejected: "rejected",
      Hired: "selected",
      "In Review": "review",
      New: "pending",
    };
    const backendStatus = backendStatusMap[newStatus] || newStatus.toLowerCase();

    try {
      await api.patch(endpoint.company.updateApplicationStatus(id), { status: backendStatus });
    } catch (err) {
      console.error("Update status error:", err);
    }
  };

  return (
    <div>
      {/* ── Applications Header matching Reference 5 ── */}
      <div className="comp-page-header">
        <div className="comp-page-title-group">
          <h1>Applications</h1>
          <p>Track and manage candidate applications.</p>
        </div>
      </div>

      {/* ── Status Tabs with Badges matching Reference 5 ── */}
      <div className="comp-tabs-pills">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`comp-tab-pill ${activeTab === tab ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab);
              setStatusFilter("All Statuses");
              goToPage(1);
            }}
          >
            <span>{tab}</span>
          </button>
        ))}
      </div>

      {/* ── Filter Bar matching Reference 5 ── */}
      <div className="comp-filter-bar-modern">
        <div className="comp-filter-search-box">
          <Search size={16} className="comp-search-icon" />
          <input
            type="text"
            placeholder="Search by name, job title, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select
            className="comp-filter-select-modern"
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
          >
            <option value="All Jobs">Job Title</option>
            <option value="Frontend Developer">Frontend Developer</option>
            <option value="Backend Developer">Backend Developer</option>
            <option value="Full Stack Developer">Full Stack Developer</option>
            <option value="UI/UX Designer">UI/UX Designer</option>
            <option value="Data Analyst">Data Analyst</option>
          </select>

          <select
            className="comp-filter-select-modern"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All Statuses">Status</option>
            <option value="New">New</option>
            <option value="In Review">In Review</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            type="button"
            className="comp-btn-filter-outline"
            onClick={() => {
              setSearch("");
              setJobFilter("All Jobs");
              setStatusFilter("All Statuses");
              setActiveTab("All");
              goToPage(1);
            }}
          >
            <Filter size={15} />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* ── Candidate Table matching Reference 5 ── */}
      <div className="comp-table-card">
        <div className="comp-table-wrap" style={{ border: "none" }}>
          <table className="comp-modern-table">
            <thead>
              <tr>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Candidate</span>
                    <span style={{ fontSize: 13, opacity: 0.6 }}>↑</span>
                  </div>
                </th>
                <th>Job Title / Posted By</th>
                <th>Applied On</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
                    <Loader2 size={22} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} />
                    Loading applications...
                  </td>
                </tr>
              ) : loadError || filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 56, color: "#94a3b8" }}>
                    <FileText size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, fontSize: 15 }}>No applications found</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      Applications from candidates will appear here once jobs are posted.
                    </div>
                  </td>
                </tr>
              ) : filteredCandidates.map((cand) => (
                <tr key={cand.id}>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setSelectedCandidate(cand);
                        setDetailTab("Overview");
                      }}
                    >
                      <img
                        src={cand.avatar}
                        alt={cand.name}
                        className="comp-row-avatar"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>
                        {cand.name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="comp-application-job">
                      <span className="comp-application-job-title">{cand.jobTitle}</span>
                      <span className="comp-application-recruiter">
                        {cand.recruiter?.profilePicture?.url ||
                        (typeof cand.recruiter?.profilePicture === "string"
                          ? cand.recruiter.profilePicture
                          : "") ? (
                          <img
                            src={
                              cand.recruiter.profilePicture.url ||
                              cand.recruiter.profilePicture
                            }
                            alt={cand.recruiter.name || "Recruiter"}
                            className="comp-application-recruiter-avatar"
                          />
                        ) : (
                          <span className="comp-application-recruiter-avatar comp-application-recruiter-initials">
                            {(cand.recruiter?.name || "R")
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                        <span>
                          Posted by {cand.recruiter?.name || "Recruiter unavailable"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td style={{ color: "#64748b", fontSize: 13 }}>
                    {cand.appliedOn}
                  </td>
                  <td>
                    <span
                      className={`comp-pill-badge ${
                        cand.status === "New"
                          ? "badge-new"
                          : cand.status === "In Review"
                          ? "badge-inreview"
                          : cand.status === "Shortlisted"
                          ? "badge-shortlisted"
                          : "badge-rejected"
                      }`}
                    >
                      {cand.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", position: "relative" }}>
                    <button
                      type="button"
                      className="comp-icon-btn comp-action-trigger"
                      aria-label={`Actions for ${cand.name}`}
                      aria-expanded={openMenuId === cand.id}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setOpenMenuId(openMenuId === cand.id ? null : cand.id);
                      }}
                    >
                      <MoreVertical size={16} color="#64748b" />
                    </button>

                    {openMenuId === cand.id && (
                      <div className="comp-action-menu" role="menu">
                        <button
                          type="button"
                          className="comp-action-menu-item"
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setDetailTab("Overview");
                            setOpenMenuId(null);
                          }}
                        >
                          <FileText size={14} />
                          <span>View Profile</span>
                        </button>
                        {isRecruiter ? (
                          <>
                            <button
                              type="button"
                              className="comp-action-menu-item"
                              onClick={() => handleUpdateStatus(cand.id, "Shortlisted")}
                            >
                              <CheckCircle size={14} />
                              <span>Shortlist</span>
                            </button>
                            <button
                              type="button"
                              className="comp-action-menu-item"
                              onClick={() => {
                                setSelectedCandidate(cand);
                                setShowScheduleModal(true);
                                setOpenMenuId(null);
                              }}
                            >
                              <Calendar size={14} />
                              <span>Schedule Interview</span>
                            </button>
                            <button
                              type="button"
                              className="comp-action-menu-item danger"
                              onClick={() => handleUpdateStatus(cand.id, "Rejected")}
                            >
                              <XCircle size={14} />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <div style={{ padding: "6px 10px", fontSize: 11.5, color: "#64748b" }}>
                            Read-only (Managed by assigned recruiter)
                          </div>
                        )}
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
        totalItems={totalApplications}
        pageSize={limit}
        onPageChange={goToPage}
      />

      {/* ── Candidate Details Modal matching Reference 9 ── */}
      {selectedCandidate && !showScheduleModal && (
        <div className="comp-modal-overlay" onClick={() => setSelectedCandidate(null)}>
          <div
            className="comp-modal-card"
            style={{ maxWidth: 860 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Back button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  className="comp-icon-btn"
                  onClick={() => setSelectedCandidate(null)}
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                    Candidate Details
                  </h2>
                  <p style={{ margin: 0, color: "#64748b", fontSize: 12.5 }}>
                    Complete profile with resume, skills and experience.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="comp-modal-close"
                onClick={() => setSelectedCandidate(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Info Card Header matching Reference 9 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px",
                background: "#f8fafc",
                borderRadius: 14,
                marginBottom: 20,
                border: "1px solid #e2e8f0",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    color: "#ffffff",
                    fontSize: 22,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selectedCandidate.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                      {selectedCandidate.name}
                    </h3>
                    <span
                      className={`comp-badge ${
                        selectedCandidate.status === "Shortlisted"
                          ? "comp-badge-shortlisted"
                          : selectedCandidate.status === "In Review"
                          ? "comp-badge-inreview"
                          : selectedCandidate.status === "New"
                          ? "comp-badge-new"
                          : "comp-badge-rejected"
                      }`}
                    >
                      ● {selectedCandidate.status}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginTop: 6,
                      fontSize: 13,
                      color: "#64748b",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Mail size={14} />
                      {selectedCandidate.email}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Phone size={14} />
                      {selectedCandidate.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Message, Download CV, Schedule Interview */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="comp-btn comp-btn-secondary"
                  onClick={() => alert(`Message thread opened with ${selectedCandidate.name}`)}
                >
                  <Mail size={14} />
                  <span>Message</span>
                </button>
                <button
                  type="button"
                  className="comp-btn comp-btn-secondary"
                  onClick={() => alert(`Downloading CV for ${selectedCandidate.name}...`)}
                >
                  <Download size={14} />
                  <span>Download CV</span>
                </button>
                {isRecruiter && (
                  <button
                    type="button"
                    className="comp-btn comp-btn-primary"
                    onClick={() => setShowScheduleModal(true)}
                  >
                    <Calendar size={14} />
                    <span>Schedule Interview</span>
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs matching Reference 9 */}
            <div className="comp-tabs">
              {["Overview", "Resume", "Skills", "Experience", "Education", "Activity"].map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`comp-tab ${detailTab === tab ? "active" : ""}`}
                    onClick={() => setDetailTab(tab)}
                  >
                    {tab}
                  </button>
                )
              )}
            </div>

            {/* Tab Contents: Grid matching Reference 9 */}
            <Activity mode={detailTab === "Overview" ? "visible" : "hidden"}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.3fr", gap: 18 }}>
                {/* Personal Information */}
                <div style={{ background: "#f8fafc", padding: 18, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px 0" }}>
                    Personal Information
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: 11.5 }}>Full Name</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{selectedCandidate.name}</div>
                    </div>
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: 11.5 }}>Email</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{selectedCandidate.email}</div>
                    </div>
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: 11.5 }}>Phone</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{selectedCandidate.phone}</div>
                    </div>
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: 11.5 }}>Location</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{selectedCandidate.location}</div>
                    </div>
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: 11.5 }}>Experience</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{selectedCandidate.experienceYears}</div>
                    </div>
                  </div>
                </div>

                {/* Skills & Education */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Skills */}
                  <div style={{ background: "#f8fafc", padding: 18, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Skills</h4>
                      <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>View All</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {selectedCandidate.skills.map((skill, i) => (
                        <span
                          key={i}
                          style={{
                            background: "#eef2ff",
                            color: "#4f46e5",
                            padding: "4px 10px",
                            borderRadius: 16,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Education */}
                  <div style={{ background: "#f8fafc", padding: 18, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Education</h4>
                      <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>View All</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {selectedCandidate.education.degree}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {selectedCandidate.education.university}
                    </div>
                  </div>
                </div>

                {/* Application History */}
                <div style={{ background: "#f8fafc", padding: 18, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px 0" }}>
                    Application History
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {selectedCandidate.history.map((hist, i) => (
                      <div
                        key={i}
                        style={{
                          background: "#ffffff",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                            {hist.role}
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748b" }}>
                            {hist.company} • {hist.date}
                          </div>
                        </div>
                        <span
                          className={`comp-badge ${
                            hist.status === "Shortlisted"
                              ? "comp-badge-shortlisted"
                              : hist.status === "In Review"
                              ? "comp-badge-inreview"
                              : "comp-badge-rejected"
                          }`}
                          style={{ fontSize: 11 }}
                        >
                          {hist.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Activity>

            {/* Other detail tabs fallback */}
            <Activity mode={detailTab !== "Overview" ? "visible" : "hidden"}>
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  background: "#f8fafc",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                }}
              >
                <FileText size={36} style={{ color: "#6366f1", marginBottom: 12 }} />
                <h4 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", margin: "0 0 6px 0" }}>
                  {detailTab} Information for {selectedCandidate.name}
                </h4>
                <p style={{ fontSize: 13, margin: 0 }}>
                  Detailed {detailTab.toLowerCase()} records, verified credentials, and activity logs.
                </p>
              </div>
            </Activity>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal overlay */}
      {showScheduleModal && selectedCandidate && (
        <div className="comp-modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div
            className="comp-modal-card"
            style={{ maxWidth: 880, padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="comp-modal-close"
                style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}
                onClick={() => setShowScheduleModal(false)}
              >
                <X size={20} />
              </button>
              <InterviewSchedulerModal
                applicationId={selectedCandidate.id}
                candidateName={selectedCandidate.name}
                candidateEmail={selectedCandidate.email}
                jobTitle={selectedCandidate.jobTitle}
                onClose={() => setShowScheduleModal(false)}
                onScheduled={() => {
                  setShowScheduleModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
