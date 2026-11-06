import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Briefcase,
  Users,
  UserCheck,
  Award,
  TrendingUp,
  UserPlus,
  FileText,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import { fetchAllPages } from "../../../services/paginatedData";
import InviteRecruiterModal from "../components/InviteRecruiterModal";
import RecruiterDashboard from "./RecruiterDashboard";
import "../styles/companyDashboard.css";
import { useAppSelector } from "../../../app/hooks";

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedHiringMonth, setSelectedHiringMonth] = useState(null);

  // Live state from backend
  const [recruiters, setRecruiters] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totals, setTotals] = useState({
    recruiters: 0,
    jobs: 0,
    applications: 0,
    hired: 0,
  });

  const { role, user: authUser } = useAppSelector((s) => s.auth);
  const isRecruiter = role === "recruiter";

  useEffect(() => {
    if (isRecruiter) return;
    let isMounted = true;

    const fetchCompanyData = async () => {
      setIsLoading(true);
      try {
        const [recRes, jobsRes, appsRes, profRes, hiredRes] = await Promise.allSettled([
          fetchAllPages(endpoint.company.getCompanyRecruiters, "recruiters"),
          api.get(endpoint.company.getMyJobs),
          fetchAllPages(endpoint.company.getAllApplications, "applications"),
          api.get(endpoint.company.getProfile),
          api.get(endpoint.company.getAllApplications, {
            params: { status: "hired", page: 1, limit: 1 },
          }),
        ]);

        if (!isMounted) return;

        setTotals({
          recruiters:
            recRes.status === "fulfilled"
              ? recRes.value.length
              : 0,
          jobs:
            jobsRes.status === "fulfilled"
              ? Number(jobsRes.value.data?.totalJobs ?? 0)
              : 0,
          applications:
            appsRes.status === "fulfilled"
              ? appsRes.value.length
              : 0,
          hired:
            hiredRes.status === "fulfilled"
              ? Number(hiredRes.value.data?.totalApplications ?? 0)
              : 0,
        });

        if (recRes.status === "fulfilled") {
          setRecruiters(recRes.value);
        }
        if (jobsRes.status === "fulfilled" && jobsRes.value.data?.jobs) {
          setJobs(jobsRes.value.data.jobs);
        }
        if (appsRes.status === "fulfilled") {
          setApplications(appsRes.value);
        }
        if (profRes.status === "fulfilled" && profRes.value.data?.company) {
          setCompanyProfile(profRes.value.data.company);
        }
      } catch (err) {
        console.error("Company Dashboard fetch error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCompanyData();
    return () => {
      isMounted = false;
    };
  }, [isRecruiter]);

  const initialCompany = useMemo(() => {
    if (companyProfile?.name) return companyProfile.name;
    return authUser?.companyName || authUser?.name || "ABC Technologies";
  }, [companyProfile, authUser]);

  // If user is a recruiter, render the Recruiter Dashboard matching the exact UI specification
  if (isRecruiter) {
    return <RecruiterDashboard />;
  }

  const stats = [
    {
      label: "Recruiters",
      val: String(totals.recruiters),
      delta: "registered company recruiters",
      icon: Users,
      colorClass: "comp-stat-icon-purple",
    },
    {
      label: "Jobs (By Recruiters)",
      val: String(totals.jobs),
      delta: "total company job postings",
      icon: Briefcase,
      colorClass: "comp-stat-icon-blue",
    },
    {
      label: "Total Applications",
      val: String(totals.applications),
      delta: "across all recruiter postings",
      icon: UserCheck,
      colorClass: "comp-stat-icon-green",
    },
    {
      label: "Hired Candidates",
      val: String(totals.hired),
      delta: "successful hires",
      icon: Award,
      colorClass: "comp-stat-icon-amber",
    },
  ];

  return (
    <div className="comp-page-container">
      {/* ── Page Header: Company Admin manages Recruiters & Views Analytics (No Post Job Button) ── */}
      <div className="comp-page-header">
        <div className="comp-page-title-group">
          <h1>Welcome, {initialCompany}</h1>
          <p>Manage your company recruiters, permissions, and view recruitment reports.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            className="comp-btn comp-btn-primary"
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlus size={16} />
            <span>Add Recruiter</span>
          </button>
          <Link to="/company/manage-recruiters" className="comp-btn comp-btn-secondary">
            <Users size={16} />
            <span>Recruiter Team</span>
          </Link>
        </div>
      </div>

      {/* ── Top Metric Cards ── */}
      <div className="comp-stats-grid">
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="comp-stat-card">
              <div className="comp-stat-top">
                <span className="comp-stat-label">{item.label}</span>
                <div className={`comp-stat-icon-wrap ${item.colorClass}`}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="comp-stat-val">{item.val}</div>
              <div className="comp-stat-delta positive">
                <TrendingUp size={14} />
                <span>{item.delta}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Middle Grid: Hiring Activity Chart + Quick Actions ── */}

      <div className="comp-mid-grid">
        {/* Monthly hiring activity: live application records only */}
        <div className="comp-card">
          <div className="comp-card-header">
            <h2 className="comp-card-title">Hiring Activity (All Recruiters)</h2>
            <Link to="/company/manage-applications" className="comp-card-link">
              View Details
            </Link>
          </div>
          {(() => {
            const today = new Date();
            const months = Array.from({ length: 10 }, (_, i) => {
              const date = new Date(today.getFullYear(), today.getMonth() - 9 + i, 1);
              return { year: date.getFullYear(), month: date.getMonth(), label: date.toLocaleString("en-US", { month: "short" }) };
            });
            const getHireDate = (app) => {
              const raw = app.hiredAt || app.selectedAt;
              if (!raw) return null;
              const date = new Date(raw);
              return Number.isNaN(date.getTime()) ? null : date;
            };
            const hiredApps = applications.filter((app) =>
              ["hired", "selected"].includes(String(app.status || "").toLowerCase()) && getHireDate(app)
            );
            const values = months.map(({ year, month }) =>
              hiredApps.filter((app) => {
                const date = getHireDate(app);
                return date.getFullYear() === year && date.getMonth() === month;
              }).length
            );
            const left = 46, right = 580, top = 20, bottom = 172;
            const maxValue = Math.max(1, ...values);
            const points = values.map((value, index) => ({
              x: left + (index * (right - left)) / (values.length - 1),
              y: bottom - (value / maxValue) * (bottom - top),
              value,
            }));
            const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
            const areaPath = `${linePath} L ${right} ${bottom} L ${left} ${bottom} Z`;
            return (
              <div style={{ width: "100%", paddingTop: 16 }}>
                <svg viewBox="0 0 620 220" style={{ width: "100%", height: "auto", display: "block" }}
                  role="group" aria-label="Monthly hiring activity. Select a dot to view recruiters.">
                  <defs>
                    <linearGradient id="hiringAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                    const y = bottom - fraction * (bottom - top);
                    return (
                      <g key={fraction}>
                        <line x1={left} y1={y} x2={right} y2={y} stroke="#e9edf5" strokeDasharray="4 5" />
                        <text x={left - 12} y={y + 4} fill="#94a3b8" fontSize="11" textAnchor="end">
                          {Math.round(fraction * maxValue)}
                        </text>
                      </g>
                    );
                  })}
                  <path d={areaPath} fill="url(#hiringAreaGradient)" />
                  <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round" />
                  {points.map((point, index) => (
                    <g key={`${months[index].year}-${months[index].month}`}
                      role="button" tabIndex={0}
                      aria-label={`${months[index].label} ${months[index].year}: ${point.value} hires. View recruiters`}
                      onClick={() => setSelectedHiringMonth(months[index])}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedHiringMonth(months[index]);
                        }
                      }}
                      style={{ cursor: "pointer", outlineOffset: 3 }}>
                      <circle cx={point.x} cy={point.y} r="13" fill="transparent" />
                      <circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#6366f1" strokeWidth="2.5" />
                      <title>{`${months[index].label} ${months[index].year}: ${point.value} hires`}</title>
                      <text x={point.x} y={bottom + 23} fill="#94a3b8" fontSize="11" textAnchor="middle">
                        {months[index].label}
                      </text>
                    </g>
                  ))}
                </svg>
                <div style={{ textAlign: "center", color: "#64748b", fontSize: 12 }}>
                  <span style={{ color: "#6366f1" }}>●</span> Hired candidates · Click a dot to view recruiters
                </div>
              </div>
            );
          })()}
        </div>

        {/* Quick Actions Card for Company */}
        <div className="comp-card">
          <div className="comp-card-header">
            <h2 className="comp-card-title">Company Actions</h2>
          </div>

          <div className="comp-quick-actions-list">
            <div
              className="comp-quick-action-item"
              onClick={() => setShowInviteModal(true)}
              style={{ cursor: "pointer" }}
            >
              <div className="comp-quick-icon">
                <UserPlus size={18} />
              </div>
              <span className="comp-quick-text">Invite Recruiter (Link / QR)</span>
              <ArrowRight size={15} style={{ color: "#94a3b8" }} />
            </div>

            <Link
              to="/company/manage-recruiters"
              className="comp-quick-action-item"
            >
              <div className="comp-quick-icon">
                <Users size={18} />
              </div>
              <span className="comp-quick-text">Manage Recruiter Team</span>
              <ArrowRight size={15} style={{ color: "#94a3b8" }} />
            </Link>

            <Link
              to="/company/manage-jobs"
              className="comp-quick-action-item"
            >
              <div className="comp-quick-icon">
                <Briefcase size={18} />
              </div>
              <span className="comp-quick-text">View Recruiter Postings</span>
              <ArrowRight size={15} style={{ color: "#94a3b8" }} />
            </Link>

            <Link
              to="/company/manage-applications"
              className="comp-quick-action-item"
            >
              <div className="comp-quick-icon">
                <FileText size={18} />
              </div>
              <span className="comp-quick-text">Review Candidate Submissions</span>
              <ArrowRight size={15} style={{ color: "#94a3b8" }} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Recent Jobs Table ── */}
      <div className="comp-card">
        <div className="comp-card-header">
          <h2 className="comp-card-title">Jobs Posted by Recruiters</h2>
          <Link to="/company/manage-jobs" className="comp-card-link">
            View All ({totals.jobs})
          </Link>
        </div>

        <div className="comp-table-wrap">
          {jobs.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#64748b" }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "14px" }}>
                No jobs have been posted by your recruiters yet.
              </p>
              <button
                type="button"
                className="comp-btn comp-btn-primary"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus size={15} />
                <span>Invite a Recruiter to post jobs</span>
              </button>
            </div>
          ) : (
            <table className="comp-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Job Type</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Posted Date</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 6).map((job) => (
                  <tr key={job._id || job.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "#eef2ff",
                            color: "#4f46e5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Briefcase size={16} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{job.title}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: "#334155", fontWeight: 500 }}>
                        {job.jobType || "Full Time"}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "#64748b" }}>{job.location || "Remote"}</span>
                    </td>
                    <td>
                      <span className="comp-badge comp-badge-active">
                        ● {job.status || "open"}
                      </span>
                    </td>
                    <td style={{ color: "#64748b" }}>
                      {job.createdAt
                        ? new Date(job.createdAt).toLocaleDateString()
                        : "Recent"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        to={`/company/manage-jobs?highlight=${job._id || job.id}`}
                        className="comp-btn comp-btn-secondary"
                        style={{ padding: "6px 12px", fontSize: 12.5 }}
                      >
                        <span>View</span>
                        <ExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Hiring detail modal: group confirmed monthly hires by recruiter */}
      {selectedHiringMonth && (() => {
        const hireDate = (app) => {
          const raw = app.hiredAt || app.selectedAt;
          const date = raw ? new Date(raw) : null;
          return date && !Number.isNaN(date.getTime()) ? date : null;
        };
        const matching = applications.filter((app) => {
          const date = hireDate(app);
          return ["hired", "selected"].includes(String(app.status || "").toLowerCase()) &&
            date && date.getFullYear() === selectedHiringMonth.year &&
            date.getMonth() === selectedHiringMonth.month;
        });
        const groups = new Map();
        matching.forEach((app) => {
          const raw = app.recruiterId || app.recruiter || app.jobId?.recruiterId;
          const id = typeof raw === "object" && raw !== null ? (raw._id || raw.id) : raw;
          const recruiter = recruiters.find((r) => String(r._id || r.id) === String(id)) ||
            (typeof raw === "object" ? raw : null);
          const key = id ? String(id) : "unknown";
          const current = groups.get(key) || { id, recruiter, count: 0 };
          current.count += 1;
          groups.set(key, current);
        });
        return (
          <div className="comp-modal-overlay" onClick={() => setSelectedHiringMonth(null)}>
            <div className="comp-modal-card" role="dialog" aria-modal="true"
              aria-label="Monthly recruiter hiring details"
              style={{ maxWidth: 560, width: "calc(100% - 32px)", padding: 24, maxHeight: "80vh", overflowY: "auto" }}
              onClick={(event) => event.stopPropagation()}>
              <div className="comp-card-header">
                <h2 className="comp-card-title">
                  {selectedHiringMonth.label} {selectedHiringMonth.year} · {matching.length} Hires
                </h2>
                <button type="button" className="comp-btn comp-btn-secondary"
                  onClick={() => setSelectedHiringMonth(null)}>Close</button>
              </div>
              {groups.size === 0 ? (
                <p style={{ color: "#64748b", padding: "16px 0" }}>No recorded hires for this month.</p>
              ) : Array.from(groups.entries()).map(([key, entry]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 14,
                  justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong>{entry.recruiter?.name || entry.recruiter?.fullName || "Recruiter not identified"}</strong>
                    <div style={{ color: "#64748b", fontSize: 13 }}>{entry.recruiter?.email || ""}</div>
                    <div style={{ color: "#4f46e5", fontSize: 13 }}>{entry.count} hires</div>
                  </div>
                  {entry.id && (
                    <button type="button" className="comp-btn comp-btn-secondary"
                      onClick={() => {
                        setSelectedHiringMonth(null);
                        navigate(`/company/manage-recruiters?recruiter=${encodeURIComponent(entry.id)}`);
                      }}>View Profile</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Add Recruiter Modal */}
      {showInviteModal && (
        <div className="comp-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div
            className="comp-modal-card"
            style={{ maxWidth: 680, padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <InviteRecruiterModal onClose={() => setShowInviteModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
