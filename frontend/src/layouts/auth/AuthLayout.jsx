import React, { Activity } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import "../../features/auth/styles/auth.css";

// ── 1. Company / Enterprise Corporate Recruitment Illustration ──
const CompanyAuthIllustration = () => (
  <svg
    viewBox="0 0 440 320"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="auth-vector-illustration"
  >
    <defs>
      <linearGradient id="compBldgGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#818CF8" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id="compGlass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#C7D2FE" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#818CF8" stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id="compAccent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#6366F1" />
      </linearGradient>
    </defs>

    {/* Ambient Floor Glow */}
    <ellipse cx="220" cy="285" rx="175" ry="25" fill="#EAE8FD" />

    {/* ── Background: Corporate Headquarters / City Skyline ── */}
    {/* Left Tower */}
    <rect x="55" y="85" width="60" height="195" rx="6" fill="#EDE9FE" opacity="0.8" />
    <path d="M55 85 L85 65 L115 85 Z" fill="#DDD6FE" />
    {/* Tower Windows */}
    <g fill="#A5B4FC" opacity="0.6">
      <rect x="65" y="100" width="10" height="14" rx="2" />
      <rect x="85" y="100" width="10" height="14" rx="2" />
      <rect x="65" y="125" width="10" height="14" rx="2" />
      <rect x="85" y="125" width="10" height="14" rx="2" />
      <rect x="65" y="150" width="10" height="14" rx="2" />
      <rect x="85" y="150" width="10" height="14" rx="2" />
      <rect x="65" y="175" width="10" height="14" rx="2" />
      <rect x="85" y="175" width="10" height="14" rx="2" />
      <rect x="65" y="200" width="10" height="14" rx="2" />
      <rect x="85" y="200" width="10" height="14" rx="2" />
    </g>

    {/* Center High-Rise Tower */}
    <rect x="125" y="50" width="75" height="230" rx="8" fill="url(#compBldgGlow)" />
    <line x1="162" y1="25" x2="162" y2="50" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" />
    <circle cx="162" cy="24" r="3" fill="#6366F1" />
    <g fill="#818CF8" opacity="0.45">
      <rect x="135" y="65" width="14" height="16" rx="2" />
      <rect x="156" y="65" width="14" height="16" rx="2" />
      <rect x="176" y="65" width="14" height="16" rx="2" />
      <rect x="135" y="90" width="14" height="16" rx="2" />
      <rect x="156" y="90" width="14" height="16" rx="2" />
      <rect x="176" y="90" width="14" height="16" rx="2" />
      <rect x="135" y="115" width="14" height="16" rx="2" />
      <rect x="156" y="115" width="14" height="16" rx="2" />
      <rect x="176" y="115" width="14" height="16" rx="2" />
    </g>

            {/* Potted Plant Left */}
    <path d="M50 280 H70 L66 250 H54 Z" fill="#C7D2FE" />
    <path d="M60 250 Q45 220 35 200 Q50 205 60 250 Z" fill="#818CF8" />
    <path d="M60 250 Q65 210 75 195 Q75 220 60 250 Z" fill="#6366F1" />
    <path d="M60 250 Q30 240 20 230 Q40 245 60 250 Z" fill="#A5B4FC" />


    {/* Right Office Glass Tower */}
    <rect x="315" y="105" width="65" height="175" rx="6" fill="#EEF2FF" />
    <g fill="#93C5FD" opacity="0.5">
      <rect x="325" y="120" width="12" height="14" rx="2" />
      <rect x="345" y="120" width="12" height="14" rx="2" />
      <rect x="325" y="145" width="12" height="14" rx="2" />
      <rect x="345" y="145" width="12" height="14" rx="2" />
      <rect x="325" y="170" width="12" height="14" rx="2" />
      <rect x="345" y="170" width="12" height="14" rx="2" />
    </g>


    {/* ── Enterprise Floating Badges ── */}
    {/* Floating Badge 1 (Top Left): Verified Company / Enterprise Shield */}
    <g transform="translate(42, 45)">
      <rect width="90" height="36" rx="10" fill="#FFFFFF" filter="drop-shadow(0 6px 14px rgba(99,102,241,0.18))" />
      <rect x="8" y="7" width="22" height="22" rx="6" fill="#4F46E5" />
      {/* Building icon */}
      <path d="M14 22 V14 H24 V22 M17 17 H18 M20 17 H21 M17 19 H18 M20 19 H21" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <text x="36" y="18" fill="#0F172A" fontSize="9" fontWeight="700" fontFamily="sans-serif">Enterprise</text>
      <text x="36" y="27" fill="#10B981" fontSize="7.5" fontWeight="600" fontFamily="sans-serif">● Verified</text>
    </g>

    {/* Floating Badge 2 (Top Right): 98% Match Rate Shield */}
    <g transform="translate(295, 35)">
      <rect width="98" height="38" rx="10" fill="#FFFFFF" filter="drop-shadow(0 6px 14px rgba(79,70,229,0.18))" />
      <rect x="8" y="7" width="24" height="24" rx="7" fill="url(#compAccent)" />
      {/* Star / Shield checkmark */}
      <path d="M15 19 L19 23 L25 15" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="38" y="19" fill="#0F172A" fontSize="9" fontWeight="700" fontFamily="sans-serif">98% Match</text>
      <text x="38" y="28" fill="#6366F1" fontSize="7.5" fontWeight="600" fontFamily="sans-serif">Top 1% Talent</text>
    </g>

    {/* Floating Badge 3 (Middle Right): Growth Analytics Chart */}
    <g transform="translate(325, 175)">
      <rect width="78" height="42" rx="10" fill="#FFFFFF" filter="drop-shadow(0 4px 12px rgba(15,23,42,0.12))" />
      {/* Mini bar chart */}
      <rect x="14" y="26" width="6" height="10" rx="1.5" fill="#C7D2FE" />
      <rect x="23" y="20" width="6" height="16" rx="1.5" fill="#818CF8" />
      <rect x="32" y="14" width="6" height="22" rx="1.5" fill="#4F46E5" />
      {/* Upward arrow */}
      <path d="M44 26 L56 16 M56 16 H49 M56 16 V22" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="14" y="11" fill="#64748B" fontSize="7" fontWeight="600" fontFamily="sans-serif">Hiring Growth</text>
    </g>
    
        {/* Plant Right */}
    <path d="M290 280 H310 L306 255 H294 Z" fill="#C7D2FE" />
    <path d="M300 255 Q315 225 330 215 Q325 240 300 255 Z" fill="#6366F1" />
    <path d="M300 255 Q290 220 280 205 Q295 220 300 255 Z" fill="#818CF8" />
  </svg>
);

