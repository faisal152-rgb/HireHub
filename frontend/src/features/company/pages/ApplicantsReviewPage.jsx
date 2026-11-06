import React from "react";
import ApplicantsTable from "../components/ApplicantsTable";
import "../styles/companyDashboard.css";
import "../styles/application.css";

export default function ApplicantsReviewPage() {
  return (
    <div className="comp-page-container">
      <ApplicantsTable />
    </div>
  );
}
