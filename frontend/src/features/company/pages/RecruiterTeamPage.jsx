import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UserPlus,
  MoreVertical,
  Mail,
  Shield,
  Trash2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import InviteRecruiterModal from "../components/InviteRecruiterModal";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import { useAppSelector } from "../../../app/hooks";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../components/common/Pagination";
import { getProfileImageUrl } from "../../../utils/profileImage";
import "../styles/companyDashboard.css";
import "../styles/recruiter.css";

const getRecruiterId = (recruiter) => String(recruiter._id || recruiter.id);

export default function RecruiterTeamPage({ autoOpenInvite = false }) {
  const location = useLocation();
  const navigate = useNavigate();

  const { role } = useAppSelector((s) => s.auth);
  const isRecruiter = role === "recruiter";

  const isInviteRoute =
    !isRecruiter &&
    (autoOpenInvite ||
      location.pathname.endsWith("/new") ||
      location.pathname.includes("add-recruiter") ||
      location.search.includes("invite"));

  const [showInviteModal, setShowInviteModal] = useState(isInviteRoute);
  const [actionMenuId, setActionMenuId] = useState(null);

  useEffect(() => {
    if (
      autoOpenInvite ||
      location.pathname.endsWith("/new") ||
      location.pathname.includes("add-recruiter") ||
      location.search.includes("invite")
    ) {
      setShowInviteModal(true);
    }
  }, [location, autoOpenInvite]);

  const handleCloseModal = () => {
    setShowInviteModal(false);
    if (location.pathname.endsWith("/new") || location.pathname.includes("add-recruiter")) {
      navigate("/company/manage-recruiters", { replace: true });
    }
  };
  const [recruiters, setRecruiters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { page, limit, goToPage, setLimit } = usePagination();
  const [totalRecruiters, setTotalRecruiters] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const fetchRequestId = useRef(0);

  const fetchRecruiters = useCallback(async () => {
    const requestId = ++fetchRequestId.current;
    setIsLoading(true);
    try {
      const res = await api.get(endpoint.company.getCompanyRecruiters, {
        params: { page, limit },
      });
      if (requestId !== fetchRequestId.current) return;
      if (res.data && res.data.recruiters) {
        setRecruiters(res.data.recruiters);
      } else {
        setRecruiters([]);
      }
      const total = Number(res.data?.totalRecruiters ?? res.data?.count ?? 0);
      setTotalRecruiters(total);
      const pages = Number(res.data?.totalPages ?? Math.ceil(total / limit));
      setTotalPages(pages);
      const serverPage = Number(res.data?.currentPage) || page;
      goToPage(Math.min(serverPage, Math.max(1, pages)));
      if (res.data?.limit) setLimit(res.data.limit);
    } catch (err) {
      if (requestId !== fetchRequestId.current) return;
      console.error("Fetch recruiters error:", err);
      setRecruiters([]);
    } finally {
      if (requestId === fetchRequestId.current) setIsLoading(false);
    }
  }, [page, limit, goToPage, setLimit]);

  useEffect(() => {
    fetchRecruiters();
    return () => {
      fetchRequestId.current += 1;
    };
  }, [fetchRecruiters]);

  const handleToggleStatus = async (id) => {
    const current = recruiters.find((rec) => String(rec._id || rec.id) === String(id));
    if (!current) return;

    const nextStatus = String(current.status).toLowerCase() === "active" ? "pending" : "active";

    try {
      const res = await api.patch(endpoint.company.updateRecruiterStatus?.(id) || `/recruiter/company/recruiters/${id}/status`, {
        status: nextStatus,
      });

      if (res?.data?.success) {
        setRecruiters((prev) =>
          prev.map((rec) =>
            String(rec._id || rec.id) === String(id)
              ? { ...rec, status: res.data.status || nextStatus }
              : rec
          )
        );
      }
    } catch (err) {
      console.error("Failed to update recruiter status:", err.response?.data || err);
    }

    setActionMenuId(null);
  };

  const handleRemoveRecruiter = async (id) => {
    if (!id) {
      console.error("Cannot remove recruiter: missing recruiter ID");
      return;
    }
    try {
      const res = await api.patch(endpoint.company.updateRecruiterStatus(id), {
        status: "inactive",
      });

      if (res?.data?.success) {
        setRecruiters((prev) =>
          prev.map((rec) =>
            String(rec._id || rec.id) === String(id)
              ? { ...rec, status: res.data.status || "inactive" }
              : rec
          )
        );
      }
      setActionMenuId(null);
    } catch (err) {
      console.error("Failed to deactivate recruiter:", err.response?.data || err);
    }
  };

  const handleViewProfile = (recruiter) => {
    navigate(`/company/recruiter-profile?recruiter=${encodeURIComponent(recruiter._id || recruiter.id)}`, {
      state: { recruiter },
    });
    setActionMenuId(null);
  };

  return (
    <div className="comp-page-container recruiter-team-page">
      {/* Header Bar matching Reference 4 (Recruiter List) */}
      <div className="comp-page-header">
        <div className="comp-page-title-group">
          <h1>{isRecruiter ? "Recruitment Team" : "Recruiter Management"}</h1>
          <p>
            {isRecruiter
              ? "View and collaborate with recruiters and talent specialists at your company."
              : "Manage your company recruiters, invite new members, and control access permissions."}
          </p>
        </div>
        {!isRecruiter && (
          <button
            type="button"
            className="comp-btn comp-btn-primary"
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlus size={16} />
            <span>+ Add Recruiter</span>
          </button>
        )}
      </div>

      {/* Recruiter List Card & Table */}
      <div className="comp-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="comp-table-wrap recruiter-team-table-wrap">
          <table className="comp-table recruiter-team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span style={{ marginLeft: 8 }}>Loading recruiters...</span>
                  </td>
                </tr>
              ) : recruiters.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
                    No recruiters found.
                  </td>
                </tr>
              ) : recruiters.map((rec) => {
                const recruiterId = getRecruiterId(rec);
                const recruiterName = rec.name || rec.fullName || "Recruiter";

                return (
                <tr key={recruiterId}>
                  <td>
                    <div className="recruiter-team-identity">
                      <div className="recruiter-team-avatar">
                        {recruiterName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                        {getProfileImageUrl(rec) && (
                          <img
                            src={getProfileImageUrl(rec)}
                            alt={`${recruiterName} profile`}
                            onError={(event) => event.currentTarget.remove()}
                          />
                        )}
                      </div>
                      <span className="recruiter-team-name">{recruiterName}</span>
                    </div>
                  </td>
                  <td className="recruiter-team-email">{rec.email || "—"}</td>
                  <td>
                    <span className="recruiter-team-role">{rec.role || "Recruiter"}</span>
                  </td>
                  <td>
                    <span
                      className={`comp-badge ${
                        String(rec.status).toLowerCase() === "active"
                          ? "comp-badge-active"
                          : "comp-badge-inreview"
                      }`}
                    >
                      ● {rec.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", position: "relative" }}>
                    <button
                      type="button"
                      className="comp-icon-btn comp-action-trigger"
                      aria-label={`Actions for ${rec.name}`}
                      aria-expanded={actionMenuId === recruiterId}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setActionMenuId((currentId) =>
                          currentId === recruiterId ? null : recruiterId
                        );
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {actionMenuId === recruiterId && (
                      <div className="comp-action-menu" role="menu">
                        <button
                          type="button"
                          className="comp-action-menu-item"
                          onClick={() => handleViewProfile(rec)}
                        >
                          <ExternalLink size={14} />
                          <span>View Profile</span>
                        </button>
                        {!isRecruiter && (
                          <>
                            <button
                              type="button"
                              className="comp-action-menu-item"
                              onClick={() => handleToggleStatus(rec._id || rec.id)}
                            >
                              {String(rec.status).toLowerCase() === "active" ? (
                                <CheckCircle2 size={14} className="comp-status-action-active" />
                              ) : (
                                <Shield size={14} />
                              )}
                              <span>
                                {String(rec.status).toLowerCase() === "active"
                                  ? "Mark Pending"
                                  : "Mark Active"}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="comp-action-menu-item danger"
                              onClick={() => handleRemoveRecruiter(rec._id || rec.id)}
                            >
                              <Trash2 size={14} />
                              <span>Remove Access</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalRecruiters}
        pageSize={limit}
        onPageChange={goToPage}
      />

      {/* Add Recruiter Modal */}
      {showInviteModal && (
        <div
          className="comp-modal-overlay"
          onClick={handleCloseModal}
        >
          <div
            className="comp-modal-card"
            style={{ maxWidth: 680, padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <InviteRecruiterModal onClose={handleCloseModal} />
          </div>
        </div>
      )}
    </div>
  );
}