// ── 2. Candidate Talent / Career Seeker Illustration ──
const CandidateAuthIllustration = () => (
  <svg
    viewBox="0 0 420 320"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="auth-vector-illustration"
  >
    {/* Soft ambient background glow */}
    <ellipse cx="210" cy="270" rx="160" ry="24" fill="#EAE8FD" />

    {/* Potted Plant Left */}
    <path d="M50 280 H70 L66 250 H54 Z" fill="#C7D2FE" />
    <path d="M60 250 Q45 220 35 200 Q50 205 60 250 Z" fill="#818CF8" />
    <path d="M60 250 Q65 210 75 195 Q75 220 60 250 Z" fill="#6366F1" />
    <path d="M60 250 Q30 240 20 230 Q40 245 60 250 Z" fill="#A5B4FC" />

    {/* Chair */}
    <rect x="120" y="200" width="12" height="75" rx="3" fill="#312E81" />
    <rect x="180" y="200" width="12" height="75" rx="3" fill="#312E81" />
    <rect x="105" y="195" width="105" height="18" rx="8" fill="#1E1B4B" />
    <path d="M110 195 L115 130 Q118 120 128 120 L135 120 Q145 120 145 130 L145 195 Z" fill="#1E1B4B" />

    {/* Person Body */}
    <path d="M140 205 L190 205 L225 275 L205 278 L175 220 L140 220 Z" fill="#3730A3" />
    <path d="M150 205 L175 205 L200 260 L240 265 L245 275 L195 275 Z" fill="#4338CA" />
    <path d="M225 275 L250 278 Q255 285 245 288 L215 288 Z" fill="#1E1B4B" />
    <path d="M195 275 L220 278 Q225 285 215 288 L185 288 Z" fill="#1E1B4B" />

    {/* Torso & Shirt */}
    <path d="M130 145 Q150 135 170 145 L178 208 L125 208 Z" fill="#6366F1" />
    <path d="M165 155 L195 180 L180 192 L150 170 Z" fill="#4F46E5" />
    <path d="M135 155 L170 185 L185 185 L145 160 Z" fill="#6366F1" />

    {/* Head & Hair */}
    <circle cx="150" cy="115" r="16" fill="#FCD34D" />
    <path d="M136 112 Q140 96 156 98 Q166 100 165 114 Q156 106 142 110 Z" fill="#1E1B4B" />

    {/* Laptop */}
    <polygon points="175,185 220,185 210,155 178,160" fill="#E2E8F0" />
    <path d="M172 185 L225 185 L228 189 L170 189 Z" fill="#94A3B8" />

    {/* Floating Badges */}
    <g transform="translate(60, 110)">
      <rect width="36" height="36" rx="10" fill="#6366F1" />
      <circle cx="18" cy="15" r="6" fill="#FFFFFF" />
      <path d="M10 28 Q18 22 26 28" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </g>

    <g transform="translate(250, 95)">
      <rect width="38" height="38" rx="10" fill="#4F46E5" />
      <path d="M14 20 L18 24 L26 15" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    <g transform="translate(280, 165)">
      <rect width="34" height="34" rx="9" fill="#818CF8" />
      <circle cx="17" cy="14" r="5" fill="#FFFFFF" />
      <path d="M10 25 Q17 20 24 25" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Plant Right */}
    <path d="M290 280 H310 L306 255 H294 Z" fill="#C7D2FE" />
    <path d="M300 255 Q315 225 330 215 Q325 240 300 255 Z" fill="#6366F1" />
    <path d="M300 255 Q290 220 280 205 Q295 220 300 255 Z" fill="#818CF8" />
  </svg>
);

