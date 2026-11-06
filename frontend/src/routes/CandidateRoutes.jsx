import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

import CandidateDashboard from "../features/candidate/pages/CandidateDashboard";
import CandidateProfilePage from "../features/candidate/pages/CandidateProfilePage";
import JobBrowsePage from "../features/candidate/pages/JobBrowsePage";
import JobDetailsPage from "../features/candidate/pages/JobDetailsPage";
import AppliedJobsPage from "../features/candidate/pages/AppliedJobsPage";
import AssessmentPage from "../features/candidate/pages/AssessmentPage";
import CandidateInterviewsPage from "../features/candidate/pages/CandidateInterviewsPage";

export default function CandidateRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute allowedRole="candidate" />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CandidateDashboard />} />
        <Route path="profile" element={<CandidateProfilePage />} />
        <Route path="jobs" element={<JobBrowsePage />} />
        <Route path="jobs/:id" element={<JobDetailsPage />} />
        <Route path="applied-jobs" element={<AppliedJobsPage />} />
        <Route path="assessment/:id" element={<AssessmentPage />} />
        <Route path="interviews" element={<CandidateInterviewsPage />} />
      </Route>
    </Routes>
  );
}
