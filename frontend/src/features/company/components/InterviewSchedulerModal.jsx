import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  User,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Edit3,
} from "lucide-react";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import { useAppSelector } from "../../../app/hooks";
import "../styles/companyDashboard.css";

function generateCleanMeetingLink() {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const part = (len) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `https://meet.google.com/${part(3)}-${part(4)}-${part(3)}`;
}

export default function InterviewSchedulerModal({
  applicationId,
  candidateName,
  candidateEmail,
  jobTitle,
  existingInterview = null,
  applications = [],
  onClose,
  onScheduled,
}) {
  const { role } = useAppSelector((s) => s.auth);
  const canManage = role === "recruiter" || role === "company";

  // Derive initial values from existingInterview or props
  const initialDate = existingInterview?.scheduledAt
    ? new Date(existingInterview.scheduledAt)
    : new Date();

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());

  // Determine initial time slot
  const formatTimeSlot = (d) => {
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? "0" + minutes : minutes;
    const strHours = hours < 10 ? "0" + hours : hours;
    return `${strHours}:${strMinutes} ${ampm}`;
  };

  const [selectedTime, setSelectedTime] = useState(() => {
    if (existingInterview?.scheduledAt) {
      return formatTimeSlot(new Date(existingInterview.scheduledAt));
    }
    return "11:00 AM";
  });

  const [selectedAppId, setSelectedAppId] = useState(
    applicationId || (applications.length > 0 ? applications[0].id || applications[0]._id : "")
  );

  const [meetingLink, setMeetingLink] = useState(
    existingInterview?.meetingLink || generateCleanMeetingLink()
  );
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [interviewType, setInterviewType] = useState(existingInterview?.type || "online");
  const [notes, setNotes] = useState(existingInterview?.notes || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const timeSlots = [
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "01:00 PM",
    "02:00 PM",
    "03:30 PM",
    "04:30 PM",
    "05:00 PM",
  ];

  // Resolve active candidate info
  const activeApp = useMemo(() => {
    if (applications.length > 0 && selectedAppId) {
      return (
        applications.find(
          (a) => (a.id || a._id || a.applicationId) === selectedAppId
        ) || null
      );
    }
    return null;
  }, [applications, selectedAppId]);

  const activeCandidateName =
    activeApp?.name ||
    activeApp?.candidate?.name ||
    candidateName ||
    existingInterview?.candidateName ||
    "Selected Candidate";

  const activeCandidateEmail =
    activeApp?.email ||
    activeApp?.candidate?.email ||
    candidateEmail ||
    existingInterview?.candidateEmail ||
    "";

  const activeJobTitle =
    activeApp?.jobTitle ||
    activeApp?.job?.title ||
    activeApp?.jobId?.title ||
    jobTitle ||
    existingInterview?.jobId?.title ||
    "Job Position";

  // Calendar calculations based on REAL current date
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const monthShort = currentDate.toLocaleString("default", { month: "short" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    setCurrentDate(prev);
    const maxDays = new Date(year, month, 0).getDate();
    if (selectedDay > maxDays) setSelectedDay(maxDays);
  };

  const handleNextMonth = () => {
    const next = new Date(year, month + 1, 1);
    setCurrentDate(next);
    const maxDays = new Date(year, month + 2, 0).getDate();
    if (selectedDay > maxDays) setSelectedDay(maxDays);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSendInvitation = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setSuccessNotice("");
    setErrorNotice("");

    const targetAppId = selectedAppId || applicationId;
    if (!existingInterview && !targetAppId) {
      setErrorNotice("Please select an applicant to schedule an interview.");
      setIsSubmitting(false);
      return;
    }

    // Build real scheduled Date object
    const scheduledDate = new Date(year, month, selectedDay);
    const match = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridiem = match[3].toUpperCase();
      if (meridiem === "PM" && hours < 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
      scheduledDate.setHours(hours, minutes, 0, 0);
    } else {
      scheduledDate.setHours(11, 0, 0, 0);
    }

    try {
      if (existingInterview) {
        const res = await api.patch(
          endpoint.company.rescheduleInterview(existingInterview._id),
          {
            scheduledAt: scheduledDate.toISOString(),
            meetingLink,
            duration: 30,
            notes,
          }
        );
        setSuccessNotice(
          `Interview successfully rescheduled for ${activeCandidateName} on ${selectedDay} ${monthShort} ${year}, ${selectedTime}!`
        );
        if (onScheduled) onScheduled(res.data?.interview);
        setTimeout(() => {
          if (onClose) onClose();
        }, 1600);
      } else {
        const res = await api.post(endpoint.company.scheduleInterview, {
          applicationId: targetAppId,
          scheduledAt: scheduledDate.toISOString(),
          timeSlot: selectedTime,
          duration: 30,
          type: interviewType,
          meetingLink,
          notes,
        });
        setSuccessNotice(
          `Interview invitation successfully sent to ${activeCandidateName} for ${selectedDay} ${monthShort} ${year}, ${selectedTime}!`
        );
        if (onScheduled) onScheduled(res.data?.interview);
        setTimeout(() => {
          if (onClose) onClose();
        }, 1600);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to schedule interview. Please check parameters and try again.";
      setErrorNotice(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* Header section */}
      <div className="comp-page-header" style={{ marginBottom: 20 }}>
        <div className="comp-page-title-group">
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
              margin: "0 0 4px 0",
              letterSpacing: "-0.3px",
            }}
          >
            {existingInterview ? "Reschedule Interview" : "Schedule Interview"}
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "#64748b" }}>
            {existingInterview
              ? `Select a new date and time slot for ${activeCandidateName}.`
              : "Choose a date, time slot, and meeting link to send an invitation."}
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            className="comp-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
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
            boxShadow: "0 2px 6px rgba(16, 185, 129, 0.08)",
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
            boxShadow: "0 2px 6px rgba(239, 68, 68, 0.08)",
          }}
        >
          <AlertCircle size={18} color="#ef4444" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Candidate Selector (if opened in standalone mode without fixed applicationId) */}
      {!existingInterview && !applicationId && applications.length > 0 && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
          }}
        >
          <label
            htmlFor="candidate-select"
            style={{
              display: "block",
              fontSize: 12.5,
              fontWeight: 600,
              color: "#475569",
              marginBottom: 6,
            }}
          >
            Select Candidate to Interview
          </label>
          <select
            id="candidate-select"
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13.5,
              fontWeight: 500,
              color: "#0f172a",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {applications.map((app) => {
              const appId = app.id || app._id || app.applicationId;
              const name = app.name || app.candidate?.name || "Applicant";
              const title = app.jobTitle || app.job?.title || app.jobId?.title || "Job";
              return (
                <option key={appId} value={appId}>
                  {name} — {title} ({app.status || "Applicant"})
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="comp-calendar-grid-wrap">
        {/* Left Card: Calendar & Real Date Picker */}
        <div className="comp-calendar-box">
          <div className="comp-calendar-header">
            <span className="comp-calendar-month-title">
              {monthName} {year}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="comp-icon-btn"
                style={{ width: 32, height: 32 }}
                onClick={handlePrevMonth}
                title="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="comp-icon-btn"
                style={{
                  height: 32,
                  padding: "0 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#4f46e5",
                  background: "#eef2ff",
                  borderRadius: 6,
                  border: "none",
                }}
                onClick={() => {
                  const now = new Date();
                  setCurrentDate(now);
                  setSelectedDay(now.getDate());
                }}
                title="Go to Today"
              >
                Today
              </button>
              <button
                type="button"
                className="comp-icon-btn"
                style={{ width: 32, height: 32 }}
                onClick={handleNextMonth}
                title="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="comp-calendar-days-header">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Date cells */}
          <div className="comp-calendar-dates">
            {/* Blank offset cells */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div
                key={`offset-${i}`}
                className="comp-calendar-date-cell outside"
              />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = dayNum === selectedDay;
              const isToday =
                isCurrentMonth && dayNum === today.getDate();

              return (
                <button
                  key={dayNum}
                  type="button"
                  className={`comp-calendar-date-cell ${
                    isSelected ? "selected" : ""
                  }`}
                  style={{
                    position: "relative",
                    ...(isToday && !isSelected
                      ? {
                          border: "1.5px solid #6366f1",
                          fontWeight: 700,
                          color: "#4f46e5",
                        }
                      : {}),
                  }}
                  onClick={() => setSelectedDay(dayNum)}
                >
                  {dayNum}
                  {isToday && !isSelected && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 3,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "#6366f1",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Time slot picker */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#64748b",
                }}
              >
                Select Time Slot
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "#5046e5",
                  fontWeight: 600,
                }}
              >
                {selectedTime}
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`comp-radio-pill ${
                    selectedTime === slot ? "selected" : ""
                  }`}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    borderRadius: 8,
                  }}
                  onClick={() => setSelectedTime(slot)}
                >
                  <Clock size={12} />
                  <span>{slot}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Card: Interview Details */}
        <div className="comp-interview-details-card">
          <div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#0f172a",
                margin: "0 0 20px 0",
              }}
            >
              Interview Details
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Candidate */}
              <div className="comp-interview-detail-item">
                <div className="comp-interview-detail-icon">
                  <User size={18} />
                </div>
                <div className="comp-interview-detail-content">
                  <span className="comp-interview-detail-label">Candidate</span>
                  <span className="comp-interview-detail-val">
                    {activeCandidateName}
                  </span>
                  {activeCandidateEmail && (
                    <span style={{ fontSize: 11.5, color: "#64748b" }}>
                      {activeCandidateEmail}
                    </span>
                  )}
                </div>
              </div>

              {/* Job Title */}
              <div className="comp-interview-detail-item">
                <div className="comp-interview-detail-icon">
                  <Briefcase size={18} />
                </div>
                <div className="comp-interview-detail-content">
                  <span className="comp-interview-detail-label">Job Title</span>
                  <span className="comp-interview-detail-val">
                    {activeJobTitle}
                  </span>
                </div>
              </div>

              {/* Date & Time */}
              <div className="comp-interview-detail-item">
                <div className="comp-interview-detail-icon">
                  <CalendarIcon size={18} />
                </div>
                <div className="comp-interview-detail-content">
                  <span className="comp-interview-detail-label">Date & Time</span>
                  <span className="comp-interview-detail-val">
                    {selectedDay} {monthShort} {year}, {selectedTime}
                  </span>
                </div>
              </div>

              {/* Meeting Link */}
              <div className="comp-interview-detail-item">
                <div className="comp-interview-detail-icon">
                  <Video size={18} />
                </div>
                <div className="comp-interview-detail-content" style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span className="comp-interview-detail-label">
                      Meeting Link
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingLink(!isEditingLink)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#6366f1",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <Edit3 size={12} />
                      <span>{isEditingLink ? "Done" : "Edit"}</span>
                    </button>
                  </div>

                  {isEditingLink ? (
                    <input
                      type="url"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        fontSize: 12.5,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        marginTop: 4,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 3,
                      }}
                    >
                      <a
                        href={meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 12.5,
                          color: "#5046e5",
                          fontWeight: 600,
                          textDecoration: "none",
                          wordBreak: "break-all",
                        }}
                        title="Open Meeting Link"
                      >
                        {meetingLink}
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        title="Copy link"
                        style={{
                          background: "none",
                          border: "none",
                          color: copied ? "#10b981" : "#94a3b8",
                          cursor: "pointer",
                          padding: 2,
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ marginTop: 26 }}>
            {!canManage && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "#eff6ff",
                  borderRadius: 8,
                  color: "#1e40af",
                  fontSize: 12.5,
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                ℹ️ View-only: Candidate interview invitations are managed by authorized team members.
              </div>
            )}

            <button
              type="button"
              className="comp-interview-btn-send"
              disabled={isSubmitting || !canManage}
              onClick={handleSendInvitation}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>
                    {existingInterview ? "Rescheduling..." : "Sending Invitation..."}
                  </span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>
                    {existingInterview
                      ? "Confirm Reschedule"
                      : "Send Interview Invitation"}
                  </span>
                </>
              )}
            </button>

            <div className="comp-interview-btn-row">
              <button
                type="button"
                className="comp-interview-btn-reschedule"
                onClick={() => {
                  const now = new Date();
                  setCurrentDate(now);
                  setSelectedDay(now.getDate());
                  setSelectedTime("02:00 PM");
                  setMeetingLink(generateCleanMeetingLink());
                }}
                title="Reset to today's default slot"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>

              <button
                type="button"
                className="comp-interview-btn-cancel"
                onClick={() => {
                  if (onClose) onClose();
                  else {
                    const now = new Date();
                    setSelectedDay(now.getDate());
                    setSelectedTime("11:00 AM");
                  }
                }}
              >
                <span>{onClose ? "Close" : "Cancel"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
