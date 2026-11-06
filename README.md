# HireHub - Intelligent Recruitment & Hiring Platform

HireHub is a full-stack, enterprise-grade recruitment platform connecting Companies, Recruiters, and Candidates with real-time proctoring, AI evaluations, Kafka event publishing, and secure role-based session management.

---

## Architecture Overview

- **Frontend:** React 18, Vite, Redux Toolkit, React Router v6, Axios, Lucide Icons, jsQR.
- **Backend Services:** Node.js, Express, MongoDB (Mongoose), Redis (BullMQ queues), Apache Kafka (event streaming), ImageKit.
- **Security & Tokens:** In-memory short-lived Access Tokens (15m), HttpOnly Secure Refresh Tokens (7d), Session Rotation & Immediate Revocation.

---

## Authentication & Security Model

HireHub strictly implements modern **OAuth 2.0 / JWT Security Best Practices**:

1. **Access Tokens in Browser Memory:**
   - Access tokens are stored exclusively in **JavaScript runtime memory** (`tokenStorage.js` & Redux store).
   - They are **never persisted to disk** (`localStorage` / `sessionStorage`), completely eliminating XSS token theft.
   - Attached automatically via Axios request interceptors as `Authorization: Bearer <token>`.

2. **Refresh Tokens in HttpOnly Cookies:**
   - Refresh tokens are stored in `httpOnly`, `Secure`, `SameSite` cookies.
   - Inaccessible to client-side scripts, protecting against credential theft.

3. **Silent Session Rehydration:**
   - On page refresh (F5), memory clears naturally.
   - `ProtectedRoute.jsx` intercepts the request and silently calls `/refresh-token`.
   - The browser automatically transmits the secure cookie; the backend rotates the session and issues a fresh in-memory access token without interrupting the user.

4. **Instant Session Revocation:**
   - When a Company Admin deactivates or removes a recruiter, all active session documents for that recruiter in MongoDB are immediately updated to `{ revoked: true, status: "revoked" }`.
   - Any further attempt to refresh or use that session fails with `401 Unauthorized` / `403 Forbidden`.

---

## Detailed Documentation

For full technical specifications, sequence diagrams, bug resolutions, and API matrices, see:
- 📖 [Frontend Security & Architecture README](./frontend/README.md)

