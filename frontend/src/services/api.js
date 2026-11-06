import axios from "axios";
import { getAccessToken, setAccessToken, clearAccessToken, getRole } from "../utils/tokenStorage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  withCredentials: true, // Always send httpOnly cookies (refreshToken)
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor: attach access token directly from browser memory ────
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      if (typeof config.headers.delete === "function") {
        config.headers.delete("Content-Type");
      } else {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: silent token refresh on 401 ────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt a refresh once, and never for the refresh endpoint itself
    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      originalRequest?.url?.includes("/refresh-token")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Pick the correct refresh endpoint based on in-memory role or request URL
    const inMemRole = getRole();
    const reqUrl = originalRequest?.url || "";
    const isCompanyOrRecruiter =
      inMemRole === "company" ||
      inMemRole === "recruiter" ||
      reqUrl.includes("/company") ||
      reqUrl.includes("/recruiter") ||
      (typeof window !== "undefined" &&
        (window.location.pathname.startsWith("/company") ||
          window.location.pathname.startsWith("/recruiter") ||
          window.location.pathname.startsWith("/join-company")));

    const isRecruiterContext =
      inMemRole === "recruiter" ||
      reqUrl.includes("/recruiter") ||
      (typeof window !== "undefined" &&
        (window.location.pathname.startsWith("/recruiter") ||
          window.location.pathname.startsWith("/join-company")));

    const refreshPaths = isCompanyOrRecruiter
      ? isRecruiterContext
        ? ["/recruiter/refresh-token", "/company/refresh-token"]
        : ["/company/refresh-token", "/recruiter/refresh-token"]
      : ["/candidate/refresh-token"];

    let newToken = null;
    let lastRefreshError = null;

    for (const refreshPath of refreshPaths) {
      try {
        const refreshResponse = await api.post(refreshPath);
        newToken = refreshResponse.data?.accessToken || refreshResponse.data?.token;
        if (newToken) break;
      } catch (err) {
        lastRefreshError = err;
      }
    }

    if (!newToken) {
      clearAccessToken();
      try {
        ["token", "role", "user", "recruiter"].forEach((k) => {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        });
      } catch {}
      return Promise.reject(lastRefreshError || error);
    }

    // Store new access token strictly in browser memory
    setAccessToken(newToken);

    // Retry original request with the new memory-held access token
    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return api(originalRequest);
  }
);

export default api;
