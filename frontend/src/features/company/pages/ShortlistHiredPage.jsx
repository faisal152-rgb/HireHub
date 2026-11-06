import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Filter, Search, Users } from "lucide-react";
import endpoint from "../../../services/endpoint";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../components/common/Pagination";
import { fetchAllPages } from "../../../services/paginatedData";
import "../styles/companyDashboard.css";
import "../styles/shortlist.css";

export default function ShortlistHiredPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Shortlisted");
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("All Jobs");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const { page, limit, goToPage } = usePagination();

  useEffect(() => {
    let cancelled = false;

    const loadCandidateGroups = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const jobs = await fetchAllPages(endpoint.company.getMyJobs, "jobs");

        const results = await Promise.all([
          ...jobs.filter((job) => job?._id || job?.id).map((job) =>
            fetchAllPages(
              endpoint.company.getJobApplications(job._id || job.id),
              "applications"
            )
          ),
          fetchAllPages(endpoint.company.getMyInterviews, "interviews"),
        ]);
        const applications = results.slice(0, -1).flat();
        const interviews = results[results.length - 1];

        const records = new Map();
        const allowed = new Set(["shortlisted", "selected", "interview", "interview_scheduled", "hired"]);
        for (const application of applications) {
          const rawStatus = String(application.status ?? "").toLowerCase();
          if (!allowed.has(rawStatus)) continue;
          const applicationId = String(application._id ?? application.applicationId ?? "");
          if (!applicationId) continue;
          const type = rawStatus === "hired" ? "hired"
            : rawStatus.startsWith("interview") ? "interview" : "shortlisted";
          records.set(applicationId, {
            id: applicationId,
            applicationId,
            name: application.candidate?.name ?? application.candidateName ?? "Unnamed candidate",
            email: application.candidate?.email ?? application.candidateEmail ?? "",
            jobTitle: application.jobId?.title ?? application.job?.title ?? "Job application",
            recruiter:
              application.jobId?.recruiterId &&
              typeof application.jobId.recruiterId === "object"
                ? application.jobId.recruiterId
                : null,
            status: type === "hired" ? "Hired" : type === "interview" ? "Interview Scheduled" : "Shortlisted",
            type,
          });
        }
        for (const interview of interviews) {
          const applicationId = String(interview.applicationId?._id ?? interview.applicationId ?? "");
          if (!applicationId) continue; // Cannot safely link an interview without its application ID.
          const existing = records.get(applicationId);
          if (existing?.type === "hired") continue;
          records.set(applicationId, {
            id: applicationId,
            applicationId,
            name: existing?.name ?? interview.candidateName ?? "Unnamed candidate",
            email: existing?.email ?? interview.candidateEmail ?? "",
            jobTitle: existing?.jobTitle ?? interview.jobId?.title ?? "Scheduled interview",
            recruiter: existing?.recruiter ??
              (interview.jobId?.recruiterId &&
              typeof interview.jobId.recruiterId === "object"
                ? interview.jobId.recruiterId
                : null),
            status: "Interview Scheduled",
            type: "interview",
          });
        }
        if (cancelled) return;
        setCandidates([...records.values()]);
      } catch (error) {
        if (!cancelled) {
          setCandidates([]);
          setLoadError(error?.response?.data?.message ?? "Unable to load candidates. Please try again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadCandidateGroups();
    return () => { cancelled = true; };
  }, []);

  const jobTitles = useMemo(() =>
    [...new Set(candidates.map((candidate) => candidate.jobTitle).filter(Boolean))].sort(),
    [candidates]
  );

  const tabCounts = useMemo(() => ({
    Shortlisted: candidates.filter((candidate) => candidate.type === "shortlisted").length,
    "Interview Scheduled": candidates.filter((candidate) => candidate.type === "interview").length,
    Hired: candidates.filter((candidate) => candidate.type === "hired").length,
  }), [candidates]);

  const displayedCandidates = candidates.filter((candidate) => {
    const matchesTab =
      activeTab === "Shortlisted"
        ? candidate.type === "shortlisted"
        : activeTab === "Interview Scheduled"
          ? candidate.type === "interview"
          : candidate.type === "hired";
    const searchValue = search.toLowerCase().trim();
    const matchesSearch =
      !searchValue ||
      `${candidate.name} ${candidate.jobTitle} ${candidate.email}`.toLowerCase().includes(searchValue);
    const matchesJob =
      jobFilter === "All Jobs" || candidate.jobTitle === jobFilter;
    const matchesStatus =
      statusFilter === "All Statuses" || candidate.status === statusFilter;

    return matchesTab && matchesSearch && matchesJob && matchesStatus;
  });
  const pageCandidates = displayedCandidates.slice((page - 1) * limit, page * limit);

  useEffect(() => {
    goToPage(1);
  }, [activeTab, search, jobFilter, statusFilter, goToPage]);

  const resetFilters = () => {
    setSearch("");
    setJobFilter("All Jobs");
    setStatusFilter("All Statuses");
    goToPage(1);
  };

  return (
    <div className="comp-page-container shortlist-page">
      {/* Header matching Reference 11 */}
      <div className="comp-page-header">
        <div className="comp-page-title-group">
          <h1>Shortlist & Hired Candidates</h1>
          <p>View shortlisted and hired candidates for your jobs.</p>
        </div>
      </div>

      {/* Tabs matching Reference 11 */}
      <div className="comp-tabs-pills shortlist-tabs">
        <button
          type="button"
          className={`comp-tab-pill ${activeTab === "Shortlisted" ? "active" : ""}`}
          onClick={() => setActiveTab("Shortlisted")}
        >
          <span>Shortlisted ({tabCounts.Shortlisted})</span>
        </button>
        <button
          type="button"
          className={`comp-tab-pill ${activeTab === "Interview Scheduled" ? "active" : ""}`}
          onClick={() => setActiveTab("Interview Scheduled")}
        >
          <span>Interview Scheduled ({tabCounts["Interview Scheduled"]})</span>
        </button>
        <button
          type="button"
          className={`comp-tab-pill ${activeTab === "Hired" ? "active" : ""}`}
          onClick={() => setActiveTab("Hired")}
        >
          <span>Hired ({tabCounts.Hired})</span>
        </button>
      </div>

      {loadError && <p className="shortlist-data-notice">{loadError}</p>}

      <div className="shortlist-filter-bar comp-filter-bar-modern">
        <div className="comp-filter-search-box">
          <Search size={16} className="comp-search-icon" />
          <input
            type="text"
            placeholder="Search by name, job title, or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="shortlist-filter-controls">
          <select
            className="comp-filter-select-modern"
            value={jobFilter}
            onChange={(event) => setJobFilter(event.target.value)}
          >
            <option value="All Jobs">Job Title</option>
            {jobTitles.map((title) => <option key={title} value={title}>{title}</option>)}
          </select>

          <select
            className="comp-filter-select-modern"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All Statuses">Status</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
            <option value="Hired">Hired</option>
          </select>

          <button type="button" className="comp-btn-filter-outline" onClick={resetFilters}>
            <Filter size={15} />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Candidate Table matching Reference 11 */}
      <div className="comp-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="comp-table-wrap" style={{ border: "none" }}>
          <table className="comp-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job Title / Posted By</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
                    <Users size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, fontSize: 15 }}>Loading live candidates...</div>
                  </td>
                </tr>
              ) : displayedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
                    <Users size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, fontSize: 15 }}>No candidates found</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      No candidates match these filters.
                    </div>
                  </td>
                </tr>
              ) : pageCandidates.map((cand) => (
                <tr key={cand.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background:
                            cand.status === "Hired"
                              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                              : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {cand.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{cand.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="shortlist-job">
                      <span className="shortlist-job-title">{cand.jobTitle}</span>
                      <span className="shortlist-recruiter">
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
                            className="shortlist-recruiter-avatar"
                          />
                        ) : (
                          <span className="shortlist-recruiter-avatar shortlist-recruiter-initials">
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
                  <td>
                    <span
                      className={`comp-badge ${
                        cand.status === "Hired"
                          ? "comp-badge-hired"
                          : cand.status === "Shortlisted"
                          ? "comp-badge-shortlisted"
                          : "comp-badge-new"
                      }`}
                    >
                      ● {cand.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="comp-btn comp-btn-secondary"
                      style={{ padding: "6px 14px", fontSize: 12.5 }}
                      onClick={() =>
                        navigate(
                          `/company/manage-applications?application=${encodeURIComponent(cand.applicationId)}`
                        )
                      }
                    >
                      <span>View</span>
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(displayedCandidates.length / limit)}
        totalItems={displayedCandidates.length}
        pageSize={limit}
        onPageChange={goToPage}
      />
    </div>
  );
}
