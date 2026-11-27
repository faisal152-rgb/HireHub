import React from "react";

export function AuthCardSkeleton() {
  return (
    <div className="auth-page-wrapper" aria-busy="true" aria-label="Loading authentication">
      <div className="auth-card-container auth-skeleton-card">
        <div className="auth-left-panel auth-sk-left">
          <div className="auth-sk-box" style={{ width: 130, height: 28, marginBottom: 24, opacity: 0.25 }} />
          <div className="auth-sk-box" style={{ width: "80%", height: 32, marginBottom: 14, opacity: 0.25 }} />
          <div className="auth-sk-box" style={{ width: "90%", height: 14, marginBottom: 10, opacity: 0.2 }} />
          <div className="auth-sk-box" style={{ width: "70%", height: 14, marginBottom: 32, opacity: 0.2 }} />
          <div className="auth-sk-box" style={{ width: "100%", height: 180, borderRadius: 16, opacity: 0.15 }} />
        </div>

        <div className="auth-right-panel">
          <div className="auth-sk-box" style={{ width: 170, height: 28, marginBottom: 10 }} />
          <div className="auth-sk-box" style={{ width: "85%", height: 14, marginBottom: 28 }} />

          <div className="auth-sk-box" style={{ width: 90, height: 12, marginBottom: 8 }} />
          <div className="auth-sk-box" style={{ width: "100%", height: 44, marginBottom: 18, borderRadius: 10 }} />

          <div className="auth-sk-box" style={{ width: 90, height: 12, marginBottom: 8 }} />
          <div className="auth-sk-box" style={{ width: "100%", height: 44, marginBottom: 22, borderRadius: 10 }} />

          <div className="auth-sk-box" style={{ width: "100%", height: 46, borderRadius: 10, marginBottom: 18 }} />
          <div className="auth-sk-box" style={{ width: "60%", height: 13, margin: "0 auto" }} />
        </div>
      </div>
    </div>
  );
}

export function RoleSelectSkeleton() {
  return (
    <div className="role-page" aria-busy="true" aria-label="Loading role selection">
      <div className="role-page-inner" style={{ width: "100%" }}>
        <div className="auth-sk-box" style={{ width: 150, height: 36, margin: "0 auto 32px" }} />
        <div className="auth-sk-box" style={{ width: 280, maxWidth: "85%", height: 36, margin: "0 auto 12px" }} />
        <div className="auth-sk-box" style={{ width: 340, maxWidth: "90%", height: 16, margin: "0 auto 36px" }} />

        <div className="role-cards-grid">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div className="role-card-item" key={idx}>
              <div className="auth-sk-box" style={{ width: 52, height: 52, borderRadius: 14, marginBottom: 18 }} />
              <div className="auth-sk-box" style={{ width: "65%", height: 24, marginBottom: 12 }} />
              <div className="auth-sk-box" style={{ width: "95%", height: 14, marginBottom: 8 }} />
              <div className="auth-sk-box" style={{ width: "80%", height: 14, marginBottom: 24 }} />
              <div className="auth-sk-box" style={{ width: "100%", height: 44, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
