import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Mail, Phone, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { companySignup, clearAuthError, setOtpTarget } from "../authSlice";
import "../styles/auth.css";

const COMPANY_TYPES = ["Technology","E-commerce","Education","Healthcare","Finance","Manufacturing","Hospitality","Government","Other"];
const COMPANY_SIZES = ["1-50","50-100","100-500","500-1000","1000+"];

export default function CompanySignupForm({ onSwitchToLogin }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, successMessage } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    companyType: "Technology", companySize: "1-50",
  });
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
      setValidationError("Please fill in company name, email, and password."); return;
    }
    if (formData.password.length < 6) { setValidationError("Password must be at least 6 characters."); return; }
    if (formData.password !== formData.confirmPassword) { setValidationError("Passwords do not match."); return; }

    const res = await dispatch(companySignup({
      name: formData.name.trim(), email: formData.email.trim(),
      phone: formData.phone.trim(), password: formData.password,
      companyType: formData.companyType, companySize: formData.companySize,
    }));
    if (companySignup.fulfilled.match(res)) {
      dispatch(setOtpTarget({ email: formData.email.trim(), role: "company" }));
      navigate(`/company/verify-otp?email=${encodeURIComponent(formData.email.trim())}`);
    }
  };

  const handleTabClick = () => {
    if (onSwitchToLogin) onSwitchToLogin();
    else navigate("/company/login");
  };

  return (
    <div className="auth-form-box auth-form-box-wide">
      <h2 className="auth-form-title">Register Your Company</h2>
      <p className="auth-form-subtitle">Already registered? <Link to="/company/login" className="auth-link">Sign in here</Link></p>

      {(validationError || error) && (
        <div className="auth-alert auth-alert-error"><AlertCircle size={16} /><span>{validationError || error}</span></div>
      )}
      {successMessage && (
        <div className="auth-alert auth-alert-success"><CheckCircle2 size={16} /><span>{successMessage}</span></div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* Company Name */}
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="comp-name">Company Name</label>
          <div className="auth-input-wrapper">
            <Building2 size={17} className="auth-input-icon" />
            <input id="comp-name" name="name" type="text" required placeholder="e.g. Acme Tech Solutions"
              className="auth-input" value={formData.name} onChange={handleChange} autoComplete="organization" />
          </div>
        </div>

        {/* Email + Phone */}
        <div className="auth-grid-2">
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="comp-email">Company Email</label>
            <div className="auth-input-wrapper">
              <Mail size={17} className="auth-input-icon" />
              <input id="comp-email" name="email" type="email" required placeholder="hr@company.com"
                className="auth-input" value={formData.email} onChange={handleChange} autoComplete="email" />
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="comp-phone">Phone Number</label>
            <div className="auth-input-wrapper">
              <Phone size={17} className="auth-input-icon" />
              <input id="comp-phone" name="phone" type="tel" placeholder="+1 234 567 890"
                className="auth-input" value={formData.phone} onChange={handleChange} autoComplete="tel" />
            </div>
          </div>
        </div>

        {/* Type + Size */}
        <div className="auth-grid-2">
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="companyType">Industry</label>
            <div className="auth-input-wrapper">
              <select id="companyType" name="companyType" className="auth-input no-icon"
                value={formData.companyType} onChange={handleChange}>
                {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="companySize">Company Size</label>
            <div className="auth-input-wrapper">
              <select id="companySize" name="companySize" className="auth-input no-icon"
                value={formData.companySize} onChange={handleChange}>
                {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Password + Confirm */}
        <div className="auth-grid-2">
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="comp-pw">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={17} className="auth-input-icon" />
              <input id="comp-pw" name="password" type={showPassword ? "text" : "password"}
                required placeholder="Min. 6 chars" className="auth-input"
                value={formData.password} onChange={handleChange} autoComplete="new-password" />
              <button type="button" className="auth-input-toggle" onClick={() => setShowPassword(p => !p)}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="comp-cpw">Confirm Password</label>
            <div className="auth-input-wrapper">
              <Lock size={17} className="auth-input-icon" />
              <input id="comp-cpw" name="confirmPassword" type={showPassword ? "text" : "password"}
                required placeholder="Confirm password" className="auth-input"
                value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" />
            </div>
          </div>
        </div>

        <button type="submit" className="auth-submit-btn" disabled={loading}
          style={{ background: "#0891b2", boxShadow: "0 4px 14px rgba(8,145,178,0.35)" }}>
          {loading ? <><Loader2 size={17} className="spinner" /><span>Registering...</span></> : "Register & Start Hiring"}
        </button>
      </form>

      <div className="auth-footer-nav">
        Are you a job seeker?{" "}
        <Link to="/candidate/signup" className="auth-link" style={{ fontWeight: 600 }}>Sign up as Candidate</Link>
      </div>
    </div>
  );
}
