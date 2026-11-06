import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Mail,
  Hash,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { resetPassword, clearAuthError, clearAuthSuccess } from "../authSlice";
import "../styles/auth.css";

export default function ResetPasswordForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const urlEmail = searchParams.get("email") || "";
  const urlOtp = searchParams.get("otp") || "";
  const urlRole = searchParams.get("role") || "";

  const { loading, error, successMessage, otpTarget } = useAppSelector((state) => state.auth);

  const isCompany =
    urlRole === "company" ||
    location.pathname.includes("company") ||
    otpTarget?.role === "company";
  const role = isCompany ? "company" : "candidate";

  const [email, setEmail] = useState(urlEmail || otpTarget?.email || "");
  const [otp, setOtp] = useState(urlOtp || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    dispatch(clearAuthError());
    dispatch(clearAuthSuccess());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    if (!email.trim()) {
      setValidationError("Email address is required.");
      return;
    }

    if (!otp.trim() || otp.trim().length < 6) {
      setValidationError("A valid 6-digit verification code is required.");
      return;
    }

    if (!newPassword) {
      setValidationError("Please enter your new password.");
      return;
    }

    if (newPassword.length < 6) {
      setValidationError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError("Passwords do not match. Please re-enter.");
      return;
    }

    const res = await dispatch(
      resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
        role,
      })
    );

    if (resetPassword.fulfilled.match(res)) {
      setIsSuccess(true);
      setTimeout(() => {
        navigate(role === "company" ? "/company/login" : "/candidate/login");
      }, 2000);
    }
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
        <KeyRound size={28} />
      </div>

      <h2 className="auth-form-title otp-title">Set New Password</h2>
      <p className="auth-form-subtitle otp-subtitle">
        Enter your new password below to secure your {isCompany ? "company " : ""}account.
      </p>

      {/* Alerts */}
      {(validationError || error) && (
        <div className="auth-alert auth-alert-error">
          <AlertCircle size={16} />
          <span>{validationError || error}</span>
        </div>
      )}

      {(isSuccess || successMessage) && (
        <div className="auth-alert auth-alert-success">
          <CheckCircle2 size={16} />
          <span>{successMessage || "Password reset successfully! Redirecting to login..."}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* Email Field (hidden if already provided, or editable if missing) */}
        {!urlEmail && !otpTarget?.email && (
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="reset-email">
              {isCompany ? "Company Email" : "Email Address"}
            </label>
            <div className="auth-input-wrapper">
              <Mail size={17} className="auth-input-icon" />
              <input
                id="reset-email"
                type="email"
                required
                placeholder={isCompany ? "hr@company.com" : "you@example.com"}
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* OTP Field (if not in URL or needs manual entry) */}
        {(!urlOtp || otp.length !== 6) && (
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="reset-otp">
              6-Digit Verification Code
            </label>
            <div className="auth-input-wrapper">
              <Hash size={17} className="auth-input-icon" />
              <input
                id="reset-otp"
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                className="auth-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
          </div>
        )}

        {/* New Password */}
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="new-password">
            New Password
          </label>
          <div className="auth-input-wrapper">
            <Lock size={17} className="auth-input-icon" />
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              className="auth-input"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (validationError) setValidationError("");
              }}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="auth-toggle-pwd"
              onClick={() => setShowPassword((p) => !p)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="confirm-new-password">
            Confirm New Password
          </label>
          <div className="auth-input-wrapper">
            <Lock size={17} className="auth-input-icon" />
            <input
              id="confirm-new-password"
              type={showConfirmPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (validationError) setValidationError("");
              }}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="auth-toggle-pwd"
              onClick={() => setShowConfirmPassword((p) => !p)}
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`auth-submit-btn ${isCompany ? "auth-submit-btn-company" : ""}`}
          disabled={loading || isSuccess}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spinner" />
              <span>Resetting Password...</span>
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 size={18} />
              <span>Password Reset Successful!</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>Update Password & Login</span>
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
        </div>
      </div>
    </div>
  );
}
