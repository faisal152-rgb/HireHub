import React, { Activity, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CompanyLoginForm from "../components/CompanyLoginForm";
import CompanySignupForm from "../components/CompanySignupForm";
import { AuthCardSkeleton } from "../components/AuthSkeleton";

export default function CompanyAuthPage() {
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
        <CompanyLoginForm onSwitchToSignup={() => navigate("/company/signup")} />
      </Activity>
      <Activity mode={!isLogin ? "visible" : "hidden"}>
        <CompanySignupForm onSwitchToLogin={() => navigate("/company/login")} />
      </Activity>
    </div>
  );
}
