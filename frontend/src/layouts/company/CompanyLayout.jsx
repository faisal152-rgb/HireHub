import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { getMe } from "../../features/auth/authSlice";
import { getAccessToken, getRole } from "../../utils/tokenStorage";
import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import "../../features/company/styles/companyDashboard.css";

export default function CompanyLayout() {
  const dispatch = useAppDispatch();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("company_sidebar_collapsed");
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const currentRole = useAppSelector((state) => state.auth.role);

  useEffect(() => {
    const role = currentRole || getRole();
    if (role === "company" || role === "recruiter") {
      dispatch(getMe());
    }
  }, [dispatch, currentRole]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("company_sidebar_collapsed", JSON.stringify(next));
      }
      return next;
    });
  };

  return (
    <div className={`comp-layout ${isCollapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}>
      {/* Fixed Left Sidebar (Does not scroll with page content) */}
      <CompanySidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main Scrollable Content Area */}
      <div className="comp-content-area">
        <CompanyHeader />
        <main className="comp-main-viewport">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
