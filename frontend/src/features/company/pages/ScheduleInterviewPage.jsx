import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  User,
  Briefcase,
  Plus,
  Search,
  RotateCcw,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Filter,
} from "lucide-react";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import { useAppSelector } from "../../../app/hooks";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../components/common/Pagination";
import { fetchAllPages } from "../../../services/paginatedData";
import InterviewSchedulerModal from "../components/InterviewSchedulerModal";
import "../styles/companyDashboard.css";

export default function ScheduleInterviewPage() {
  const location = useLocation();
  const { role } = useAppSelector((s) => s.auth);
  const canManage = role === "recruiter" || role === "company";

  // State
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  const [activeTab, setActiveTab] = useState("All"); // All, Scheduled, Rescheduled, Completed, Cancelled
  const [searchQuery, setSearchQuery] = useState("");
  const { page, limit, goToPage, setLimit } = usePagination();
  const [totalInterviews, setTotalInterviews] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [interviewStats, setInterviewStats] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  });
  const interviewRequestId = useRef(0);

  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedInterviewForReschedule, setSelectedInterviewForReschedule] =
    useState(null);
  const [cancellingInterviewId, setCancellingInterviewId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Check if candidate passed from location.state
  const preselectedCandidate = location.state?.candidate || null;
  const preselectedAppId =
    location.state?.applicationId ||
    preselectedCandidate?.id ||
    preselectedCandidate?._id ||
    null;

  // 1. Fetch Real Interviews
  const fetchInterviews = useCallback(async () => {
    const requestId = ++interviewRequestId.current;
    try {
      setIsLoading(true);
      setErrorNotice("");
      const params = { page, limit };
      if (activeTab !== "All") params.status = activeTab.toLowerCase();
      const res = await api.get(endpoint.company.getMyInterviews, { params });
      if (requestId !== interviewRequestId.current) return;
      const raw = res.data?.interviews || [];
      setInterviews(raw);
      const total = Number(res.data?.total ?? res.data?.count ?? raw.length);
      setTotalInterviews(total);
      const pages = Number(res.data?.totalPages ?? Math.ceil(total / limit));
      setTotalPages(pages);
      const serverPage = Number(res.data?.currentPage) || page;
      goToPage(Math.min(serverPage, Math.max(1, pages)));
      if (res.data?.limit) setLimit(res.data.limit);
    } catch (err) {
      if (requestId !== interviewRequestId.current) return;
      console.error("Fetch interviews error:", err);
      setErrorNotice(
        err.response?.data?.message || "Failed to load scheduled interviews."
      );
    } finally {
      if (requestId === interviewRequestId.current) setIsLoading(false);
    }
  }, [page, limit, activeTab, goToPage, setLimit]);

  // 2. Fetch Real Applications (to allow choosing candidates when scheduling new)
  const fetchApplications = useCallback(async () => {
    try {
      setApplications(
        await fetchAllPages(endpoint.company.getAllApplications, "applications")
      );
    } catch (err) {
      console.error("Fetch applications error:", err);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
    return () => {
      interviewRequestId.current += 1;
    };
  }, [fetchInterviews]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const fetchInterviewStats = useCallback(async () => {
    try {
      const [all, scheduled, rescheduled, completed, cancelled] =
        await Promise.all(
          ["all", "scheduled", "rescheduled", "completed", "cancelled"].map(
            (status) =>
              api.get(endpoint.company.getMyInterviews, {
                params: { page: 1, limit: 1, status },
              })
          )
        );
      const totalFor = (response) =>
        Number(response.data?.total ?? response.data?.count ?? 0);
      setInterviewStats({
        total: totalFor(all),
        scheduled: totalFor(scheduled) + totalFor(rescheduled),
        completed: totalFor(completed),
        cancelled: totalFor(cancelled),
      });
    } catch (err) {
      console.error("Fetch interview summary error:", err);
    }
  }, []);

  useEffect(() => {
    fetchInterviewStats();
  }, [fetchInterviewStats]);

  // If navigated with preselected candidate, open the modal automatically
  useEffect(() => {
    if (preselectedCandidate || preselectedAppId) {
      setShowScheduleModal(true);
    }
  }, [preselectedCandidate, preselectedAppId]);

  // Handle Cancel Interview
  const handleConfirmCancel = async () => {
    if (!cancellingInterviewId) return;
    setIsCancelling(true);
    try {
      await api.patch(endpoint.company.cancelInterview(cancellingInterviewId));
      setSuccessNotice("Interview successfully cancelled.");
      setCancellingInterviewId(null);
      fetchInterviews();
      fetchInterviewStats();
      setTimeout(() => setSuccessNotice(""), 3000);
    } catch (err) {
      setErrorNotice(
        err.response?.data?.message || "Failed to cancel interview."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // Copy meeting link
  const handleCopyLink = (id, link) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Stats calculation
  // Filtered Interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      // Tab filter
      if (activeTab === "Scheduled" && item.status !== "scheduled") return false;
      if (activeTab === "Rescheduled" && item.status !== "rescheduled") return false;
      if (activeTab === "Completed" && item.status !== "completed") return false;
      if (activeTab === "Cancelled" && item.status !== "cancelled") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const candName = (item.candidateName || "").toLowerCase();
        const candEmail = (item.candidateEmail || "").toLowerCase();
        const jobTitle = (
          item.jobId?.title ||
          item.jobTitle ||
          ""
        ).toLowerCase();
        return (
          candName.includes(q) || candEmail.includes(q) || jobTitle.includes(q)
        );
      }
      return true;
    });
  }, [interviews, activeTab, searchQuery]);

  // Format date helper
  const formatInterviewDate = (isoString) => {
    if (!isoString) return { dateStr: "TBD", timeStr: "—" };
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { dateStr, timeStr };
  };

  return (
    <div className="comp-page-container">
      {/* Top Header */}
      <div
        className="comp-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="comp-page-title-group">
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#0f172a",
              margin: "0 0 6px 0",
              letterSpacing: "-0.4px",
            }}
          >
            Interview Management
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
            Schedule interviews, manage calendar slots, and track candidate sessions in real time.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            className="comp-btn comp-btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              borderRadius: 10,
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
            }}
            onClick={() => {
              setSelectedInterviewForReschedule(null);
              setShowScheduleModal(true);
            }}
          >
            <Plus size={16} />
            <span>Schedule Interview</span>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "12px 18px",
            borderRadius: 12,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorNotice && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "12px 18px",
            borderRadius: 12,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          <AlertCircle size={18} color="#ef4444" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
            Total Interviews
          </span>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#0f172a",
              marginTop: 4,
            }}
          >
            {interviewStats.total}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <span style={{ fontSize: 13, color: "#4f46e5", fontWeight: 600 }}>
            Scheduled & Upcoming
          </span>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#4f46e5",
              marginTop: 4,
            }}
          >
            {interviewStats.scheduled}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <span style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
            Completed
          </span>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#059669",
              marginTop: 4,
            }}
          >
            {interviewStats.completed}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
            Cancelled
          </span>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#dc2626",
              marginTop: 4,
            }}
          >
            {interviewStats.cancelled}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: "14px 18px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", "Scheduled", "Rescheduled", "Completed", "Cancelled"].map(
            (tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    goToPage(1);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: isActive ? "#4f46e5" : "#f1f5f9",
                    color: isActive ? "#ffffff" : "#475569",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab}
                </button>
              );
            }
          )}
        </div>

        {/* Search input */}
        <div
          style={{
            position: "relative",
            minWidth: 260,
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            type="text"
            placeholder="Search candidate, job title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              goToPage(1);
            }}
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              outline: "none",
              color: "#0f172a",
            }}
          />
        </div>
      </div>

      {/* Interviews Content */}
      {isLoading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
          }}
        >
          <Loader2 size={32} className="animate-spin" color="#4f46e5" />
          <p style={{ marginTop: 12, fontSize: 14, color: "#64748b" }}>
            Loading scheduled interviews...
          </p>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#eef2ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              color: "#4f46e5",
            }}
          >
            <CalendarIcon size={28} />
          </div>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#0f172a",
              margin: "0 0 6px 0",
            }}
          >
            {searchQuery || activeTab !== "All"
              ? "No matching interviews found"
              : "No interviews scheduled yet"}
          </h3>
          <p
            style={{
              fontSize: 13.5,
              color: "#64748b",
              maxWidth: 420,
              margin: "0 0 20px 0",
            }}
          >
            {searchQuery || activeTab !== "All"
              ? "Try adjusting your search query or status filter to see other records."
              : "Set up your first interview session with an applicant to start meeting candidates."}
          </p>
          {canManage && (
            <button
              type="button"
              className="comp-btn comp-btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                fontSize: 13.5,
                fontWeight: 600,
                borderRadius: 10,
                background: "#4f46e5",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => {
                setSelectedInterviewForReschedule(null);
                setShowScheduleModal(true);
              }}
            >
              <Plus size={16} />
              <span>Schedule Interview</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredInterviews.map((interview) => {
            const { dateStr, timeStr } = formatInterviewDate(
              interview.scheduledAt
            );
            const status = interview.status || "scheduled";
            const jobTitle =
              interview.jobId?.title ||
              interview.jobTitle ||
              "Position Applied";

            const isUpcoming =
              status === "scheduled" || status === "rescheduled";

            return (
              <div
                key={interview._id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                  transition: "all 0.2s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                {/* Left: Candidate & Job Details */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    minWidth: 260,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: isUpcoming ? "#eef2ff" : "#f1f5f9",
                      color: isUpcoming ? "#4f46e5" : "#64748b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 17,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {(interview.candidateName || "C").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 15.5,
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        {interview.candidateName}
                      </h4>
                      {/* Status Badge */}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          textTransform: "capitalize",
                          ...(status === "scheduled"
                            ? { background: "#ecfdf5", color: "#059669" }
                            : status === "rescheduled"
                            ? { background: "#fef3c7", color: "#d97706" }
                            : status === "completed"
                            ? { background: "#eff6ff", color: "#2563eb" }
                            : { background: "#fee2e2", color: "#dc2626" }),
                        }}
                      >
                        {status}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginTop: 4,
                        fontSize: 12.5,
                        color: "#64748b",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          color: "#475569",
                          fontWeight: 500,
                        }}
                      >
                        <Briefcase size={13} />
                        {jobTitle}
                      </span>
                      {interview.candidateEmail && (
                        <span>• {interview.candidateEmail}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Date, Time & Meeting Link */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Date & Time */}
                  <div style={{ minWidth: 160 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#0f172a",
                      }}
                    >
                      <CalendarIcon size={14} color="#6366f1" />
                      <span>{dateStr}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: "#64748b",
                        marginTop: 3,
                      }}
                    >
                      <Clock size={13} />
                      <span>{timeStr} ({interview.duration || 30} mins)</span>
                    </div>
                  </div>

                  {/* Meeting Link */}
                  {interview.meetingLink && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "#f8fafc",
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        maxWidth: 240,
                      }}
                    >
                      <Video size={14} color="#4f46e5" />
                      <a
                        href={interview.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 12,
                          color: "#4f46e5",
                          fontWeight: 600,
                          textDecoration: "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={interview.meetingLink}
                      >
                        Join Meeting
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyLink(interview._id, interview.meetingLink)
                        }
                        title="Copy link"
                        style={{
                          background: "none",
                          border: "none",
                          color:
                            copiedId === interview._id ? "#10b981" : "#94a3b8",
                          cursor: "pointer",
                          padding: 2,
                          display: "flex",
                        }}
                      >
                        {copiedId === interview._id ? (
                          <Check size={13} />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                {canManage && isUpcoming && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 12px",
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "#4f46e5",
                        background: "#eef2ff",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setSelectedInterviewForReschedule(interview);
                        setShowScheduleModal(true);
                      }}
                    >
                      <RotateCcw size={13} />
                      <span>Reschedule</span>
                    </button>

                    <button
                      type="button"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 12px",
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "#dc2626",
                        background: "#fef2f2",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                      onClick={() => setCancellingInterviewId(interview._id)}
                    >
                      <XCircle size={13} />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalInterviews}
        pageSize={limit}
        onPageChange={goToPage}
      />

      {/* Schedule / Reschedule Modal Overlay */}
      {showScheduleModal && (
        <div
          className="comp-modal-overlay"
          onClick={() => {
            setShowScheduleModal(false);
            setSelectedInterviewForReschedule(null);
          }}
        >
          <div
            className="comp-modal-card"
            style={{ maxWidth: 880, padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "24px 28px" }}>
              <InterviewSchedulerModal
                applicationId={
                  preselectedAppId ||
                  selectedInterviewForReschedule?.applicationId
                }
                candidateName={
                  preselectedCandidate?.name ||
                  selectedInterviewForReschedule?.candidateName
                }
                candidateEmail={
                  preselectedCandidate?.email ||
                  selectedInterviewForReschedule?.candidateEmail
                }
                jobTitle={
                  preselectedCandidate?.jobTitle ||
                  selectedInterviewForReschedule?.jobId?.title
                }
                existingInterview={selectedInterviewForReschedule}
                applications={applications}
                onClose={() => {
                  setShowScheduleModal(false);
                  setSelectedInterviewForReschedule(null);
                }}
                onScheduled={() => {
                  fetchInterviews();
                  fetchInterviewStats();
                  setShowScheduleModal(false);
                  setSelectedInterviewForReschedule(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {cancellingInterviewId && (
        <div
          className="comp-modal-overlay"
          onClick={() => setCancellingInterviewId(null)}
        >
          <div
            className="comp-modal-card"
            style={{ maxWidth: 440, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <XCircle size={26} />
            </div>

            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#0f172a",
                margin: "0 0 8px 0",
              }}
            >
              Cancel Interview?
            </h3>
            <p
              style={{
                fontSize: 13.5,
                color: "#64748b",
                margin: "0 0 20px 0",
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to cancel this scheduled interview? The candidate will be notified of the cancellation.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="comp-btn comp-btn-secondary"
                onClick={() => setCancellingInterviewId(null)}
                disabled={isCancelling}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Keep Interview
              </button>
              <button
                type="button"
                className="comp-btn"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {isCancelling ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Interview</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
