import React, { Activity } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CompanyLoginForm from "../components/CompanyLoginForm";
import CompanySignupForm from "../components/CompanySignupForm";

export default function CompanyAuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = !location.pathname.includes("signup");

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
