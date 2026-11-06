import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
import endpoint from "../../services/endpoint";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  getRole,
  setRole,
} from "../../utils/tokenStorage";

// Helper to safely read auth metadata from in-memory runtime
const getSavedAuth = () => {
  const token = getAccessToken();
  const role = getRole();
  return { token, role, user: null, isAuthenticated: Boolean(token) };
};

const savedAuth = getSavedAuth();

/**
 * Persist auth in runtime memory only.
 * No localStorage / sessionStorage writes.
 */
const persistAuth = (token, role) => {
  setAccessToken(token);
  if (role) setRole(role);
  try {
    ["token", "role", "user", "recruiter"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  } catch {}
};

/** Wipe auth from runtime memory and purge storage. */
const clearAllAuth = () => {
  clearAccessToken();
  try {
    ["token", "role", "user", "recruiter"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  } catch {}
};

// ===================== ASYNC THUNKS ===================== //

// Candidate Signup
export const candidateSignup = createAsyncThunk(
  "auth/candidateSignup",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoint.candidate.signup, formData);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Candidate registration failed. Please try again.";
      return rejectWithValue(message);
    }
  }
);

// Candidate Login
export const candidateLogin = createAsyncThunk(
  "auth/candidateLogin",
  async ({ email, password, rememberMe }, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoint.candidate.login, { email, password });
      const data = response.data;
      const token = data.token || data.accessToken || data.jwt;
      const user = data.user || data.candidate || { email };

      if (token) {
        persistAuth(token, "candidate");
      }

      return { ...data, role: "candidate", user, token };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Invalid candidate credentials.";
      return rejectWithValue(message);
    }
  }
);

// Company Signup
export const companySignup = createAsyncThunk(
  "auth/companySignup",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoint.company.signup, formData);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Company registration failed. Please try again.";
      return rejectWithValue(message);
    }
  }
);

// Company Login
export const companyLogin = createAsyncThunk(
  "auth/companyLogin",
  async ({ email, password, rememberMe }, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoint.company.login, { email, password });
      const data = response.data;
      const token = data.token || data.accessToken || data.jwt;
      const user = data.user || data.company || { email };

      if (token) {
        persistAuth(token, "company");
      }

      return { ...data, role: "company", user, token };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Invalid company credentials.";
      return rejectWithValue(message);
    }
  }
);

// Recruiter Join Company (via invite link / QR)
export const recruiterJoinCompany = createAsyncThunk(
  "auth/recruiterJoinCompany",
  async ({ inviteCode, name, email, phone, designation, department, image, addedVia }, { rejectWithValue }) => {
    try {
      const payload = new FormData();
      payload.append("inviteCode", inviteCode);
      payload.append("name", name);
      payload.append("email", email);
      payload.append("phone", phone || "");
      payload.append("designation", designation || "");
      payload.append("department", department || "");
      payload.append("addedVia", addedVia || "invite_link");
      if (image) payload.append("image", image);
      const response = await api.post(endpoint.recruiter.joinCompany, payload);
      const data = response.data;
      // Backend returns { accessToken, recruiter: { ... } }
      const token = data.accessToken || data.token;
      const recruiter = data.recruiter || { name, email, designation, department };
      const user = { ...recruiter, role: "recruiter" };

      if (token) {
        persistAuth(token, "recruiter");
      }

      return { ...data, role: "recruiter", user, token };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to join company. Please try again.";
      return rejectWithValue(message);
    }
  }
);

// Helper: extract role from JWT payload
const extractRoleFromJwt = (token) => {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(atob(parts[1]));
      return payload.role || null;
    }
  } catch {
    return null;
  }
  return null;
};

