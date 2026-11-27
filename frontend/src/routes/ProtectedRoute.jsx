import React, { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { getAccessToken, getRole } from "../utils/tokenStorage";
import { silentRefreshToken } from "../features/auth/authSlice";

export default function ProtectedRoute({ allowedRole }) {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { isAuthenticated, role, loading } = useAppSelector((state) => state.auth);

  // Track whether we've already attempted a silent refresh this mount
  const refreshAttempted = useRef(false);
  const [isInitializing, setIsInitializing] = useState(() => !getAccessToken());

  useEffect(() => {
    // Only attempt once per mount; re-run if token disappears
    if (!getAccessToken() && !refreshAttempted.current) {
      refreshAttempted.current = true;
      dispatch(silentRefreshToken())
        .unwrap()
        .catch(() => {})   // errors are handled by Redux state (isAuthenticated = false)
        .finally(() => setIsInitializing(false));
    } else if (getAccessToken()) {
      setIsInitializing(false);
    }
  }, [dispatch]);

  // Show skeleton screen while silent refresh / auth initialization completes
  if (isInitializing || loading) {
    return (
      <div className="route-sk-shell" aria-busy="true" aria-label="Loading workspace">
        <aside className="route-sk-sidebar">
          <div className="route-sk-box" style={{ width: "80%", height: 32, marginBottom: 12 }} />
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="route-sk-box" style={{ width: 22, height: 22, flexShrink: 0 }} />
              <div className="route-sk-box route-sk-sidebar-label" style={{ width: "75%", height: 14 }} />
            </div>
          ))}
        </aside>

        <div className="route-sk-main">
          <header className="route-sk-header">
            <div className="route-sk-box" style={{ width: 220, maxWidth: "55%", height: 34 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="route-sk-box" style={{ width: 34, height: 34, borderRadius: "50%" }} />
              <div className="route-sk-box" style={{ width: 34, height: 34, borderRadius: "50%" }} />
            </div>
          </header>

          <div className="route-sk-content">
            <div className="route-sk-box" style={{ width: 240, maxWidth: "70%", height: 26 }} />
            <div className="route-sk-stats">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div className="route-sk-card" key={idx}>
                  <div className="route-sk-box" style={{ width: 90, height: 12, marginBottom: 12 }} />
                  <div className="route-sk-box" style={{ width: 56, height: 26 }} />
                </div>
              ))}
            </div>
            <div className="route-sk-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="route-sk-box" style={{ width: "100%", height: 42 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // After init — read authoritative values from memory (updated by silentRefreshToken)
  const activeToken = getAccessToken();
  const rawRole = role || getRole();
  const activeRole = typeof rawRole === "string" ? rawRole.toLowerCase() : "";
  const isAuth = Boolean(activeToken) || isAuthenticated;

  const targetAllowed = String(allowedRole || "").toLowerCase();

  if (!isAuth) {
    const loginPath =
      targetAllowed === "company" || targetAllowed === "recruiter"
        ? "/company/login"
        : "/candidate/login";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Company routes are accessible by both Company Admin and Recruiters
  const isRoleMatch =
    !allowedRole ||
    activeRole === targetAllowed ||
    (targetAllowed === "company" && (activeRole === "company" || activeRole === "recruiter")) ||
    (targetAllowed === "recruiter" && (activeRole === "recruiter" || activeRole === "company"));

  if (!isRoleMatch) {
    const fallbackPath =
      activeRole === "company" || activeRole === "recruiter"
        ? "/company/dashboard"
        : "/candidate/dashboard";
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}
