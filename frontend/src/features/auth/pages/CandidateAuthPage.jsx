import React, { Activity } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CandidateLoginForm from "../components/CandidateLoginForm";
import CandidateSignupForm from "../components/CandidateSignupForm";

export default function CandidateAuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = !location.pathname.includes("signup");

  return (
    <div className="auth-activity-container">
      {/* React 19 Activity: keeps inactive form mounted in background with state preserved */}
      <Activity mode={isLogin ? "visible" : "hidden"}>
        <CandidateLoginForm onSwitchToSignup={() => navigate("/candidate/signup")} />
      </Activity>
      <Activity mode={!isLogin ? "visible" : "hidden"}>
        <CandidateSignupForm onSwitchToLogin={() => navigate("/candidate/login")} />
      </Activity>
    </div>
  );
}