export default function AuthLayout() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const roleParam = searchParams.get("role");
  const isCompany = location.pathname.includes("company") || roleParam === "company";
  const isOtp = location.pathname.includes("verify-otp") || location.pathname.includes("otp");

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        {/* ── Left Side (Branded lavender panel) ── */}
        <aside className="auth-left-panel">
          {/* Logo */}
          <Link to="/" className="auth-panel-logo">
            <img src="/logo.png" alt="HiringHub Logo" className="auth-logo-img" />
            <span>Hiring<strong>Hub</strong></span>
          </Link>

          {/* Headline & Subtitle wrapped in React 19 Activity */}
          <div className="auth-left-content">
            <Activity mode={isCompany ? "visible" : "hidden"}>
              <div>
                <h1 className="auth-headline">
                  {isOtp ? (
                    <>
                      Secure Your <br />
                      Company Portal
                    </>
                  ) : (
                    <>
                      Find the Best <br />
                      Talent for Your Team
                    </>
                  )}
                </h1>
                <p className="auth-subtext">
                  {isOtp
                    ? "Verify your official company credentials to manage job openings, collaborate with recruiters, and access verified candidates."
                    : "Post jobs, manage applications, and hire exceptional professionals — all in one centralized hiring hub."}
                </p>
              </div>
            </Activity>

            <Activity mode={!isCompany ? "visible" : "hidden"}>
              <div>
                <h1 className="auth-headline">
                  {isOtp ? (
                    <>
                      Verify Your <br />
                      Candidate Account
                    </>
                  ) : (
                    <>
                      Your Skills, <br />
                      Our Opportunities.
                    </>
                  )}
                </h1>
                <p className="auth-subtext">
                  {isOtp
                    ? "Enter your 6-digit confirmation code to activate your profile, showcase your expertise, and connect with top recruiters."
                    : "Join thousands of candidates and take the next big step in your career with AI-matched jobs."}
                </p>
              </div>
            </Activity>
          </div>

          {/* Vector Illustration wrapped in React 19 Activity */}
          <div className="auth-illustration-container">
            <Activity mode={isCompany ? "visible" : "hidden"}>
              <CompanyAuthIllustration />
            </Activity>
            <Activity mode={!isCompany ? "visible" : "hidden"}>
              <CandidateAuthIllustration />
            </Activity>
          </div>
        </aside>

        {/* ── Right Side (White Form Panel) ── */}
        <main className="auth-right-panel">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
