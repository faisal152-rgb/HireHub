import React, {useState, useRef, useEffect, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import {
  Link as LinkIcon,
  Copy,
  Check,
  Download,
  Mail,
  Send,
  Info,
  CheckCircle2,
  QrCode,
  Loader2,
  UserPlus,
  ChevronLeft,
  RefreshCw,
} from "lucide-react";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import "../styles/companyDashboard.css";
import "../styles/recruiter.css";

// ─── Activity: show/hide step panels (like animated tab switching) ─────────
function Activity({ active, children }) {
  if (!active) return null;
  return <div>{children}</div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InviteRecruiterModal({ onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const steps = ["Generate QR & Link", "Send Invitation", "Recruiter Joins"];

  // ── Fetch invite link & real QR code from backend ────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchInvite = async () => {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const res = await api.get(endpoint.company.getCompanyInvite);
        if (!isMounted) return;
        if (res.data) {
          const code = res.data.inviteCode || "";
          setInviteCode(code);
          const link =
            res.data.inviteUrl ||
            `${window.location.origin}/recruiter/join?code=${code}${res.data.companyId ? `&companyId=${res.data.companyId}` : ""
            }`;
          setInviteLink(link);
          if (res.data.qrCode) {
            setQrCode(res.data.qrCode);
          }
        }
      } catch (err) {
        console.error("Failed to load company invite:", err);
        if (isMounted) {
          setErrorMsg("Failed to load company invite information. Please check your connection.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchInvite();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Regenerate a fresh random invite link & QR ───────────────────────────────
  const handleRegenerateInvite = async () => {
    setIsRegenerating(true);
    setErrorMsg("");
    try {
      const res = await api.post(endpoint.company.regenerateCompanyInvite);
      if (res.data) {
        const code = res.data.inviteCode || "";
        setInviteCode(code);
        const link =
          res.data.inviteUrl ||
          `${window.location.origin}/recruiter/join?code=${code}${res.data.companyId ? `&companyId=${res.data.companyId}` : ""
          }`;
        setInviteLink(link);
        if (res.data.qrCode) {
          setQrCode(res.data.qrCode);
        }
      }
    } catch (err) {
      console.error("Failed to regenerate invite:", err);
      setErrorMsg("Failed to generate new random invite. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };

  const handleDownloadQR = () => {
    if (!qrCode) return;
    const a = document.createElement("a");
    a.href = qrCode;
    a.download = `HireHub-Invite-${inviteCode || "QR"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter a valid email address");
      return;
    }
    setIsSending(true);
    setErrorMsg("");
    setStatusMsg("");
    try {
      await api.post(endpoint.company.sendInviteToRecruiter, {
        email: email.trim(),
        inviteCode: inviteCode,
      });
      setStatusMsg(`Invitation email successfully sent to ${email}`);
      startTransition(() => setStep(3));
    } catch (error) {
      const responseData = error.response?.data;
      const message =
        responseData?.code === "RECRUITER_ALREADY_MEMBER"
          ? "This recruiter is already a member of your company. Please try another email."
          : responseData?.message ||
          "Unable to send the invitation email. Please try again.";
      setErrorMsg(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    else navigate("/company/manage-recruiters", { replace: true });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>

      {/* Page Header */}
      <div className="comp-page-header">
        <div className="comp-page-title-group">
          <h1>Add Recruiter</h1>
          <p>Invite a recruiter to join your company hiring portal.</p>
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

        {/* ── STEP 1: Generate QR & Link ─────────────────────────────────────── */}
        <Activity active={step === 1}>
          <div className="comp-step-section-header">
            <h3 className="comp-step-section-title">
              <QrCode size={20} color="#4f46e5" />
              <span>Invite Link &amp; QR Code</span>
            </h3>
            <p className="comp-step-section-desc">
              Generate a unique link and QR code to invite your recruiter.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr",
              gap: 24,
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            {/* Real Scannable QR Code */}
            <div
              style={{
                width: 180,
                height: 180,
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <Loader2 size={26} className="animate-spin" color="#4f46e5" />
                  <span style={{ fontSize: 12, color: "#64748b" }}>Loading QR...</span>
                </div>
              ) : qrCode ? (
                <img
                  src={qrCode}
                  alt={`Join with QR code ${inviteCode}`}
                  style={{ width: 168, height: 168, objectFit: "contain", borderRadius: 8 }}
                />
              ) : (
                <div style={{ textAlign: "center", padding: 12, color: "#94a3b8", fontSize: 12 }}>
                  QR code unavailable
                </div>
              )}
            </div>

            {/* Link + Actions */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0f172a",
                  }}
                >
                  Invite Link {inviteCode ? `(${inviteCode})` : ""}
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateInvite}
                  disabled={isRegenerating || isLoading}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#4f46e5",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: isRegenerating || isLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: 0,
                    opacity: isRegenerating || isLoading ? 0.6 : 1,
                  }}
                >
                  <RefreshCw
                    size={13}
                    style={{
                      animation: isRegenerating ? "spin 1s linear infinite" : "none",
                    }}
                  />
                  <span>{isRegenerating ? "Generating..." : "Generate Random Link"}</span>
                </button>
              </div>
              <div style={{ position: "relative", marginBottom: 16 }}>
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="comp-form-input"
                  style={{ paddingRight: 110, fontSize: 13, background: "#f8fafc" }}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="comp-btn comp-btn-secondary"
                  style={{
                    position: "absolute",
                    right: 4,
                    top: "10%",
                    padding: "2px 6px",
                    fontSize: "10px",
                    minHeight: "33px",
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={14} style={{ color: "#10b981" }} />
                      <span style={{ color: "#10b981" }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="comp-btn comp-btn-secondary"
                  style={{ flex: 1 }}
                >
                  <Download size={15} />
                  <span>Download QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="comp-btn comp-btn-primary"
                  style={{ flex: 1.2 }}
                >
                  <Mail size={15} />
                  <span>Send Invitation Email</span>
                </button>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 600,
                fontSize: 13.5,
                color: "#1e293b",
                marginBottom: 8,
              }}
            >
              <Info size={16} style={{ color: "#6366f1" }} />
              <span>How it works?</span>
            </div>
            <ol
              style={{
                margin: 0,
                paddingLeft: 22,
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.7,
              }}
            >
              <li>Generate QR code &amp; link above</li>
              <li>Share with your recruiter via email</li>
              <li>Recruiter clicks the link and gains instant access</li>
            </ol>
          </div>

          {/* Footer Actions */}
          <div className="comp-form-actions">
            <div />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                className="comp-btn comp-btn-secondary"
                onClick={handleClose}
              >
                Cancel
              </button>
            </div>
          </div>
        </Activity>

        {/* ── STEP 2: Send Invitation Email ──────────────────────────────────── */}
        <Activity active={step === 2}>
          <div className="comp-step-section-header">
            <h3 className="comp-step-section-title">
              <Mail size={20} color="#4f46e5" />
              <span>Send Invitation via Email</span>
            </h3>
            <p className="comp-step-section-desc">
              Enter your recruiter's professional email to send a secure, one-time invitation.
            </p>
          </div>

          <form onSubmit={handleSendEmail}>
            <div className="comp-form-grid">
              <div className="comp-form-field">
                <label className="comp-form-label" htmlFor="rec-email">
                  Recruiter Email *
                </label>
                <input
                  id="rec-email"
                  type="email"
                  required
                  className="comp-form-input"
                  placeholder="e.g. recruiter@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="comp-form-field">
                <label className="comp-form-label">Invitation Code</label>
                <input
                  type="text"
                  readOnly
                  className="comp-form-input"
                  value={inviteCode}
                  style={{ background: "#f8fafc" }}
                />
              </div>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#fef2f2",
                  color: "#dc2626",
                  borderRadius: 8,
                  fontSize: 13,
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                {errorMsg}
              </div>
            )}

            <div className="comp-form-actions">
              <button
                type="button"
                className="comp-btn comp-btn-secondary"
                onClick={() => setStep(1)}
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  type="button"
                  className="comp-btn comp-btn-secondary"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="comp-btn comp-btn-primary"
                >
                  {isSending ? (
                    <>
                      <Loader2 size={16} className="comp-btn-spinner" aria-hidden="true" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Send Invitation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </Activity>

        {/* ── STEP 3: Success ────────────────────────────────────────────────── */}
        <Activity active={step === 3}>
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#ecfdf5",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px auto",
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#000000",
                margin: "0 0 10px 0",
              }}
            >
              Invitation Sent Successfully!
            </h3>
            <p
              style={{
                color: "#64748b",
                fontSize: 14,
                maxWidth: 440,
                margin: "0 auto 28px auto",
                lineHeight: 1.6,
              }}
            >
              An invitation email has been dispatched to{" "}
              <strong>{email}</strong>. Once they click the link or scan the QR
              code, they will instantly join your company hiring portal.
            </p>

            <div
              style={{ display: "flex", justifyContent: "center", gap: 12 }}
            >
              <button
                type="button"
                className="comp-btn comp-btn-secondary"
                onClick={() => {
                  setStep(1);
                  setEmail("");
                  setStatusMsg("");
                }}
              >
                <UserPlus size={15} />
                <span>Invite Another</span>
              </button>
              <button
                type="button"
                className="comp-btn comp-btn-primary"
                onClick={handleClose}
              >
                <Check size={15} />
                <span>Done</span>
              </button>
            </div>
          </div>
        </Activity>

      </div>
    </div>
  );
}
