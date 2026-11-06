import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "../layouts/auth/AuthLayout";
import LandingLayout from "../layouts/landing/LandingLayout";
import LandingPage from "../pages/LandingPage";

import RoleSelectPage from "../features/auth/pages/RoleSelectPage";
import CandidateLoginPage from "../features/auth/pages/CandidateLoginPage";
import CandidateSignupPage from "../features/auth/pages/CandidateSignupPage";
import CompanyLoginPage from "../features/auth/pages/CompanyLoginPage";
import CompanySignupPage from "../features/auth/pages/CompanySignupPage";
import RecruiterJoinPage from "../features/auth/pages/RecruiterJoinPage";
import VerifyOtpPage from "../features/auth/pages/VerifyOtpPage";
import ResetPasswordPage from "../features/auth/pages/ResetPasswordPage";

import CandidateRoutes from "./CandidateRoutes";
import CompanyRoutes from "./CompanyRoutes";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ── Landing Page ── */}
      <Route element={<LandingLayout />}>
        <Route index element={<LandingPage />} />
      </Route>

      {/* ── Recruiter QR / Link Join Page (Standalone clean layout) ── */}
      <Route path="join-company" element={<RecruiterJoinPage />} />
      <Route path="recruiter/join" element={<RecruiterJoinPage />} />
      <Route path="company/recruiter/join" element={<RecruiterJoinPage />} />

      {/* Standalone portal selection page */}
      <Route path="role-select" element={<RoleSelectPage />} />

      {/* ── Auth & Public Layout ── */}
      <Route element={<AuthLayout />}>
        <Route path="login" element={<RoleSelectPage />} />
        <Route path="register" element={<RoleSelectPage />} />

        {/* Company Auth */}
        <Route path="company/login" element={<CompanyLoginPage />} />
        <Route path="company/signup" element={<CompanySignupPage />} />
        <Route path="company/verify-otp" element={<VerifyOtpPage />} />
        <Route path="company/forgot-password" element={<VerifyOtpPage />} />
        <Route path="company/reset-password" element={<ResetPasswordPage />} />
        <Route path="company/new-password" element={<ResetPasswordPage />} />

        {/* Candidate Auth */}
        <Route path="candidate/login" element={<CandidateLoginPage />} />
        <Route path="candidate/signup" element={<CandidateSignupPage />} />
        <Route path="candidate/verify-otp" element={<VerifyOtpPage />} />
        <Route path="candidate/forgot-password" element={<VerifyOtpPage />} />
        <Route path="candidate/reset-password" element={<ResetPasswordPage />} />
        <Route path="candidate/new-password" element={<ResetPasswordPage />} />

        {/* Unified OTP & Forgot Password Verification */}
        <Route path="verify-otp" element={<VerifyOtpPage />} />
        <Route path="otp" element={<VerifyOtpPage />} />
        <Route path="forgot-password" element={<VerifyOtpPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="new-password" element={<ResetPasswordPage />} />
      </Route>

      {/* ── Protected Candidate Features ── */}
      <Route path="candidate/*" element={<CandidateRoutes />} />

      {/* ── Protected Company & Recruiter Features ── */}
      <Route path="company/*" element={<CompanyRoutes />} />
      <Route path="recruiter/*" element={<CompanyRoutes />} />

      {/* ── 404 Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
