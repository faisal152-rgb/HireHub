import React, { Activity, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CandidateLoginForm from "../components/CandidateLoginForm";
import CandidateSignupForm from "../components/CandidateSignupForm";
import { AuthCardSkeleton } from "../components/AuthSkeleton";

export default function CandidateAuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = !location.pathname.includes("signup");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <AuthCardSkeleton />;
  }

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
