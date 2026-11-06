import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { UserPlus, ShieldAlert, ArrowLeft } from "lucide-react";
import { useAppSelector } from "../../../app/hooks";
import JobPostForm from "../components/JobPostForm";
import "../styles/companyDashboard.css";
import "../styles/job.css";

export default function PostJobPage() {
  const { role } = useAppSelector((s) => s.auth);
  const isRecruiter = role === "recruiter";

  // Per workflow requirements: Company Admin invites Recruiters, and Recruiters create Jobs
  if (!isRecruiter) {
    return (
      <div className="comp-page-container">
        <div className="comp-card" style={{ padding: "40px 30px", textAlign: "center", maxWidth: 640, margin: "40px auto" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#eff6ff",
              color: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px 0" }}>
            Recruiter Permission Required
          </h2>
          <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, margin: "0 auto 24px auto" }}>
            As a Company Admin, you invite and manage recruiters. New job openings, candidate evaluations, and assessments are created and published directly by your recruiters.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <Link to="/company/manage-jobs" className="comp-btn comp-btn-secondary">
              <ArrowLeft size={16} />
              <span>Back to Jobs</span>
            </Link>
            <Link to="/company/add-recruiter" className="comp-btn comp-btn-primary">
              <UserPlus size={16} />
              <span>+ Add a Recruiter</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="comp-page-container">
      <JobPostForm />
    </div>
  );
}
