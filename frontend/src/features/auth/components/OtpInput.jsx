import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Building2,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  ArrowLeft,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { verifyOtp, resendOtp, clearAuthError, clearAuthSuccess } from "../authSlice";
import "../styles/auth.css";

export default function OtpInput() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const urlEmail = searchParams.get("email") || "";
  const urlRole = searchParams.get("role") || "";
  const urlType = searchParams.get("type") || "";

  const { loading, error, successMessage, otpTarget, isAuthenticated, role: authRole } =
    useAppSelector((s) => s.auth);

  // Inferred company mode from url query, route path or stored otpTarget
  const isCompany =
    urlRole === "company" ||
    location.pathname.includes("company") ||
    otpTarget?.role === "company";
  const role = isCompany ? "company" : "candidate";

  const isForgotPassword =
    urlType === "forgot-password" ||
    urlType === "reset-password" ||
    location.pathname.includes("forgot-password") ||
    location.pathname.includes("reset-password") ||
    otpTarget?.type === "forgot-password" ||
    otpTarget?.type === "reset-password";

  const otpType = isForgotPassword ? "forgot-password" : (urlType || otpTarget?.type || undefined);

  const initialEmail = urlEmail || otpTarget?.email || "";
  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(initialEmail ? 60 : 0);
  const [canResend, setCanResend] = useState(!initialEmail);
  const [validationError, setValidationError] = useState("");
  const inputRefs = useRef([]);
  const initialOtpSentRef = useRef(false);

  useEffect(() => {
    dispatch(clearAuthError());
    dispatch(clearAuthSuccess());
    inputRefs.current[0]?.focus();
  }, [dispatch]);

  // If opening forgot-password directly with an initial email, auto-request OTP once
  useEffect(() => {
    if (isForgotPassword && initialEmail && !initialOtpSentRef.current) {
      initialOtpSentRef.current = true;
      dispatch(
        resendOtp({
          email: initialEmail.trim(),
          role,
          type: "forgot-password",
        })
      );
    }
  }, [isForgotPassword, initialEmail, role, dispatch]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setInterval(() => setCountdown((p) => p - 1), 1000);
      return () => clearInterval(t);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(authRole === "company" ? "/company/dashboard" : "/candidate/dashboard");
    }
  }, [isAuthenticated, authRole, navigate]);

  const handleDigit = (i, val) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const nd = [...digits];
    nd[i] = d;
    setDigits(nd);
    setValidationError("");
    if (d && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const raw = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!raw) return;
    const nd = [...digits];
    for (let i = 0; i < raw.length; i++) {
      nd[i] = raw[i];
    }
    setDigits(nd);
    inputRefs.current[Math.min(raw.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otp = digits.join("");
    if (!email.trim()) {
      setValidationError(`Please provide your registered ${isCompany ? "company " : ""}email.`);
      setIsEditingEmail(true);
      return;
    }
    if (otp.length < 6) {
      setValidationError("Please enter the complete 6-digit verification code.");
      return;
    }

    const res = await dispatch(
      verifyOtp({
        email: email.trim(),
        otp,
        role,
        ...(isForgotPassword ? { type: "forgot-password" } : {}),
      })
    );
    if (verifyOtp.fulfilled.match(res)) {
      if (isForgotPassword) {
        navigate(
          `/${role}/reset-password?email=${encodeURIComponent(email.trim())}&otp=${encodeURIComponent(otp)}&role=${role}`
        );
      } else {
        setTimeout(() => {
          navigate(role === "company" ? "/company/login" : "/candidate/login");
        }, 1500);
      }
    }
  };

  const handleResend = async () => {
    if (!canResend || !email.trim()) return;
    setCanResend(false);
    setCountdown(60);
    setDigits(["", "", "", "", "", ""]);
    await dispatch(
      resendOtp({
        email: email.trim(),
        role,
        ...(otpType ? { type: otpType } : {}),
      })
    );
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="auth-form-box otp-form-box">
      {/* Portal Badge */}
      <div className="otp-badge-row">
        <span
          className={`auth-portal-badge ${
            isCompany ? "auth-portal-badge-company" : "auth-portal-badge-candidate"
          }`}
        >
          {isCompany ? <Building2 size={13} /> : <ShieldCheck size={13} />}
          <span>{isCompany ? "Company Portal" : "Candidate Portal"}</span>
        </span>
      </div>

      {/* Modern Gradient Icon */}
      <div
        className={`otp-icon-wrap ${
          isCompany ? "otp-icon-wrap-company" : "otp-icon-wrap-candidate"
        }`}
      >
        {isCompany ? <Building2 size={28} /> : <ShieldCheck size={28} />}
      </div>

      <h2 className="auth-form-title otp-title">
        {isForgotPassword
          ? "Reset Password Verification"
          : isCompany
          ? "Verify Company Account"
          : "Verify Your Account"}
      </h2>
      <p className="auth-form-subtitle otp-subtitle">
        {isForgotPassword
          ? "Enter the 6-digit confirmation code sent to your email to reset your password."
          : isCompany
          ? "Enter the 6-digit confirmation code sent to your company email to activate your account."
          : "Enter the 6-digit confirmation code sent to your email to verify your profile."}
      </p>

      {/* Alerts */}
      {(validationError || error) && (
        <div className="auth-alert auth-alert-error">
          <AlertCircle size={16} />
          <span>{validationError || error}</span>
        </div>
      )}
      {successMessage && (
        <div className="auth-alert auth-alert-success">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Email Display or Edit Form */}
      {email && !isEditingEmail ? (
        <div className="otp-email-preview">
          <div className="otp-email-pill">
            {isCompany ? (
              <Building2 size={15} className="otp-email-icon" />
            ) : (
              <Mail size={15} className="otp-email-icon" />
            )}
            <span className="otp-email-address">{email}</span>
          </div>
          <button
            type="button"
            className="otp-edit-email-btn"
            onClick={() => setIsEditingEmail(true)}
          >
            Change
          </button>
        </div>
      ) : (
        <div className="auth-field" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label className="auth-field-label" htmlFor="otp-email" style={{ margin: 0 }}>
              {isCompany ? "Company Email Address" : "Registered Email"}
            </label>
            {email && isEditingEmail && (
              <button
                type="button"
                onClick={() => setIsEditingEmail(false)}
                className="otp-cancel-edit-btn"
              >
                Done
              </button>
            )}
          </div>
          <div className="auth-input-wrapper">
            {isCompany ? (
              <Building2 size={17} className="auth-input-icon" />
            ) : (
              <Mail size={17} className="auth-input-icon" />
            )}
            <input
              id="otp-email"
              type="email"
              required
              placeholder={isCompany ? "hr@company.com" : "you@example.com"}
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* 6 OTP Boxes */}
        <div className="otp-boxes-container" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`otp-box ${d ? "otp-box-filled" : ""} ${
                isCompany ? "otp-box-company" : ""
              }`}
              aria-label={`Digit ${i + 1}`}
              autoComplete="one-time-code"
            />
          ))}
        </div>

        {/* Resend Controls */}
        <div className="otp-resend-row">
          <span className="otp-resend-text">Didn't receive the code?</span>
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className={`otp-resend-btn ${isCompany ? "otp-resend-btn-company" : ""}`}
            >
              <RotateCw size={14} className={loading ? "spinner" : ""} />
              <span>Resend Code</span>
            </button>
          ) : (
            <span className="otp-timer-badge">
              Resend in <strong>{countdown}s</strong>
            </span>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`auth-submit-btn ${isCompany ? "auth-submit-btn-company" : ""}`}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spinner" />
              <span>{isCompany ? "Verifying Company Account..." : "Verifying Code..."}</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>{isCompany ? "Verify Company & Proceed" : "Verify & Continue"}</span>
            </>
          )}
        </button>
      </form>

      {/* Footer Navigation */}
      <div className="auth-footer-nav">
        <div className="otp-footer-links">
          <Link
            to={isCompany ? "/company/login" : "/candidate/login"}
            className="auth-link otp-back-link"
          >
            <ArrowLeft size={14} /> Back to {isCompany ? "Company" : "Candidate"} Login
          </Link>
          <span className="otp-footer-dot">•</span>
          <Link to="/role-select" className="auth-link">
            Switch Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
