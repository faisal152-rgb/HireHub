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

  // While Redux is processing the refresh OR local init is still pending — show loader
  if (isInitializing || loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#94a3b8" }}>Loading session...</p>
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
