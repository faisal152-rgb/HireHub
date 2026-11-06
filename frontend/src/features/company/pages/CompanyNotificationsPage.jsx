import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  FileText,
  Calendar,
  UserCheck,
  CheckCircle,
  CheckCheck,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import { useAppSelector } from "../../../app/hooks";
import "../styles/companyDashboard.css";
import "../styles/notification.css";

// Helper for formatting real timestamps cleanly
function formatRelativeTime(dateString) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
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

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Helper to resolve icon and color style for notification types
function getNotificationVisuals(type = "") {
  const lower = type.toLowerCase();
  if (lower.includes("interview")) {
    return {
      icon: Calendar,
      color: "#fffbeb",
      iconColor: "#d97706",
      actionUrl: "/company/schedule-interview",
    };
  }
  if (lower.includes("application") || lower.includes("applicant")) {
    return {
      icon: FileText,
      color: "#eef2ff",
      iconColor: "#4f46e5",
      actionUrl: "/company/manage-applications",
    };
  }
  if (lower.includes("job")) {
    return {
      icon: Briefcase,
      color: "#f5f3ff",
      iconColor: "#7c3aed",
      actionUrl: "/company/manage-jobs",
    };
  }
  if (lower.includes("recruiter") || lower.includes("shortlist")) {
    return {
      icon: UserCheck,
      color: "#eff6ff",
      iconColor: "#2563eb",
      actionUrl: "/company/manage-recruiters",
    };
  }
  return {
    icon: Bell,
    color: "#f8fafc",
    iconColor: "#64748b",
    actionUrl: null,
  };
}

export default function CompanyNotificationsPage() {
  const { role } = useAppSelector((state) => state.auth);
  const isRecruiter = role === "recruiter";
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all' | 'unread' | 'application' | 'interview'

  // Fetch real notifications from backend
  const fetchNotifications = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await api.get(endpoint.company.getNotifications);
      const list = res.data?.notifications || res.data?.data || [];
      setNotifications(list);
    } catch (err) {
      console.error("Fetch notifications error:", err);
      setLoadError(
        err.response?.data?.message ||
          "Could not load notifications. Please check your connection."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark single notification as read
  const handleMarkRead = async (id, currentRead) => {
    if (currentRead) return;
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true } : n))
      );
      await api.patch(endpoint.company.readNotification(id));
    } catch (err) {
      console.warn("Mark read failed:", err.message);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await api.patch(endpoint.company.markAllAsRead);
    } catch (err) {
      console.warn("Mark all read failed:", err.message);
    }
  };

  // Clear single notification
  const handleClearSingle = async (e, id) => {
    e.stopPropagation();
    try {
      setNotifications((prev) => prev.filter((n) => n._id !== id && n.id !== id));
      await api.delete(`/company/notifications/${id}`);
    } catch (err) {
      console.warn("Clear single notification error:", err.message);
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (!window.confirm("Clear all notifications?")) return;
    try {
      setNotifications([]);
      await api.delete("/company/notifications/clear-all");
    } catch (err) {
      console.warn("Clear all notifications error:", err.message);
    }
  };

  const filtered = useMemo(() => {
    return notifications.filter((notif) => {
      const isUnread = !notif.isRead;
      const typeLower = (notif.type || "").toLowerCase();

      if (filterType === "unread") return isUnread;
      if (filterType === "application") return typeLower.includes("application");
      if (filterType === "interview") return typeLower.includes("interview");
      return true;
    });
  }, [notifications, filterType]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  return (
    <div className="comp-page-container">
      {/* Page Header */}
      <div className="comp-page-header">
        <div className="comp-page-title-group">
          <h1>{isRecruiter ? "Recruiter Notifications" : "Company Notifications"}</h1>
          <p>
            Real-time system alerts, applicant submissions, interview reminders, and job status updates.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="comp-btn comp-btn-secondary"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || isLoading}
          >
            <CheckCheck size={16} />
            <span>Mark All as Read ({unreadCount})</span>
          </button>

          {notifications.length > 0 && (
            <button
              type="button"
              className="comp-btn comp-btn-secondary"
              onClick={handleClearAll}
              style={{ color: "#ef4444" }}
              title="Clear all notifications"
              disabled={isLoading}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="comp-tabs">
        <button
          type="button"
          className={`comp-tab ${filterType === "all" ? "active" : ""}`}
          onClick={() => setFilterType("all")}
        >
          <span>All Notifications</span>
          <span className="comp-tab-count">{notifications.length}</span>
        </button>

        <button
          type="button"
          className={`comp-tab ${filterType === "unread" ? "active" : ""}`}
          onClick={() => setFilterType("unread")}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="comp-tab-count" style={{ background: "#ef4444", color: "#fff" }}>
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`comp-tab ${filterType === "application" ? "active" : ""}`}
          onClick={() => setFilterType("application")}
        >
          <span>Applications</span>
        </button>

        <button
          type="button"
          className={`comp-tab ${filterType === "interview" ? "active" : ""}`}
          onClick={() => setFilterType("interview")}
        >
          <span>Interviews</span>
        </button>
      </div>

      {/* Error Notice */}
      {loadError && (
        <div className="comp-form-alert comp-form-alert-error" style={{ marginBottom: 20 }}>
          <AlertCircle size={18} />
          <span>{loadError}</span>
        </div>
      )}

      {/* Notifications List Card */}
      <div className="comp-card" style={{ padding: "4px 0" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 12px auto" }} />
            <p style={{ margin: 0, fontSize: 14 }}>Loading notifications...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((notif) => {
              const id = notif._id || notif.id;
              const { icon: Icon, color, iconColor, actionUrl } = getNotificationVisuals(notif.type);
              const isRead = !!notif.isRead;
              const timeString = formatRelativeTime(notif.createdAt || notif.time);

              return (
                <div
                  key={id}
                  className={`comp-notif-item ${isRead ? "read" : "unread"}`}
                  onClick={() => handleMarkRead(id, isRead)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    borderBottom: "1px solid #f1f5f9",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                    background: isRead ? "#ffffff" : "#f8fafc",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: color,
                        color: iconColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} />
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 14.5,
                          fontWeight: isRead ? 600 : 700,
                          color: "#0f172a",
                          marginBottom: 4,
                        }}
                      >
                        {notif.title}
                      </div>
                      <div style={{ fontSize: 13.5, color: "#475569" }}>
                        {notif.message || notif.subtitle || "No additional details provided."}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: 12.5, color: "#94a3b8" }}>
                      {timeString}
                    </span>

                    {actionUrl && (
                      <Link
                        to={actionUrl}
                        className="comp-notif-action-link"
                        onClick={(e) => e.stopPropagation()}
                        title="View details"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleClearSingle(e, id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: 4,
                        display: "flex",
                        alignItems: "center",
                      }}
                      title="Delete notification"
                    >
                      <Trash2 size={14} />
                    </button>

                    {!isRead && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#5046e5",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Bell size={44} style={{ color: "#cbd5e1", marginBottom: 12 }} />
            <h4 style={{ margin: "0 0 6px 0", color: "#334155", fontSize: 16 }}>
              No notifications found
            </h4>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 13.5 }}>
              You are all caught up with your candidate updates and alerts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
