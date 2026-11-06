import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import CompanyLayout from "../layouts/company/CompanyLayout";

import CompanyDashboard from "../features/company/pages/CompanyDashboard";
import CompanyProfilePage from "../features/company/pages/CompanyProfilePage";
import PostJobPage from "../features/company/pages/PostJobPage";
import ManageJobsPage from "../features/company/pages/ManageJobsPage";
import ApplicantsReviewPage from "../features/company/pages/ApplicantsReviewPage";
import ScheduleInterviewPage from "../features/company/pages/ScheduleInterviewPage";
import RecruiterTeamPage from "../features/company/pages/RecruiterTeamPage";
import AddRecruiterPage from "../features/company/pages/AddRecruiterPage";
import ShortlistHiredPage from "../features/company/pages/ShortlistHiredPage";
import CompanyNotificationsPage from "../features/company/pages/CompanyNotificationsPage";
import CompanyMessagesPage from "../features/company/pages/CompanyMessagesPage";
import RecruiterProfilePage from "../features/company/pages/RecruiterProfilePage";

export default function CompanyRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute allowedRole="company" />}>
        {/* All company features wrapped in unified modern CompanyLayout */}
        <Route element={<CompanyLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CompanyDashboard />} />
          <Route path="profile" element={<CompanyProfilePage />} />
          <Route path="recruiter-profile" element={<RecruiterProfilePage />} />
          <Route path="settings" element={<CompanyProfilePage />} />
          <Route path="post-job" element={<PostJobPage />} />
          <Route path="manage-jobs" element={<ManageJobsPage />} />
          <Route path="jobs" element={<Navigate to="manage-jobs" replace />} />
          
          {/* Applications */}
          <Route path="applicants" element={<ApplicantsReviewPage />} />
          <Route path="manage-applications" element={<ApplicantsReviewPage />} />
          
          {/* Candidates & Shortlist */}
          <Route path="candidates" element={<ShortlistHiredPage />} />
          <Route path="shortlisted" element={<ShortlistHiredPage />} />
          
          {/* Interviews */}
          <Route path="schedule-interview" element={<ScheduleInterviewPage />} />
          <Route path="interviews" element={<ScheduleInterviewPage />} />
          
          {/* Recruiter Management */}
          <Route path="manage-recruiters" element={<RecruiterTeamPage />} />
          <Route path="add-recruiter" element={<AddRecruiterPage />} />
          <Route path="recruiters" element={<RecruiterTeamPage />} />
          
          {/* Notifications & Messages as individual components */}
          <Route path="notifications" element={<CompanyNotificationsPage />} />
          <Route path="messages" element={<CompanyMessagesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
