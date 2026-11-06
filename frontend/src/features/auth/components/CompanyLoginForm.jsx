import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { companyLogin, clearAuthError } from "../authSlice";
import "../styles/auth.css";


export default function CompanyLoginForm({ onSwitchToSignup }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, role } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => { dispatch(clearAuthError()); }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && role === "company") navigate("/company/dashboard");
  }, [isAuthenticated, role, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    if (validationError) setValidationError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password.trim()) {
      setValidationError("Please enter your company email and password.");
      return;
    }
    const res = await dispatch(companyLogin(formData));
    if (companyLogin.fulfilled.match(res)) navigate("/company/dashboard");
  };

  const handleTabClick = () => {
    if (onSwitchToSignup) onSwitchToSignup();
    else navigate("/company/signup");
  };

  return (
    <div className="auth-form-box">
      <h2 className="auth-form-title">Welcome Back!</h2>
      <p className="auth-form-subtitle">Sign in to your company account</p>

      {(validationError || error) && (
        <div className="auth-alert auth-alert-error">
          <AlertCircle size={16} />
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span>{validationError || error}</span>
            {error && typeof error === "string" && error.toLowerCase().includes("not verified") && (
              <Link
                to={`/company/verify-otp${formData.email ? `?email=${encodeURIComponent(formData.email.trim())}` : ""}`}
                style={{ color: "#b91c1c", fontWeight: 700, textDecoration: "underline", fontSize: "0.84rem" }}
              >
                Verify company OTP now →
              </Link>
            )}
          </div>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="comp-login-email">Email Address</label>
          <div className="auth-input-wrapper">
            <Mail size={17} className="auth-input-icon" />
            <input
              id="comp-login-email"
              name="email"
              type="email"
              required
              placeholder="company@abc.com"
              className="auth-input"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-field-label" htmlFor="comp-login-pw">Password</label>
          <div className="auth-input-wrapper">
            <Lock size={17} className="auth-input-icon" />
            <input
              id="comp-login-pw"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="•••••••••••••"
              className="auth-input"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-input-toggle"
              onClick={() => setShowPassword((p) => !p)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div className="auth-row-options">
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
            />
            <span>Remember me</span>
          </label>
          <Link to={`/company/forgot-password${formData.email ? `?email=${encodeURIComponent(formData.email.trim())}` : ""}`} className="auth-link">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? <><Loader2 size={17} className="spinner" /><span>Signing in...</span></> : "Login"}
        </button>
      </form>

      <div className="auth-footer-nav">
        Don't have an account?{" "}
        <Link to="/company/signup" className="auth-link" style={{ fontWeight: 600 }}>Sign Up</Link>
      </div>
    </div>
  );
}