// Silent Refresh Token (Rehydrates in-memory access token via httpOnly cookie)
export const silentRefreshToken = createAsyncThunk(
  "auth/silentRefreshToken",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const currentRole = auth.role || getRole();

      // Determine endpoints to try based on role or URL path
      let endpointsToTry = [];
      const path = typeof window !== "undefined" ? window.location.pathname : "";

      if (currentRole === "recruiter" || path.startsWith("/recruiter") || path.startsWith("/join-company")) {
        endpointsToTry = [endpoint.recruiter.refreshToken, endpoint.company.refreshToken];
      } else if (currentRole === "company") {
        endpointsToTry = [endpoint.company.refreshToken];
      } else if (currentRole === "candidate") {
        endpointsToTry = [endpoint.candidate.refreshToken];
      } else if (path.startsWith("/company")) {
        // No role in memory but URL hints at company portal — try company/recruiter
        endpointsToTry = [endpoint.company.refreshToken, endpoint.recruiter.refreshToken];
      } else if (path.startsWith("/candidate")) {
        endpointsToTry = [endpoint.candidate.refreshToken];
      } else {
        // Completely unknown — try all three
        endpointsToTry = [
          endpoint.candidate.refreshToken,
          endpoint.company.refreshToken,
          endpoint.recruiter.refreshToken,
        ];
      }

      let lastError = null;
      for (const refreshPath of endpointsToTry) {
        try {
          const response = await api.post(refreshPath);
          const token = response.data?.accessToken || response.data?.token;
          if (token) {
            // Always extract role from the JWT payload first (most reliable)
            const roleFromJwt = extractRoleFromJwt(token);
            // Fallback chain: JWT payload → path hint → current role
            const rawRole =
              roleFromJwt ||
              currentRole ||
              (refreshPath.includes("recruiter")
                ? "recruiter"
                : refreshPath.includes("company")
                ? "company"
                : "candidate");
            const detectedRole = String(rawRole).toLowerCase();
            setAccessToken(token);   // also sets memoryRole from JWT via tokenStorage
            setRole(detectedRole);   // ensure memoryRole is correct
            return { token, role: detectedRole };
          }
        } catch (err) {
          lastError = err;
        }
      }

      clearAllAuth();
      return rejectWithValue(lastError?.response?.data?.message || "Session expired");
    } catch (err) {
      clearAllAuth();
      return rejectWithValue(err.response?.data?.message || "Session expired");
    }
  }
);

// Verify OTP (unified for Candidate & Company)
export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async ({ email, otp, role = "candidate", type }, { rejectWithValue }) => {
    try {
      const targetEndpoint =
        role === "company" ? endpoint.company.verifyOtp : endpoint.candidate.verifyOtp;
      const response = await api.post(targetEndpoint, { email, otp, type });
      const data = response.data;
      const token = data.token || data.accessToken;
      const user = data.user || data.candidate || data.company;

      if (token) {
        setAccessToken(token);
        setRole(role);
      }

      return { ...data, role, user, token };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Invalid or expired OTP code.";
      return rejectWithValue(message);
    }
  }
);

// Resend OTP
export const resendOtp = createAsyncThunk(
  "auth/resendOtp",
  async ({ email, role = "candidate", type }, { rejectWithValue }) => {
    try {
      const targetEndpoint =
        role === "company" ? endpoint.company.resendOtp : endpoint.candidate.resendOtp;
      const response = await api.post(targetEndpoint, { email, type });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to resend OTP. Please try again.";
      return rejectWithValue(message);
    }
  }
);

// Forgot Password (Sends OTP)
export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async ({ email, role = "company" }, { rejectWithValue }) => {
    try {
      const targetEndpoint =
        role === "company" ? endpoint.company.forgotPassword : endpoint.candidate.forgotPassword;
      const response = await api.post(targetEndpoint, { email });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to send reset code. Please check your email.";
      return rejectWithValue(message);
    }
  }
);

// Reset Password with OTP
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ email, otp, newPassword, role = "company" }, { rejectWithValue }) => {
    try {
      const targetEndpoint =
        role === "company" ? endpoint.company.resetPassword : endpoint.candidate.resetPassword;
      const response = await api.post(targetEndpoint, { email, otp, newPassword });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to reset password. Please check your OTP.";
      return rejectWithValue(message);
    }
  }
);

