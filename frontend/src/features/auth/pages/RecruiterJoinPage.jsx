import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Link as LinkIcon,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Upload,
  VideoOff,
  Clipboard,
  X,
} from "lucide-react";
import jsQR from "jsqr";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import { recruiterJoinCompany, updateToken } from "../authSlice";
import { setAccessToken } from "../../../utils/tokenStorage";
import "../styles/auth.css";

// SVG Vector illustration of hand holding smartphone with QR code
const HandPhoneQrIllustration = () => (
  <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="recruiter-join-vector">
    {/* Ambient Glow */}
    <circle cx="160" cy="140" r="110" fill="rgba(91, 93, 250, 0.18)" />

    {/* Background cloud shapes */}
    <path d="M70 120 Q80 100 100 105 Q115 90 135 105 Q150 115 145 130 H75 Z" fill="rgba(129, 140, 248, 0.25)" />
    <path d="M210 160 Q225 145 245 155 Q255 170 240 185 H205 Z" fill="rgba(129, 140, 248, 0.2)" />

    {/* Hand */}
    <path d="M120 280 C110 240 105 210 90 190 C75 170 65 175 60 185 C55 195 65 210 80 230 L95 280 Z" fill="#4338CA" />
    <path d="M95 195 C105 180 125 185 130 200 L125 280 H180 L185 240 C195 215 190 195 175 190 C160 185 145 200 145 215 Z" fill="#6366F1" />

    {/* Smartphone Frame */}
    <rect x="110" y="45" width="115" height="205" rx="20" fill="#1E1B4B" stroke="#4F46E5" strokeWidth="3" />
    <rect x="116" y="55" width="103" height="185" rx="14" fill="#0F172A" />

    {/* Speaker / Notch */}
    <rect x="145" y="62" width="45" height="4" rx="2" fill="#312E81" />

    {/* Phone Screen QR Code Container */}
    <rect x="126" y="80" width="83" height="83" rx="8" fill="#1E1B4B" />

    {/* Focus Brackets on Phone */}
    <path d="M130 92 V84 H138" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M205 92 V84 H197" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M130 151 V159 H138" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M205 151 V159 H197" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />

    {/* Mini QR Graphic */}
    <rect x="138" y="92" width="18" height="18" rx="3" fill="#A5B4FC" />
    <rect x="142" y="96" width="10" height="10" rx="1.5" fill="#1E1B4B" />

    <rect x="179" y="92" width="18" height="18" rx="3" fill="#A5B4FC" />
    <rect x="183" y="96" width="10" height="10" rx="1.5" fill="#1E1B4B" />

    <rect x="138" y="133" width="18" height="18" rx="3" fill="#A5B4FC" />
    <rect x="142" y="137" width="10" height="10" rx="1.5" fill="#1E1B4B" />

    {/* QR Data Pixels */}
    <rect x="162" y="95" width="8" height="8" fill="#C7D2FE" />
    <rect x="170" y="110" width="8" height="16" fill="#C7D2FE" />
    <rect x="160" y="125" width="14" height="6" fill="#C7D2FE" />
    <rect x="180" y="125" width="8" height="8" fill="#C7D2FE" />

    {/* Finger Thumb over phone */}
    <path d="M90 145 C90 135 105 135 115 145 L130 180 C125 190 110 190 100 180 Z" fill="#818CF8" />

    {/* Bottom Button Graphic on Phone */}
    <rect x="140" y="210" width="55" height="14" rx="7" fill="#6366F1" />
  </svg>
);

