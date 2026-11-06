import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../../../app/hooks";
import {
  Briefcase,
  Users,
  FileCheck,
  Calendar,
  CheckCircle2,
  Calendar as CalendarIcon,
  Download,
  ChevronDown,
  Plus,
  PlusCircle,
  Loader2,
  Clock,
  Video,
  MapPin,
  ExternalLink,
  Activity,
  ArrowRight,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import { fetchAllPages } from "../../../services/paginatedData";
import "../styles/companyDashboard.css";
import "../styles/recruiterDashboard.css";

// Helper to format date strings cleanly
function formatDateTime(dateStr) {
  if (!dateStr) return "TBD";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "Recently";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function RecruiterDashboard() {
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic real date range (Current Month)
  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startStr = startOfMonth.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const endStr = endOfMonth.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} - ${endStr}`;
  }, []);

  // Dynamic date labels for chart based on real past weeks
  const chartDateLabels = useMemo(() => {
    const labels = [];
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i * 7);
      labels.push(
        d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      );
    }
    return labels;
  }, []);

  // Live state from backend
  const [liveJobs, setLiveJobs] = useState([]);
  const [liveApplications, setLiveApplications] = useState([]);
  const [liveInterviews, setLiveInterviews] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [dashboardTotals, setDashboardTotals] = useState({
    jobs: 0,
    applications: 0,
    shortlisted: 0,
    interviews: 0,
  });

  // Read recruiter info from Redux state (in-memory, no localStorage)
  const { user: authUser } = useAppSelector((s) => s.auth);
  const { recruiterName, companyName } = useMemo(() => {
    const source = profileData || authUser;
    return {
      recruiterName: source?.name || "Recruiter",
      companyName: source?.companyName || source?.company?.name || "Company",
    };
  }, [profileData, authUser]);

  // Fetch real data from backend APIs
  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [
          jobsRes,
          appsRes,
          interviewsRes,
          profileRes,
          shortlistedRes,
          interviewApplicationsRes,
        ] = await Promise.allSettled([
          fetchAllPages(endpoint.company.getMyJobs, "jobs"),
          fetchAllPages(endpoint.company.getAllApplications, "applications"),
          fetchAllPages(endpoint.company.getMyInterviews, "interviews"),
          api.get(endpoint.company.getRecruiterProfile),
          api.get(endpoint.company.getAllApplications, {
            params: { status: "shortlisted", page: 1, limit: 1 },
          }),
          api.get(endpoint.company.getAllApplications, {
            params: { status: "interview", page: 1, limit: 1 },
          }),
        ]);

        if (!isMounted) return;

        setDashboardTotals({
          jobs:
            jobsRes.status === "fulfilled"
              ? jobsRes.value.length
              : 0,
          applications:
            appsRes.status === "fulfilled"
              ? appsRes.value.length
              : 0,
          shortlisted:
            (shortlistedRes.status === "fulfilled"
              ? Number(shortlistedRes.value.data?.totalApplications ?? 0)
              : 0) +
            (interviewApplicationsRes.status === "fulfilled"
              ? Number(interviewApplicationsRes.value.data?.totalApplications ?? 0)
              : 0),
          interviews:
            interviewsRes.status === "fulfilled"
              ? interviewsRes.value.length
              : 0,
        });

        if (jobsRes.status === "fulfilled") {
          setLiveJobs(jobsRes.value);
        }
        if (appsRes.status === "fulfilled") {
          setLiveApplications(appsRes.value);
        }
        if (interviewsRes.status === "fulfilled") {
          setLiveInterviews(interviewsRes.value);
        }
        if (profileRes.status === "fulfilled" && profileRes.value.data?.profile) {
          const p = profileRes.value.data.profile;
          const c = profileRes.value.data.company;
          setProfileData({
            name: p.name,
            companyName: c?.name || p.companyId?.name || "Company",
          });
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute live metrics from backend data
  const myJobsCount = dashboardTotals.jobs;
  const applicationsCount = dashboardTotals.applications;
  const shortlistedCount = dashboardTotals.shortlisted;
  const hiredCount = liveApplications.filter(
    (a) => a.status === "selected" || a.status === "hired"
  ).length;

  const interviewsCount = dashboardTotals.interviews;

  // 4 Top stats matching CompanyDashboard comp-stat-card style exactly
  const stats = [
    {
      label: "My Jobs",
      val: String(myJobsCount),
      delta: "total job postings",
      icon: Briefcase,
      colorClass: "comp-stat-icon-purple",
    },
    {
      label: "Applications",
      val: String(applicationsCount),
      delta: `${applicationsCount} total received`,
      icon: Users,
      colorClass: "comp-stat-icon-blue",
    },
    {
      label: "Shortlisted",
      val: String(shortlistedCount),
      delta: `${shortlistedCount} candidate evaluations`,
      icon: FileCheck,
      colorClass: "comp-stat-icon-green",
    },
    {
      label: "Scheduled Interviews",
      val: String(interviewsCount),
      delta: "total interview records",
      icon: Calendar,
      colorClass: "comp-stat-icon-amber",
    },
  ];

  // ── Application Overview Chart: compute weekly data points from real applications ──
  const chartDataPoints = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 5 }, (_, i) => {
      const end = new Date(now);
      end.setDate(now.getDate() - (3 - i) * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 7);
      return { start, end, applied: 0, shortlisted: 0, hired: 0 };
    });

    liveApplications.forEach((app) => {
      const d = new Date(app.createdAt || app.appliedAt);
      if (isNaN(d.getTime())) return;
      for (const b of buckets) {
        if (d >= b.start && d < b.end) {
          b.applied += 1;
          if (app.status === "shortlisted" || app.status === "interview") b.shortlisted += 1;
          if (app.status === "selected" || app.status === "hired") b.hired += 1;
          break;
        }
      }
    });

    const xPos = [50, 158, 266, 374, 482];
    const chartBottom = 155;
    const chartHeight = 135; // 155 - 20

    const maxVal = Math.max(
      1,
      ...buckets.map((b) => Math.max(b.applied, b.shortlisted, b.hired))
    );

    const toY = (v) => chartBottom - (v / maxVal) * chartHeight;

    const pts = buckets.map((b, i) => ({
      x: xPos[i],
      yApplied: toY(b.applied),
      yShortlisted: toY(b.shortlisted),
      yHired: toY(b.hired),
    }));

    const buildPath = (key) =>
      pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p[key]}`).join(" ");

    return { pts, buildPath, maxVal };
  }, [liveApplications]);

  const hasChartData = applicationsCount > 0;

  const chartYLabels = useMemo(() => {
    const max = chartDataPoints.maxVal;
    if (!hasChartData) return [0, 0, 0, 0, 0];
    return [
      Math.round(max),
      Math.round(max * 0.75),
      Math.round(max * 0.5),
      Math.round(max * 0.25),
      0,
    ];
  }, [chartDataPoints.maxVal, hasChartData]);

  // Dynamic job breakdown calculated from live jobs
  const jobBreakdown = useMemo(() => {
    if (liveJobs.length === 0) {
      return [
        { title: "No jobs published yet", percentage: "0%", color: "#94a3b8" },
      ];
    }
    const colors = ["#4f46e5", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
    const countsByCategory = {};
    liveJobs.forEach((job) => {
      const cat = job.jobType || job.category || job.title || "General";
      countsByCategory[cat] = (countsByCategory[cat] || 0) + 1;
    });

    const entries = Object.entries(countsByCategory);
    return entries.slice(0, 5).map(([title, count], idx) => {
      const pct = Math.round((count / liveJobs.length) * 100);
      return {
        title: title.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        percentage: `${pct}%`,
        color: colors[idx % colors.length],
      };
    });
  }, [liveJobs]);

  // ── Job Performance Donut: compute strokeDasharray from real jobBreakdown ──
  // SVG circle r=56 → circumference = 2 * π * 56 ≈ 351.86
  const DONUT_CIRC = 2 * Math.PI * 56; // ~351.86
  const donutSegments = useMemo(() => {
    if (liveJobs.length === 0) return [];
    let offset = 0;
    return jobBreakdown.map((item) => {
      const pct = parseInt(item.percentage, 10) || 0;
      const dashLen = (pct / 100) * DONUT_CIRC;
      const seg = {
        color: item.color,
        dashArray: `${dashLen.toFixed(1)} ${DONUT_CIRC.toFixed(1)}`,
        dashOffset: (-offset).toFixed(1),
      };
      offset += dashLen;
      return seg;
    });
  }, [jobBreakdown, liveJobs.length]);

  // Compute Recent Activities from live applications and interviews
  const recentActivities = useMemo(() => {
    const list = [];

    liveApplications.forEach((app) => {
      list.push({
        id: `app-${app._id || app.id}`,
        type: "application",
        candidateName: app.candidateName || app.candidate?.name || "Candidate",
        jobTitle: app.jobTitle || app.job?.title || "Job Opening",
        status: app.status || "applied",
        date: app.createdAt || new Date(),
        actionUrl: `/company/manage-applications`,
      });
    });

    liveInterviews.forEach((inv) => {
      list.push({
        id: `inv-${inv._id || inv.id}`,
        type: "interview",
        candidateName: inv.candidateName || "Candidate",
        jobTitle: inv.jobTitle || inv.jobId?.title || "Interview",
        status: inv.status || "scheduled",
        date: inv.createdAt || inv.scheduledAt || new Date(),
        actionUrl: `/company/schedule-interview`,
      });
    });

    return list
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [liveApplications, liveInterviews]);

  // Compute Upcoming Scheduled Interviews
  const upcomingInterviews = useMemo(() => {
    return liveInterviews
      .filter((inv) => inv.status === "scheduled" || !inv.status)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
      .slice(0, 5);
  }, [liveInterviews]);

  return (
    <div className="comp-page-container">
      {/* ── Page Header (Identical to CompanyDashboard structure) ── */}
      <div className="comp-page-header">
        <div className="comp-page-title-group">
          <h1>Welcome, {recruiterName}</h1>
          <p>
            Connected to <strong>{companyName}</strong>. Manage job openings, review applicants, and conduct interviews.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/company/post-job" className="comp-btn comp-btn-primary">
            <PlusCircle size={16} />
            <span>Post New Job</span>
          </Link>
          <Link
            to="/company/schedule-interview" className="comp-btn comp-btn-secondary"
          >
            <Plus size={16} />
            <span>Schedule Interview</span>
          </Link>
        </div>
      </div>

      {/* ── Access Confirmation Banner ── */}
      <div className="recruiter-access-banner" style={{ marginBottom: 20 }}>
        <div className="recruiter-access-icon-wrap">
          <CheckCircle2 size={24} className="recruiter-access-check" />
        </div>
        <div className="recruiter-access-content">
          <h3 className="recruiter-access-heading">Recruiter Portal Active</h3>
          <p className="recruiter-access-subtext">
            You have full authorization to create job postings, evaluate candidate assessments, and schedule interviews under {companyName}.
          </p>
        </div>
      </div>

      {/* ── Top Metric Cards (Using Company Dashboard comp-stats-grid) ── */}
      <div className="comp-stats-grid">
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              to={item.link}
              className="comp-stat-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="comp-stat-header">
                <span className="comp-stat-label">{item.label}</span>
                <div className={`comp-stat-icon-wrap ${item.colorClass}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="comp-stat-val">{item.val}</div>
              <div className="comp-stat-delta positive">
                <TrendingUp size={14} />
                {item.delta}
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Filter / Date Bar ── */}
      <div className="recruiter-filter-bar" style={{ margin: "16px 0" }}>
        <div className="recruiter-date-picker-wrap">
          <CalendarIcon size={15} color="#0f172a" />
          <span className="recruiter-date-label">{dateRange}</span>
          <ChevronDown size={14} color="#64748b" />
        </div>

        <button
          type="button"
          className="comp-btn comp-btn-secondary"
          onClick={() => {
            const dataStr = JSON.stringify(
              {
                recruiter: recruiterName,
                company: companyName,
                dateRange,
                jobs: liveJobs,
                applicationsCount,
                shortlistedCount,
                interviewsCount,
                exportDate: new Date().toISOString(),
              },
              null,
              2
            );
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Recruiter-Report-${recruiterName.replace(/\s+/g, "_")}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download size={14} />
          <span>Export Summary</span>
        </button>
      </div>

      {/* ── Middle Grid: Analytics Cards (Using comp-mid-grid & comp-card) ── */}
      <div className="comp-mid-grid">
        {/* Left Card: Application Overview Line Chart */}
        <div className="comp-card">
          <div className="comp-card-header">
            <h2 className="comp-card-title">Application Overview</h2>
            <div className="recruiter-chart-legend">
              <span className="recruiter-legend-item">
                <span className="recruiter-legend-dot dot-applied" /> Applied ({applicationsCount})
              </span>
              <span className="recruiter-legend-item">
                <span className="recruiter-legend-dot dot-shortlisted" /> Shortlisted ({shortlistedCount})
              </span>
              <span className="recruiter-legend-item">
                <span className="recruiter-legend-dot dot-hired" /> Hired ({hiredCount})
              </span>
            </div>
          </div>

          <div className="recruiter-svg-wrap" style={{ marginTop: 12 }}>
            {!hasChartData ? (
              <div className="recruiter-empty-box" style={{ minHeight: 160 }}>
                <Activity size={32} color="#cbd5e1" />
                <p>No application data available for this period.</p>
              </div>
            ) : (
              <svg
                viewBox="0 0 540 180"
                className="recruiter-line-chart-svg"
                preserveAspectRatio="none"
              >
                {/* Horizontal Grid lines */}
                <line x1="30" y1="20" x2="520" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="55" x2="520" y2="55" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="90" x2="520" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="125" x2="520" y2="125" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="155" x2="520" y2="155" stroke="#e2e8f0" strokeWidth="1" />

                {/* Y Axis Labels — dynamic based on real max */}
                <text x="10" y="24" fill="#64748b" fontSize="10">{chartYLabels[0]}</text>
                <text x="10" y="59" fill="#64748b" fontSize="10">{chartYLabels[1]}</text>
                <text x="10" y="94" fill="#64748b" fontSize="10">{chartYLabels[2]}</text>
                <text x="10" y="129" fill="#64748b" fontSize="10">{chartYLabels[3]}</text>
                <text x="15" y="158" fill="#64748b" fontSize="10">{chartYLabels[4]}</text>

                {/* Line 1: Applied (Cyan) — real data */}
                <path
                  d={chartDataPoints.buildPath("yApplied")}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {chartDataPoints.pts.map((p, i) => (
                  <circle key={`a-${i}`} cx={p.x} cy={p.yApplied} r="3.5" fill="#ffffff" stroke="#38bdf8" strokeWidth="2" />
                ))}

                {/* Line 2: Shortlisted (Purple) — real data */}
                <path
                  d={chartDataPoints.buildPath("yShortlisted")}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {chartDataPoints.pts.map((p, i) => (
                  <circle key={`s-${i}`} cx={p.x} cy={p.yShortlisted} r="3.5" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
                ))}

                {/* Line 3: Hired (Pink) — real data */}
                <path
                  d={chartDataPoints.buildPath("yHired")}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {chartDataPoints.pts.map((p, i) => (
                  <circle key={`h-${i}`} cx={p.x} cy={p.yHired} r="3.5" fill="#ffffff" stroke="#f43f5e" strokeWidth="2" />
                ))}

                {/* X Axis Real Date Labels */}
                {chartDateLabels.map((date, idx) => (
                  <text
                    key={date}
                    x={50 + idx * 108}
                    y="172"
                    fill="#475569"
                    fontSize="10.5"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                    fontWeight="600"
                  >
                    {date}
                  </text>
                ))}
              </svg>
            )}
          </div>
        </div>

        {/* Right Card: Job Performance Donut Chart */}
        <div className="comp-card">
          <div className="comp-card-header">
            <h2 className="comp-card-title">Job Performance</h2>
            <Link to="/company/manage-jobs" className="comp-card-link">
              View All
            </Link>
          </div>

          <div className="recruiter-donut-layout">
            {/* SVG Donut */}
            <div className="recruiter-donut-container">
              <svg viewBox="0 0 160 160" className="recruiter-donut-svg">
                {donutSegments.length === 0 ? (
                  /* Empty state: full grey ring */
                  <circle
                    cx="80" cy="80" r="56"
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="20"
                  />
                ) : (
                  donutSegments.map((seg, i) => (
                    <circle
                      key={i}
                      cx="80" cy="80" r="56"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="20"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                    />
                  ))
                )}
              </svg>

              <div className="recruiter-donut-center">
                <span className="donut-center-number">{applicationsCount}</span>
                <span className="donut-center-label">Applications</span>
              </div>
            </div>

            {/* Breakdown List on right */}
            <div className="recruiter-breakdown-list">
              {jobBreakdown.map((item, i) => (
                <div key={i} className="recruiter-breakdown-row">
                  <div className="recruiter-breakdown-left">
                    <span
                      className="recruiter-breakdown-dot"
                      style={{ background: item.color }}
                    />
                    <span className="recruiter-breakdown-title">{item.title}</span>
                  </div>
                  <strong className="recruiter-breakdown-percent">{item.percentage}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: Recent Activities & Upcoming Interviews (comp-mid-grid) ── */}
      <div className="comp-mid-grid" style={{ marginTop: 24 }}>
        {/* Recent Activities Section */}
        <div className="comp-card">
          <div className="comp-card-header">
            <h2 className="comp-card-title">Recent Activities</h2>
            <Link to="/company/manage-applications" className="comp-card-link">
              View All Applications
            </Link>
          </div>

          <div className="recruiter-activity-list" style={{ marginTop: 8 }}>
            {recentActivities.length > 0 ? (
              recentActivities.map((act) => (
                <div key={act.id} className="recruiter-activity-item">
                  <div
                    className="recruiter-activity-icon"
                    style={{
                      background: act.type === "interview" ? "#fffbeb" : "#eef2ff",
                      color: act.type === "interview" ? "#d97706" : "#4f46e5",
                    }}
                  >
                    {act.type === "interview" ? <CalendarIcon size={16} /> : <FileCheck size={16} />}
                  </div>
                  <div className="recruiter-activity-info">
                    <div className="recruiter-activity-main">
                      <strong className="recruiter-activity-user">{act.candidateName}</strong>
                      <span className="recruiter-activity-text">
                        {act.type === "interview"
                          ? `interview scheduled for`
                          : `applied for`}
                      </span>
                      <span className="recruiter-activity-job">{act.jobTitle}</span>
                    </div>
                    <span className="recruiter-activity-time">{formatRelativeTime(act.date)}</span>
                  </div>
                  <span
                    className={`comp-pill-badge ${act.status === "shortlisted" || act.status === "interview"
                        ? "badge-active"
                        : "badge-draft"
                      }`}
                  >
                    {act.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="recruiter-empty-box">
                <Activity size={32} color="#cbd5e1" />
                <p>No recent candidate activities found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Interviews Section */}
        <div className="comp-card">
          <div className="comp-card-header">
            <h2 className="comp-card-title">Upcoming Interviews</h2>
            <Link to="/company/schedule-interview" className="comp-card-link">
              Schedule New
            </Link>
          </div>

          <div className="recruiter-interview-list" style={{ marginTop: 8 }}>
            {upcomingInterviews.length > 0 ? (
              upcomingInterviews.map((inv) => (
                <div key={inv._id || inv.id} className="recruiter-interview-item">
                  <div className="recruiter-interview-left">
                    <div className="recruiter-interview-avatar">
                      {(inv.candidateName || "C").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="recruiter-interview-candidate">{inv.candidateName}</h4>
                      <p className="recruiter-interview-role">{inv.jobTitle || "Job Position"}</p>
                      <div className="recruiter-interview-meta">
                        <span className="recruiter-interview-meta-item">
                          <Clock size={12} />
                          {formatDateTime(inv.scheduledAt)}
                        </span>
                        <span className="recruiter-interview-meta-item">
                          {inv.type === "online" ? <Video size={12} /> : <MapPin size={12} />}
                          {inv.type === "online" ? "Online Meeting" : inv.location || "On-site"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="recruiter-interview-right">
                    {inv.meetingLink ? (
                      <a
                        href={inv.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="comp-btn comp-btn-primary recruiter-join-btn"
                      >
                        <Video size={13} />
                        <span>Join</span>
                      </a>
                    ) : (
                      <span className="comp-pill-badge badge-paused">Scheduled</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="recruiter-empty-box">
                <CalendarIcon size={32} color="#cbd5e1" />
                <p>No upcoming interviews scheduled.</p>
                <Link
                  to="/company/schedule-interview"
                  className="comp-btn comp-btn-secondary"
                  style={{ marginTop: 8 }}
                >
                  Schedule an Interview
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
