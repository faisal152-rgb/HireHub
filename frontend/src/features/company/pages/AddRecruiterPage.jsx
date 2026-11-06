import React from "react";
import InviteRecruiterModal from "../components/InviteRecruiterModal";
import "../styles/companyDashboard.css";
import "../styles/recruiter.css";

export default function AddRecruiterPage() {
  return (
    <div className="comp-page-container">
      <InviteRecruiterModal />
    </div>
  );
}