// Fetch current user (GetMe)
export const getMe = createAsyncThunk(
  "auth/getMe",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const role = auth.role || getRole() || "candidate";
      const targetEndpoint =
        role === "recruiter"
          ? endpoint.company.getRecruiterProfile
          : role === "company"
          ? endpoint.company.getMe
          : endpoint.candidate.getMe;
      const response = await api.get(targetEndpoint);
      const user =
        response.data?.profile ||
        response.data?.user ||
        response.data?.company ||
        response.data;
      return { user, role };
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch user session.";
      return rejectWithValue(message);
    }
  }
);

// Logout
export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { getState }) => {
    try {
      const { auth } = getState();
      const role = auth.role || getRole();
      const targetEndpoint =
        role === "recruiter" || role === "company"
          ? endpoint.company.logout
          : endpoint.candidate.logout;
      if (targetEndpoint) {
        await api.post(targetEndpoint).catch(() => {});
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAllAuth();
    }
    return true;
  }
);

// ===================== AUTH SLICE ===================== //

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: savedAuth.user,
    token: savedAuth.token,
    role: savedAuth.role,
    isAuthenticated: savedAuth.isAuthenticated,
    loading: false,
    error: null,
    successMessage: null,
    otpTarget: {
      email: "",
      role: "candidate",
    },
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    clearAuthSuccess: (state) => {
      state.successMessage = null;
    },
    setOtpTarget: (state, action) => {
      state.otpTarget = {
        email: action.payload.email || "",
        role: action.payload.role || "candidate",
      };
    },
    localLogout: (state) => {
      state.user = null;
      state.token = null;
      state.role = null;
      state.isAuthenticated = false;
      state.error = null;
      state.successMessage = null;
      clearAllAuth();
    },
    /** Called after a silent token refresh to update in-memory state. */
    updateToken: (state, action) => {
      state.token = action.payload;
      setAccessToken(action.payload);
      state.isAuthenticated = Boolean(action.payload);
    },
    updateAuthUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Silent Refresh Token
      .addCase(silentRefreshToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(silentRefreshToken.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.role = action.payload.role;
        state.isAuthenticated = true;
      })
      .addCase(silentRefreshToken.rejected, (state) => {
        state.loading = false;
        state.token = null;
        state.isAuthenticated = false;
      })
      // Candidate Signup
      .addCase(candidateSignup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(candidateSignup.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload?.message || "Registration successful! Please verify your OTP.";
      })
      .addCase(candidateSignup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Candidate Login
      .addCase(candidateLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(candidateLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.role = "candidate";
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(candidateLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Company Signup
      .addCase(companySignup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(companySignup.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload?.message || "Company registered! Please verify your OTP.";
      })
      .addCase(companySignup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Company Login
      .addCase(companyLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(companyLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.role = "company";
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(companyLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Recruiter Join Company
      .addCase(recruiterJoinCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(recruiterJoinCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.role = "recruiter";
        state.isAuthenticated = true;
        state.error = null;
        state.successMessage = action.payload?.message || "Successfully joined the company!";
      })
      .addCase(recruiterJoinCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Verify OTP
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.token) {
          state.token = action.payload.token;
          state.role = action.payload.role;
          state.user = action.payload.user || state.user;
          state.isAuthenticated = true;
        }
        state.successMessage = action.payload?.message || "OTP verified successfully!";
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Resend OTP
      .addCase(resendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload?.message || "A new OTP has been sent to your email.";
      })
      .addCase(resendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Forgot Password
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload?.message || "Password reset OTP sent to your email.";
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Reset Password
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload?.message || "Password reset successfully. Please login.";
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Me
      .addCase(getMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.role = action.payload.role;
        state.isAuthenticated = true;
      })
      .addCase(getMe.rejected, (state) => {
        // Token might be invalid/expired
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.role = null;
        clearAllAuth();
      })

      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.role = null;
        state.isAuthenticated = false;
        state.error = null;
        state.successMessage = null;
      });
  },
});

export const {
  clearAuthError,
  clearAuthSuccess,
  setOtpTarget,
  localLogout,
  updateToken,
  updateAuthUser,
} = authSlice.actions;
export default authSlice.reducer;
