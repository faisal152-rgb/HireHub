import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { candidateSignup, clearAuthError, setOtpTarget } from "../authSlice";
import "../styles/auth.css";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);
const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

export default function CandidateSignupForm({ onSwitchToLogin }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, successMessage } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => { dispatch(clearAuthError()); }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (validationError) setValidationError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setValidationError("Please fill in all fields."); return;
    }
    if (formData.password.length < 6) {
      setValidationError("Password must be at least 6 characters."); return;
    }
    if (formData.password !== formData.confirmPassword) {
      setValidationError("Passwords do not match."); return;
    }
    const res = await dispatch(candidateSignup({ name: formData.name.trim(), email: formData.email.trim(), password: formData.password }));
    if (candidateSignup.fulfilled.match(res)) {
      dispatch(setOtpTarget({ email: formData.email.trim(), role: "candidate" }));
      navigate(`/verify-otp?role=candidate&email=${encodeURIComponent(formData.email.trim())}`);
    }
  };

  const handleTabClick = () => {
    if (onSwitchToLogin) onSwitchToLogin();
    else navigate("/candidate/login");
  };

  return (
    <div className="auth-form-box">
      <h2 className="auth-form-title">Create Account</h2>
      <p className="auth-form-subtitle">Join thousands of candidates on HireHub</p>

      {(validationError || error) && (
        <div className="auth-alert auth-alert-error"><AlertCircle size={16} /><span>{validationError || error}</span></div>
      )}
      {successMessage && (
        <div className="auth-alert auth-alert-success"><CheckCircle2 size={16} /><span>{successMessage}</span></div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="cand-name">Full Name</label>
          <div className="auth-input-wrapper">
            <User size={17} className="auth-input-icon" />
            <input id="cand-name" name="name" type="text" required placeholder="John Doe"
              className="auth-input" value={formData.name} onChange={handleChange} autoComplete="name" />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-field-label" htmlFor="cand-signup-email">Email Address</label>
          <div className="auth-input-wrapper">
            <Mail size={17} className="auth-input-icon" />
            <input id="cand-signup-email" name="email" type="email" required placeholder="candidate@example.com"
              className="auth-input" value={formData.email} onChange={handleChange} autoComplete="email" />
          </div>
        </div>

        <div className="auth-grid-2">
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="cand-signup-pw">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={17} className="auth-input-icon" />
              <input id="cand-signup-pw" name="password" type={showPassword ? "text" : "password"}
                required placeholder="Min. 6 chars" className="auth-input"
                value={formData.password} onChange={handleChange} autoComplete="new-password" />
              <button type="button" className="auth-input-toggle" onClick={() => setShowPassword(p => !p)}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="cand-confirm-pw">Confirm Password</label>
            <div className="auth-input-wrapper">
              <Lock size={17} className="auth-input-icon" />
              <input id="cand-confirm-pw" name="confirmPassword" type={showPassword ? "text" : "password"}
                required placeholder="Repeat password" className="auth-input"
                value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" />
            </div>
          </div>
        </div>

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? <><Loader2 size={17} className="spinner" /><span>Creating Account...</span></> : "Create Account"}
        </button>

        <div className="auth-divider">or sign up with</div>
        <div className="auth-social-row">
          <button type="button" className="auth-social-btn"><GoogleIcon /> Google</button>
          <button type="button" className="auth-social-btn"><LinkedInIcon /> LinkedIn</button>
        </div>
      </form>

      <div className="auth-footer-nav">
        Already have an account?{" "}
        <Link to="/candidate/login" className="auth-link" style={{ fontWeight: 600 }}>Sign In</Link>
      </div>
    </div>
  );
}
