import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  Edit2,
  Save,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import api from "../../../services/api";
import endpoint from "../../../services/endpoint";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { updateAuthUser } from "../../auth/authSlice";
import { getProfileImageUrl } from "../../../utils/profileImage";
import "../styles/companyDashboard.css";

export default function RecruiterProfilePage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const queryRecruiterId =
    searchParams.get("recruiter") ||
    location.state?.recruiter?._id ||
    location.state?.recruiter?.id;
  const isCompanyViewingMember = Boolean(queryRecruiterId);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const dispatch = useAppDispatch();
  const { user: authUser } = useAppSelector((s) => s.auth);

  const initialRecruiter = useMemo(() => {
    if (location.state?.recruiter) return location.state.recruiter;
    if (authUser) return authUser;
    return {
      name: "Ali Raza",
      email: "ali.raza@company.com",
      phone: "+92 300 1234567",
      designation: "Technical Recruiter",
      department: "Talent Acquisition",
      companyName: "ABC Technologies",
      joinedAt: "Oct 2026",
    };
  }, [location.state?.recruiter, authUser]);

  const [formData, setFormData] = useState({
    name: initialRecruiter.name || "Ali Raza",
    email: initialRecruiter.email || "ali.raza@company.com",
    phone: initialRecruiter.phone || "+92 300 1234567",
    designation: initialRecruiter.designation || "Technical Recruiter",
    department: initialRecruiter.department || "Talent Acquisition",
    bio: initialRecruiter.bio || "Senior Talent Acquisition Specialist connecting top tech talent with ABC Technologies.",
    linkedinUrl: initialRecruiter.linkedinUrl || "https://linkedin.com/in/aliraza",
    companyName: initialRecruiter.companyName || "ABC Technologies",
  });
  const [profileImageUrl, setProfileImageUrl] = useState(
    getProfileImageUrl(initialRecruiter)
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const targetEndpoint = isCompanyViewingMember
          ? endpoint.company.getCompanyRecruiterProfile(queryRecruiterId)
          : endpoint.company.getRecruiterProfile;

        const res = await api.get(targetEndpoint);
        if (res.data && res.data.profile) {
          const p = res.data.profile;
          setFormData((prev) => ({
            ...prev,
            name: p.name || prev.name,
            email: p.email || prev.email,
            phone: p.phone || prev.phone,
            designation: p.designation || prev.designation,
            department: p.department || prev.department,
            bio: p.bio || prev.bio,
            linkedinUrl: p.linkedinUrl || prev.linkedinUrl,
            companyName: res.data.company?.name || prev.companyName,
          }));
          setProfileImageUrl(getProfileImageUrl(p));
        }
      } catch (err) {
        console.error("Fetch recruiter profile error:", err);
      }
    };
    fetchProfile();
  }, [isCompanyViewingMember, queryRecruiterId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveNotice("");
    try {
      await api.patch(endpoint.company.updateRecruiterProfile, formData);
      if (profileImage && !isCompanyViewingMember) {
        const payload = new FormData();
        payload.append("image", profileImage);
        const imageResponse = await api.patch(endpoint.company.updateProfilePicture, payload);
        const updatedProfile =
          imageResponse.data?.profile || imageResponse.data;
        const updatedImageUrl = getProfileImageUrl(updatedProfile);
        if (!updatedImageUrl) {
          throw new Error("Profile picture upload did not return an image URL.");
        }
        setProfileImageUrl(updatedImageUrl);
        dispatch(
          updateAuthUser({
            ...formData,
            profilePicture: updatedProfile.profilePicture,
          })
        );
        setProfileImage(null);
      }
      setSaveNotice("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      setSaveNotice("Could not save profile. Please try again.");
      console.error("Save recruiter profile error:", error);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveNotice(""), 3000);
    }
  };

  return (
    <div className="comp-page-container">
      {/* ── Page Header ── */}
      <div className="comp-page-header">
        <div className="comp-page-title-group">
          {isCompanyViewingMember && (
            <Link
              to="/company/manage-recruiters"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "#6366f1",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              <ArrowLeft size={14} /> Back to Recruiters List
            </Link>
          )}
          <h1>{isCompanyViewingMember ? "Team Member Profile" : "Recruiter Profile & Settings"}</h1>
          <p>
            {isCompanyViewingMember
              ? `Viewing company recruiter profile details for ${formData.name}.`
              : "Manage your recruiter profile details and assigned hiring identity."}
          </p>
        </div>
        <div>
          {!isCompanyViewingMember && (
            isEditing ? (
              <button
                type="button"
                className="comp-btn comp-btn-primary"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save Profile</span>
              </button>
            ) : (
              <button
                type="button"
                className="comp-btn comp-btn-secondary"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={16} />
                <span>Edit Details</span>
              </button>
            )
          )}
        </div>
      </div>

      {saveNotice && (
        <div className="comp-form-alert comp-form-alert-success">
          <CheckCircle2 size={18} />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* ── Top Hero Card ── */}
      <div className="comp-card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              color: "#ffffff",
              fontSize: 26,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {formData.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
            {profileImageUrl && (
              <img
                src={profileImageUrl}
                alt={`${formData.name} profile`}
                onError={(event) => event.currentTarget.remove()}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0,color:"#0a0909ff"}}>{formData.name}</h2>
              <span className="comp-badge comp-badge-active">● Active Recruiter</span>
            </div>
            <p style={{ margin: "4px 0 8px 0", color: "#64748b", fontSize: 13.5 }}>
              {formData.designation} • {formData.department}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4f46e5", fontWeight: 600 }}>
              <Building2 size={15} />
              <span>Connected to {formData.companyName}</span>
            </div>
            {!isCompanyViewingMember && isEditing && (
              <div className="comp-form-field" style={{ width: "100%" }}>
                <label className="comp-form-label" htmlFor="recruiter-image">Profile Picture</label>
                <input
                  id="recruiter-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="comp-form-input"
                  onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                />
                <small className="auth-field-hint">
                  JPG, PNG, or WebP, up to 10 MB.
                </small>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Profile Details Form ── */}
      <div className="comp-card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: "#0f172a" }}>
          Personal &amp; Contact Information
        </h3>

        <form onSubmit={handleSave} className="comp-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="comp-form-field">
            <label className="comp-form-label">Full Name</label>
            <input
              type="text"
              disabled={!isEditing}
              className="comp-form-input"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="comp-form-field">
            <label className="comp-form-label">Work Email</label>
            <input
              type="email"
              disabled={!isEditing}
              className="comp-form-input"
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div className="comp-form-field">
            <label className="comp-form-label">Phone Number</label>
            <input
              type="text"
              disabled={!isEditing}
              className="comp-form-input"
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <div className="comp-form-field">
            <label className="comp-form-label">Designation / Role</label>
            <input
              type="text"
              disabled={!isEditing}
              className="comp-form-input"
              value={formData.designation}
              onChange={(e) => setFormData((p) => ({ ...p, designation: e.target.value }))}
            />
          </div>

          <div className="comp-form-field">
            <label className="comp-form-label">Department</label>
            <input
              type="text"
              disabled={!isEditing}
              className="comp-form-input"
              value={formData.department}
              onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
            />
          </div>

          <div className="comp-form-field">
            <label className="comp-form-label">Company Affiliation</label>
            <input
              type="text"
              disabled
              className="comp-form-input"
              style={{ background: "#f8fafc" }}
              value={formData.companyName}
            />
          </div>

          <div className="comp-form-field" style={{ gridColumn: "span 2" }}>
            <label className="comp-form-label">Professional Bio</label>
            <textarea
              rows={3}
              disabled={!isEditing}
              className="comp-form-input"
              value={formData.bio}
              onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
