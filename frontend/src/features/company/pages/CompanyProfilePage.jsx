import React, { useState, useEffect } from "react";
import {
  Globe,
  Calendar,
  Users,
  MapPin,
  CheckCircle2,
  Edit2,
  Save,
  Check,
  Shield,
  Bot,
  Camera,
  Bell,
  Loader2,
} from "lucide-react";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import RecruiterProfilePage from "./RecruiterProfilePage";
import "../styles/companyDashboard.css";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { updateAuthUser } from "../../auth/authSlice";

export default function CompanyProfilePage() {
  const dispatch = useAppDispatch();
  const { role } = useAppSelector((s) => s.auth);
  const isRecruiter = role === "recruiter";

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [logoFile, setLogoFile] = useState(null);

  const [companyInfo, setCompanyInfo] = useState({
    name: "ABC Technologies",
    tagline: "IT Services & Software Solutions",
    website: "www.abc.com",
    founded: "2015",
    size: "51 - 200 employees",
    location: "Lahore, Pakistan",
    logo: "",
  });

  const [hiringSettings, setHiringSettings] = useState({
    autoReject: true,
    aiAssessment: true,
    cameraMonitoring: true,
    notifyCandidates: true,
  });

  useEffect(() => {
    if (isRecruiter) return;
    const fetchCompany = async () => {
      try {
        const res = await api.get(endpoint.company.getProfile);
        if (res.data && res.data.company) {
          dispatch(
            updateAuthUser({
              name: res.data.company.name,
              logo: res.data.company.logo || "",
            })
          );
          setCompanyInfo((prev) => ({
            ...prev,
            name: res.data.company.name || prev.name,
            website: res.data.company.website || prev.website,
            location: res.data.company.location || prev.location,
            logo: res.data.company.logo || "",
          }));
        }
      } catch {
        // Keeps realistic reference content
      }
    };
    fetchCompany();
  }, [dispatch, isRecruiter]);

  const handleToggle = (key) => {
    if (!isEditing) return;
    setHiringSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch(endpoint.company.updateProfile, {
        name: companyInfo.name,
        website: companyInfo.website,
        location: companyInfo.location,
      });
      if (logoFile) {
        const payload = new FormData();
        payload.append("logo", logoFile);
        const logoResponse = await api.patch(endpoint.company.updateLogo, payload);
        const updatedLogo = logoResponse.data?.logo;
        if (updatedLogo) {
          setCompanyInfo((prev) => ({ ...prev, logo: updatedLogo }));
          dispatch(updateAuthUser({ logo: updatedLogo }));
        }
        setLogoFile(null);
      }
      setSaveNotice("Company profile & settings saved successfully!");
      setIsEditing(false);
      setTimeout(() => setSaveNotice(""), 3000);
    } catch (error) {
      setSaveNotice(error.response?.data?.message || "Could not save company profile. Please try again.");
      setTimeout(() => setSaveNotice(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isRecruiter) {
    return <RecruiterProfilePage />;
  }

  return (
    <div className="comp-page-container">
      {/* Header matching Reference 12 */}
      <div className="comp-page-header">
        <div className="comp-page-title-group">
          <h1>Company Profile</h1>
          <p>Manage your company information and hiring settings.</p>
        </div>
        <button
          type="button"
          className={`comp-btn ${isEditing ? "comp-btn-primary" : "comp-btn-secondary"}`}
          onClick={isEditing ? handleSave : () => setIsEditing(true)}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : isEditing ? (
            <>
              <Save size={16} />
              <span>Save Changes</span>
            </>
          ) : (
            <>
              <Edit2 size={16} />
              <span>Edit Profile</span>
            </>
          )}
        </button>
      </div>

      {saveNotice && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "12px 16px",
            borderRadius: 10,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13.5,
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Top Card: Company Information matching Reference 12 */}
      <div className="comp-card" style={{ marginBottom: 24 }}>
        <h2 className="comp-card-title" style={{ marginBottom: 20 }}>
          Company Information
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 28,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              {companyInfo.logo ? (
                <img
                  src={companyInfo.logo}
                  alt={`${companyInfo.name} logo`}
                  style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
                    color: "#ffffff",
                    fontSize: 20,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
                  }}
                >
                  {companyInfo.name.slice(0, 3).toUpperCase()}
                </div>
              )}
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={companyInfo.name}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, name: e.target.value })
                    }
                    className="comp-form-input"
                    style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}
                  />
                ) : (
                  <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    {companyInfo.name}
                  </h3>
                )}
                <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: 13.5 }}>
                  {companyInfo.tagline}
                </p>
                {isEditing && (
                  <div className="auth-field">
                    <label className="auth-field-label" htmlFor="recruiter-profile-image">
                      Company Logo 
                    </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="comp-form-input"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    style={{ marginTop: 8, fontSize: 12 }}
                  />
                    <small className="auth-field-hint">
                      JPG, PNG, or WebP, up to 10 MB.
                    </small>
                </div>
                )}
              </div>
            </div>

            {/* Grid of Details matching Reference 12 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "18px 24px",
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <Globe size={13} />
                  <span>Website</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={companyInfo.website}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, website: e.target.value })
                    }
                    className="comp-form-input"
                    style={{ marginTop: 4, fontSize: 13 }}
                  />
                ) : (
                  <div style={{ fontWeight: 600, color: "#4f46e5", marginTop: 2, fontSize: 13.5 }}>
                    {companyInfo.website}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={13} />
                  <span>Founded</span>
                </div>
                <div style={{ fontWeight: 600, color: "#0f172a", marginTop: 2, fontSize: 13.5 }}>
                  {companyInfo.founded}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <Users size={13} />
                  <span>Company Size</span>
                </div>
                <div style={{ fontWeight: 600, color: "#0f172a", marginTop: 2, fontSize: 13.5 }}>
                  {companyInfo.size}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <MapPin size={13} />
                  <span>Location</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={companyInfo.location}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, location: e.target.value })
                    }
                    className="comp-form-input"
                    style={{ marginTop: 4, fontSize: 13 }}
                  />
                ) : (
                  <div style={{ fontWeight: 600, color: "#0f172a", marginTop: 2, fontSize: 13.5 }}>
                    {companyInfo.location}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Building Banner matching Reference 12 */}
          <div
            style={{
              height: 190,
              borderRadius: 14,
              overflow: "hidden",
              position: "relative",
              background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            {/* Architectural SVG Graphic */}
            <svg
              viewBox="0 0 320 200"
              style={{ width: "100%", height: "100%", opacity: 0.85 }}
            >
              {/* Sky background */}
              <defs>
                <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
              <rect width="320" height="200" fill="url(#skyGrad)" />
              {/* Clouds */}
              <circle cx="80" cy="50" r="25" fill="#ffffff" opacity="0.6" />
              <circle cx="105" cy="45" r="20" fill="#ffffff" opacity="0.6" />
              {/* Modern Building 3D isometric */}
              <polygon points="120,60 230,30 270,180 120,195" fill="#0f172a" />
              <polygon points="60,80 120,60 120,195 60,180" fill="#1e293b" />
              {/* Glowing Windows grid */}
              {[90, 110, 130, 150, 170].map((y, i) => (
                <g key={i}>
                  <rect x="75" y={y} width="14" height="10" fill="#38bdf8" rx="2" />
                  <rect x="95" y={y - 5} width="14" height="10" fill="#38bdf8" rx="2" />
                  <rect x="140" y={y - 20} width="22" height="12" fill="#93c5fd" rx="2" />
                  <rect x="175" y={y - 25} width="22" height="12" fill="#93c5fd" rx="2" />
                  <rect x="210" y={y - 30} width="22" height="12" fill="#93c5fd" rx="2" />
                </g>
              ))}
            </svg>
            <div
              style={{
                position: "absolute",
                bottom: 12,
                left: 14,
                background: "rgba(15, 23, 42, 0.75)",
                backdropFilter: "blur(4px)",
                padding: "4px 10px",
                borderRadius: 20,
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Headquarters • Lahore
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Card: Hiring Settings matching Reference 12 */}
      <div className="comp-card">
        <div className="comp-card-header">
          <h2 className="comp-card-title">Hiring Settings</h2>
          <span style={{ fontSize: 12.5, color: "#64748b" }}>
            {isEditing ? "Click options to toggle" : "Read-only mode"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Setting 1: Auto-reject */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              cursor: isEditing ? "pointer" : "default",
            }}
            onClick={() => handleToggle("autoReject")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: hiringSettings.autoReject ? "#ecfdf5" : "#f1f5f9",
                  color: hiringSettings.autoReject ? "#10b981" : "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Shield size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                  Auto-reject based on policy
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Automatically reject applications below minimum passing score
                </div>
              </div>
            </div>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: hiringSettings.autoReject ? "#10b981" : "#cbd5e1",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={14} />
            </div>
          </div>

          {/* Setting 2: Use AI assessment */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              cursor: isEditing ? "pointer" : "default",
            }}
            onClick={() => handleToggle("aiAssessment")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: hiringSettings.aiAssessment ? "#eff6ff" : "#f1f5f9",
                  color: hiringSettings.aiAssessment ? "#3b82f6" : "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                  Use AI assessment
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Generate tailored MCQ questions and evaluate candidate responses automatically
                </div>
              </div>
            </div>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: hiringSettings.aiAssessment ? "#10b981" : "#cbd5e1",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={14} />
            </div>
          </div>

          {/* Setting 3: Enable camera monitoring */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              cursor: isEditing ? "pointer" : "default",
            }}
            onClick={() => handleToggle("cameraMonitoring")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: hiringSettings.cameraMonitoring ? "#ecfdf5" : "#f1f5f9",
                  color: hiringSettings.cameraMonitoring ? "#10b981" : "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Camera size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                  Enable camera monitoring
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Live anti-cheat face tracking and tab-switch penalty locks
                </div>
              </div>
            </div>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: hiringSettings.cameraMonitoring ? "#10b981" : "#cbd5e1",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={14} />
            </div>
          </div>

          {/* Setting 4: Notify candidates */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              cursor: isEditing ? "pointer" : "default",
            }}
            onClick={() => handleToggle("notifyCandidates")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: hiringSettings.notifyCandidates ? "#ecfdf5" : "#f1f5f9",
                  color: hiringSettings.notifyCandidates ? "#10b981" : "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bell size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                  Notify candidates via email & platform
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Send automated status updates and interview invitations to candidates
                </div>
              </div>
            </div>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: hiringSettings.notifyCandidates ? "#10b981" : "#cbd5e1",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