export default function RecruiterJoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("qr"); // "qr" or "link"
  const [inviteCode, setInviteCode] = useState(searchParams.get("code") || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedCompany, setVerifiedCompany] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Live Camera & Image Scanning states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const fileInputRef = useRef(null);

  // Recruiter form fields
  const [joinForm, setJoinForm] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    department: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle Tab Switch
  const handleTabChange = (newTab) => {
    if (newTab !== activeTab) {
      stopCamera();
      setActiveTab(newTab);
      setErrorMsg("");
      setCameraError("");
    }
  };

  // Helper: extract invite code from raw URL or string
  const extractCode = (raw) => {
    if (!raw) return "";
    const trimmed = raw.trim();
    if (trimmed.includes("code=")) {
      const match = trimmed.match(/code=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim();
      }
    }
    return trimmed;
  };

  // Verify invite code with backend
  const handleVerify = useCallback(async (codeToVerify) => {
    const code = (codeToVerify || inviteCode).trim();
    if (!code) {
      setErrorMsg("Please enter a valid invite code or link.");
      return;
    }

    setIsVerifying(true);
    setErrorMsg("");
    setCameraError("");
    try {
      const cleanCode = extractCode(code);

      // 1. Attempt existing member verification.
      // If access token is in memory, or if a valid refresh token cookie exists,
      // this verifies membership immediately or seamlessly via api 401 refresh interceptor.
      try {
        const membership = await api.post(endpoint.recruiter.verifyCompanyMembership, {
          code: cleanCode,
        });
        if (membership.data?.success && membership.data?.alreadyMember) {
          const newToken = membership.data.accessToken;
          if (newToken) {
            setAccessToken(newToken);
            dispatch(updateToken(newToken));
          }
          setSuccessMsg("Company membership verified successfully.");
          navigate(membership.data.redirect || "/recruiter/dashboard", { replace: true });
          return;
        }
      } catch (membershipError) {
        if (membershipError.response?.status === 403) {
          setErrorMsg(membershipError.response?.data?.message || "Your company access has been revoked. Contact the company administrator.");
          return;
        }
        // 401 or non-membership error means no valid session or cookie — proceed to public verifyInviteCode
      }

      // 2. Public verification of the invite code status
      const res = await api.get(endpoint.recruiter.verifyInviteCode(cleanCode));
      if (res.data && res.data.valid) {
        if (res.data.requiresJoiningAuthorization) {
          setVerifiedCompany(null);
          setErrorMsg(
            "This reusable company QR is for existing-member verification. A valid one-time joining invitation is required for a new recruiter."
          );
          return;
        }
        setVerifiedCompany({
          id: res.data.companyId,
          name: res.data.companyName,
          email: res.data.email,
          alreadyUsed: res.data.alreadyUsed,
          isExistingMember: res.data.isExistingMember,
          recruiterName: res.data.recruiterName || res.data.name,
        });
        if (res.data.email) {
          setJoinForm((prev) => ({
            ...prev,
            email: res.data.email,
            name: res.data.recruiterName || res.data.name || prev.name,
          }));
        }
      } else {
        setErrorMsg(res.data.message || "Invalid or expired invite code.");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to verify invite code. Please check and try again.");
    } finally {
      setIsVerifying(false);
    }
  }, [inviteCode, navigate, dispatch]);

  // Auto-verify if code is in URL on mount
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setActiveTab("link");
      setInviteCode(codeFromUrl);
      handleVerify(codeFromUrl);
    }
  }, [searchParams, handleVerify]);

  // QR Code was successfully detected (from camera or image file)
  const handleQrDetected = (qrContent) => {
    stopCamera();
    const clean = extractCode(qrContent);
    if (!clean) {
      setErrorMsg("Could not extract a valid invite code from QR code.");
      return;
    }
    setInviteCode(clean);
    handleVerify(clean);
  };

  // Scan video frames using jsQR
  const scanFrame = () => {
    if (!videoRef.current) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          handleQrDetected(code.data);
          return; // Stop scan loop
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Start live webcam scanning
  const startCamera = async () => {
    setCameraError("");
    setErrorMsg("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera is not supported on this browser/connection. You can upload a QR image or enter the link.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setIsCameraActive(true);
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Unable to access camera. Please allow camera permissions or upload a QR image below.");
      setIsCameraActive(false);
    }
  };

  // Decode QR code from uploaded image file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setErrorMsg("");
    setCameraError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setIsProcessingFile(false);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        setIsProcessingFile(false);
        if (code && code.data) {
          handleQrDetected(code.data);
        } else {
          setErrorMsg("Could not detect a QR code in this image. Please upload a clear QR code image or enter the link.");
        }
      };
      img.onerror = () => {
        setIsProcessingFile(false);
        setErrorMsg("Failed to read image file. Please try another image.");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Clipboard paste helper for Link tab
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInviteCode(extractCode(text));
          setErrorMsg("");
        }
      }
    } catch {
      // ignore clipboard permission error
    }
  };

  // Final join form submit
  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinForm.name.trim() || !joinForm.email.trim()) {
      setErrorMsg("Name and Email are required to join.");
      return;
    }
    if (!verifiedCompany?.isExistingMember && !profileImage) {
      setErrorMsg("Please upload a profile image to join the company.");
      return;
    }

    setIsJoining(true);
    setErrorMsg("");
    try {
      const cleanCode = extractCode(inviteCode).toUpperCase();
      const result = await dispatch(
        recruiterJoinCompany({
          inviteCode: cleanCode,
          ...joinForm,
          image: profileImage,
          addedVia: activeTab === "qr" ? "qr_code" : "invite_link",
        })
      );

      if (recruiterJoinCompany.fulfilled.match(result)) {
        setIsSuccess(true);
        setSuccessMsg(
          verifiedCompany?.isExistingMember
            ? `Welcome back! Membership verified for ${verifiedCompany?.name || "your company"}.`
            : `Welcome aboard! You have joined ${verifiedCompany?.name || "the company"}.`
        );
      } else {
        setErrorMsg(result.payload || "Failed to join company. Please try again.");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to join company. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container recruiter-join-card">
        {/* ── Left Branded Panel (Deep Navy matching reference) ── */}
        <aside className="auth-left-panel recruiter-join-dark-panel">
          {/* Logo */}
          <Link to="/" className="auth-panel-logo" style={{ color: "#ffffff", marginBottom: "28px" }}>
            <img src="/logo.png" alt="HiringHub Logo" className="auth-logo-img" />
            <span style={{ color: "#ffffff" }}>Hiring<strong>Hub</strong></span>
          </Link>

          {/* Headline & Subtitle */}
          <div className="auth-left-content">
            <h1 className="auth-headline" style={{ color: "#ffffff" }}>
              Join Your Company
            </h1>
            <p className="auth-subtext" style={{ color: "#94a3b8" }}>
              Scan the QR code or enter the link provided by your company to get access.
            </p>
          </div>

          {/* Illustration */}
          <div className="auth-illustration-container">
            <HandPhoneQrIllustration />
          </div>
        </aside>

        {/* ── Right Panel (Interactive Tabs: Scan QR / Enter Link) ── */}
        <main className="auth-right-panel">
          <div className="auth-form-box">
            {/* Tabs */}
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${activeTab === "qr" ? "active" : ""}`}
                onClick={() => handleTabChange("qr")}
              >
                Scan QR Code
              </button>
              <button
                type="button"
                className={`auth-tab ${activeTab === "link" ? "active" : ""}`}
                onClick={() => handleTabChange("link")}
              >
                Enter Link
              </button>
            </div>

            {errorMsg && (
              <div className="auth-alert auth-alert-error">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {cameraError && (
              <div className="auth-alert auth-alert-error">
                <AlertCircle size={16} />
                <span>{cameraError}</span>
              </div>
            )}

            {successMsg && (
              <div className="auth-alert auth-alert-success">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ── ACCESS GRANTED (Reference Image 1) ── */}
            {isSuccess ? (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 16,
                  padding: 24,
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "#10b981",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px auto",
                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>

                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#065f46", margin: "0 0 6px 0" }}>
                  Access Granted!
                </h2>
                <p style={{ color: "#047857", fontSize: 14, margin: "0 0 8px 0" }}>
                  Welcome, <strong>{joinForm.name}</strong>
                </p>
                <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px 0" }}>
                  You are now connected to <strong>{verifiedCompany?.name || "Company"}</strong>. You
                  can now manage jobs, view applications and communicate with candidates.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Link
                    to="/company/dashboard"
                    className="auth-submit-btn"
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <span>Open Recruiter Dashboard</span>
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    to="/company/login"
                    style={{
                      color: "#64748b",
                      fontSize: 13,
                      textDecoration: "none",
                      marginTop: 4,
                    }}
                  >
                    Back to Login
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* ── UNVERIFIED: Tab Body Container (Uniform height across tabs) ── */}
                {!verifiedCompany && (
              <div className="recruiter-tab-body">
                {/* ── TAB 1: Scan QR Code View ── */}
                {activeTab === "qr" && (
                  <div className="recruiter-qr-scanner-view">
                    <div className="recruiter-qr-viewfinder">
                      {/* Viewfinder corner brackets */}
                      <div className="qr-corner qr-corner-tl" />
                      <div className="qr-corner qr-corner-tr" />
                      <div className="qr-corner qr-corner-bl" />
                      <div className="qr-corner qr-corner-br" />

                      {/* Animated scanning laser line */}
                      <div className="qr-scan-laser-line" />

                      {/* Live Video Feed or Idle Graphic */}
                      {isCameraActive ? (
                        <video
                          ref={videoRef}
                          className="recruiter-qr-video"
                          playsInline
                          muted
                          autoPlay
                        />
                      ) : (
                        <div className="recruiter-qr-idle-preview">
                          <svg viewBox="0 0 160 160" width="118" height="118" className="qr-code-svg">
                            <rect width="160" height="160" fill="#ffffff" rx="8" />
                            <rect x="15" y="15" width="40" height="40" rx="4" fill="#0f172a" />
                            <rect x="23" y="23" width="24" height="24" rx="2" fill="#ffffff" />
                            <rect x="29" y="29" width="12" height="12" fill="#0f172a" />
                            <rect x="105" y="15" width="40" height="40" rx="4" fill="#0f172a" />
                            <rect x="113" y="23" width="24" height="24" rx="2" fill="#ffffff" />
                            <rect x="119" y="29" width="12" height="12" fill="#0f172a" />
                            <rect x="15" y="105" width="40" height="40" rx="4" fill="#0f172a" />
                            <rect x="23" y="113" width="24" height="24" rx="2" fill="#ffffff" />
                            <rect x="29" y="119" width="12" height="12" fill="#0f172a" />
                            <rect x="68" y="20" width="12" height="12" fill="#0f172a" />
                            <rect x="84" y="20" width="12" height="12" fill="#0f172a" />
                            <rect x="68" y="44" width="12" height="24" fill="#0f172a" />
                            <rect x="84" y="56" width="12" height="24" fill="#0f172a" />
                            <rect x="20" y="68" width="16" height="12" fill="#0f172a" />
                            <rect x="44" y="68" width="16" height="24" fill="#0f172a" />
                            <rect x="68" y="88" width="24" height="12" fill="#0f172a" />
                            <rect x="100" y="88" width="12" height="24" fill="#0f172a" />
                            <rect x="120" y="68" width="24" height="12" fill="#0f172a" />
                            <rect x="132" y="88" width="12" height="24" fill="#0f172a" />
                            <rect x="68" y="112" width="12" height="24" fill="#0f172a" />
                            <rect x="88" y="124" width="24" height="12" fill="#0f172a" />
                            <rect x="124" y="124" width="16" height="16" fill="#0f172a" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Scanner status description */}
                    <div className={`recruiter-scanner-status ${isCameraActive ? "recruiter-scanner-status-active" : ""}`}>
                      {isCameraActive ? (
                        <>
                          <span className="recruiter-scan-dot" />
                          <span>Camera active — align QR code in frame...</span>
                        </>
                      ) : (
                        <span>Scan code with live camera or upload screenshot</span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                    />
                    {isCameraActive ? (
                      <button
                        type="button"
                        className="recruiter-btn-secondary"
                        style={{ marginTop: "10px" }}
                        onClick={stopCamera}
                      >
                        <VideoOff size={16} />
                        <span>Stop Camera</span>
                      </button>
                    ) : (
                      <div className="recruiter-qr-actions-row">
                        <button
                          type="button"
                          className="auth-submit-btn"
                          style={{ margin: 0 }}
                          onClick={startCamera}
                        >
                          <Camera size={17} />
                          <span>Start Camera</span>
                        </button>
                        <button
                          type="button"
                          className="recruiter-btn-secondary"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessingFile}
                        >
                          {isProcessingFile ? (
                            <>
                              <Loader2 size={16} className="spinner" />
                              <span>Reading...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={16} />
                              <span>Upload QR</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 2: Enter Link / Code View ── */}
                {activeTab === "link" && (
                  <div className="recruiter-link-input-view">
                    <div className="recruiter-link-card-body">
                      {/* Top explanation box for balanced visual height */}
                      <div className="recruiter-link-top-info">
                        <div className="recruiter-link-top-info-head">
                          <LinkIcon size={16} color="#5b5dfa" />
                          <span>Company Invitation Link or Code</span>
                        </div>
                        <p className="recruiter-link-top-info-desc">
                          Paste the invitation URL or enter the 8-character code sent to your email by your admin.
                        </p>
                      </div>

                      {/* Input field */}
                      <div className="auth-field">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <label className="auth-field-label" style={{ margin: 0 }}>Invite Code or Link *</label>
                          <button
                            type="button"
                            className="recruiter-paste-btn"
                            onClick={handlePasteClipboard}
                            title="Paste from clipboard"
                          >
                            <Clipboard size={12} />
                            <span>Paste</span>
                          </button>
                        </div>
                        <div className="auth-input-wrapper">
                          <LinkIcon size={17} className="auth-input-icon" />
                          <input
                            type="text"
                            placeholder="e.g. INV-A1B2C3D4 or paste join link"
                            className="auth-input"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                          />
                          {inviteCode && (
                            <button
                              type="button"
                              className="recruiter-clear-btn"
                              onClick={() => setInviteCode("")}
                              title="Clear input"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="recruiter-link-format-badge">
                        <span>Format:</span>
                        <code>INV-XXXXXXXX</code> or <code>.../recruiter/join?code=...</code>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="auth-submit-btn"
                      onClick={() => handleVerify()}
                      disabled={isVerifying || !inviteCode.trim()}
                      style={{ marginTop: "14px" }}
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 size={16} className="spinner" />
                          <span>Verifying code...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify & Continue</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Verified Company: Recruiter Details Form ── */}
            {verifiedCompany && (
              <form onSubmit={handleJoinSubmit} className="auth-form recruiter-tab-body">
                <div className="recruiter-verified-badge-box">
                  <CheckCircle2 size={20} color="#16a34a" />
                  <div>
                    <strong>{verifiedCompany.name}</strong>
                    <span>
                      {verifiedCompany.isExistingMember
                        ? "Existing Company Membership Recognized"
                        : "Verified Company Invitation"}
                    </span>
                  </div>
                </div>

                {verifiedCompany.isExistingMember && (
                  <div
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: 10,
                      padding: "12px 14px",
                      marginBottom: 16,
                      fontSize: 13,
                      color: "#1e40af",
                      lineHeight: 1.45,
                    }}
                  >
                    Welcome back, <strong>{verifiedCompany.recruiterName || joinForm.name || "Recruiter"}</strong>!
                    Your session has expired. Confirm your registered details to re-verify your membership and access the workspace.
                  </div>
                )}

                {!verifiedCompany.isExistingMember && (
                  <div className="auth-field">
                    <label className="auth-field-label" htmlFor="recruiter-profile-image">
                      Recruiter Image
                    </label>
                    <input
                      id="recruiter-profile-image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      required
                      className="auth-input"
                      onChange={(event) => {
                        setProfileImage(event.target.files?.[0] || null);
                        setErrorMsg("");
                      }}
                    />
                    <small className="auth-field-hint">
                      JPG, PNG, or WebP, up to 10 MB.
                    </small>
                  </div>
                )}

                <div className="auth-field">
                  <label className="auth-field-label">Your Full Name *</label>
                  <div className="auth-input-wrapper">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      className="auth-input"
                      value={joinForm.name}
                      onChange={(e) => setJoinForm((p) => ({ ...p, name: e.target.value }))}
                      readOnly={Boolean(verifiedCompany.isExistingMember && joinForm.name)}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-field-label">Work Email *</label>
                  <div className="auth-input-wrapper">
                    <input
                      type="email"
                      required
                      placeholder="alex@company.com"
                      className="auth-input"
                      value={joinForm.email}
                      onChange={(e) => setJoinForm((p) => ({ ...p, email: e.target.value }))}
                      readOnly={Boolean(verifiedCompany.isExistingMember || verifiedCompany.email)}
                    />
                  </div>
                </div>

                {!verifiedCompany.isExistingMember && (
                  <div className="auth-grid-2">
                    <div className="auth-field">
                      <label className="auth-field-label">Designation</label>
                      <div className="auth-input-wrapper">
                        <input
                          type="text"
                          placeholder="e.g. Technical Recruiter"
                          className="auth-input"
                          value={joinForm.designation}
                          onChange={(e) => setJoinForm((p) => ({ ...p, designation: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="auth-field">
                      <label className="auth-field-label">Department</label>
                      <div className="auth-input-wrapper">
                        <input
                          type="text"
                          placeholder="e.g. Talent Acquisition"
                          className="auth-input"
                          value={joinForm.department}
                          onChange={(e) => setJoinForm((p) => ({ ...p, department: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isJoining}
                  style={{ marginTop: "10px" }}
                >
                  {isJoining ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      <span>{verifiedCompany.isExistingMember ? "Re-verifying Membership..." : "Joining Company..."}</span>
                    </>
                  ) : (
                    verifiedCompany.isExistingMember ? "Re-verify Membership & Sign In" : "Complete Registration & Join"
                  )}
                </button>
              </form>
            )}
            </>
            )}

            {/* Need Help Footer */}
            <div className="recruiter-need-help-box">
              <strong>Need Help?</strong>
              <p>If you didn't receive the invite link or QR code, please contact your company admin.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
