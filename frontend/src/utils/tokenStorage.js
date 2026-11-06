/**
 * Browser In-Memory Access Token & Role Storage
 * 
 * In accordance with OAuth 2.0 and JWT best practices:
 * 1. The Access Token and Role are stored ONLY in browser memory (JavaScript runtime closure).
 *    They are NEVER written to localStorage or sessionStorage disk.
 * 2. The Refresh Token is maintained by the server in an httpOnly, Secure cookie.
 * 3. On page refresh, in-memory state is rehydrated via silent refresh and /me.
 */

let memoryAccessToken = null;
let memoryRole = null;

/** Extract role from JWT payload — exported for use in authSlice */
export const extractRoleFromJwt = (token) => {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(atob(parts[1]));
      let role = payload.role || payload.userType || null;
      if (typeof role === "string") {
        role = role.toLowerCase();
        // If recruiter has role "admin", normalize to recruiter
        if (role === "admin") role = "recruiter";
      }
      return role;
    }
  } catch {
    return null;
  }
  return null;
};

/** Set access token in JavaScript runtime memory */
export const setAccessToken = (token) => {
  memoryAccessToken = token || null;
  const detectedRole = extractRoleFromJwt(token);
  if (detectedRole) {
    memoryRole = detectedRole.toLowerCase();
  }
};

/** Get access token from JavaScript runtime memory */
export const getAccessToken = () => {
  return memoryAccessToken;
};

/** Set role in JavaScript runtime memory */
export const setRole = (role) => {
  memoryRole = typeof role === "string" ? role.toLowerCase() : null;
};

/** Get role from JavaScript runtime memory */
export const getRole = () => {
  return memoryRole;
};

/** Clear access token and role from JavaScript runtime memory */
export const clearAccessToken = () => {
  memoryAccessToken = null;
  memoryRole = null;
};

/**
 * Kept for interface compatibility — sets in-memory state only.
 * No localStorage / sessionStorage writes.
 */
export const setAuthSession = (token, user, role) => {
  setAccessToken(token);
  if (role) setRole(role);
  // Ensure disk storage is purged of legacy auth keys
  try {
    ["token", "user", "recruiter", "role"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  } catch {}
};

/**
 * Read the active auth metadata strictly from memory.
 */
export const getAuthSession = () => ({
  token: getAccessToken(),
  role: getRole(),
  user: null, // user lives strictly in Redux state
});

/**
 * Wipe auth session from memory and purge any legacy keys from browser storage.
 */
export const clearAuthSession = () => {
  clearAccessToken();
  try {
    ["role", "token", "user", "recruiter"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  } catch {}
};
