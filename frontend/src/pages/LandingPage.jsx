import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Shield,
  Zap,
  CheckCircle,
  Star,
  Users,
  Building2,
  FileCheck,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Award,
  Play,
  Clock,
  ChevronRight,
  Check,
  QrCode,
  Link as LinkIcon,
  UserCheck,
  Headphones,
  Camera
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="lp-wrap">
      {/* ══════════════════════════════════════════════════════════════════
          1. HERO SECTION
         ══════════════════════════════════════════════════════════════════ */}
      <section className="lp-hero-section" id="hero">
        <div className="lp-container">
          <div className="lp-hero-grid">
            {/* Left Column: Heading & Description & CTAs */}
            <div className="lp-hero-content">
              <div className="lp-hero-tag-wrap">
                <span className="lp-hero-tag">
                  <Sparkles size={11} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
                  AI-Powered Hiring Platform
                </span>
              </div>

              <h1 className="lp-hero-title">
                Smarter Hiring.{" "}
                <br />
                <span className="lp-hero-title-highlight">Brighter Futures.</span>
              </h1>

              <p className="lp-hero-desc">
                HireHub connects talented individuals with the right opportunities using the power
                of AI. For candidates, we make job search simple. For employers, we make hiring{" "}
                <strong>faster</strong>, <strong>smarter</strong> and more accurate.
              </p>

              {/* Action Buttons — matching reference: "Find Jobs" + "For Employers" */}
              <div className="lp-hero-cta-row">
                <Link to="/candidate/signup" className="lp-btn-primary" id="hero-find-jobs-btn">
                  Find Jobs
                </Link>
                <Link to="/company/signup" className="lp-btn-outline" id="hero-employers-btn">
                  For Employers
                </Link>
              </div>

              {/* Hero Mini Feature Badges Row — AI Matching / Verified Profiles / Fast Hiring */}
              <div className="lp-hero-badges-row">
                <div className="lp-hbadge-item">
                  <div className="lp-hbadge-icon">
                    <Zap size={16} />
                  </div>
                  <div className="lp-hbadge-text">
                    <strong>AI Matching</strong>
                    <span>Right job, right fit</span>
                  </div>
                </div>

                <div className="lp-hbadge-divider" />

                <div className="lp-hbadge-item">
                  <div className="lp-hbadge-icon">
                    <Shield size={16} />
                  </div>
                  <div className="lp-hbadge-text">
                    <strong>Verified Profiles</strong>
                    <span>Trusted &amp; authentic</span>
                  </div>
                </div>

                <div className="lp-hbadge-divider" />

                <div className="lp-hbadge-item">
                  <div className="lp-hbadge-icon">
                    <TrendingUp size={16} />
                  </div>
                  <div className="lp-hbadge-text">
                    <strong>Fast Hiring</strong>
                    <span>Save time &amp; cost</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Reference-style composite hero visual */}
            <div className="lp-hero-visual">
              <div className="lp-hero-img-wrap">
                {/* Hero Woman Image */}
                <img
                  src="/assets/hero-woman.png"
                  alt="Professional woman holding laptop"
                  className="lp-hero-main-img"
                />

                {/* ── Floating Widget 1: Search Card (Top-Left) ── */}
                <div className="lp-search-card">
                  <p className="lp-search-card-title">Your Next Opportunity<br />Is One Click Away!</p>
                  <div className="lp-search-input-row">
                    <input
                      className="lp-search-input"
                      type="text"
                      placeholder="Search jobs, companies, skills..."
                    />
                    <Link to="/candidate/signup">
                      <div className="lp-search-btn-fake">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* ── Floating Widget 2: Checklist Card (Top-Right) ── */}
                <div className="lp-checklist-card">
                  {[
                    "Upload Resume",
                    "Take AI Assessment",
                    "Get Hired",
                  ].map((item) => (
                    <div className="lp-checklist-item" key={item}>
                      <div className="lp-checklist-dot">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      {item}
                    </div>
                  ))}
                </div>

                {/* ── Floating Widget 3: AI Match Score (Bottom-Right) ── */}
                <div className="lp-match-card">
                  <div className="lp-match-ring-wrap">
                    <svg className="lp-match-circular" viewBox="0 0 36 36">
                      <circle className="lp-match-circle-bg" cx="18" cy="18" r="15.9" />
                      <circle
                        className="lp-match-circle-fill"
                        cx="18"
                        cy="18"
                        r="15.9"
                        strokeDasharray="93, 100"
                        style={{ transformOrigin: "18px 18px", transform: "rotate(-90deg)" }}
                      />
                      <text x="18" y="19" className="lp-match-circle-text-val">93%</text>
                    </svg>
                  </div>
                  <div className="lp-match-card-text">
                    <span className="lp-match-label">AI Match Score</span>
                    <span className="lp-match-value">93%</span>
                    <span className="lp-match-sub">Great match for your profile!</span>
                  </div>
                </div>

                {/* ── Floating Widget 4: Company Logos Row (Bottom) ── */}
                <div className="lp-logos-row">
                  {/* Google */}
                  <div className="lp-logo-icon" title="Google">
                    <a href="https://google.com">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    </a>
                  </div>
                  {/* Microsoft */}
                  <div className="lp-logo-icon" title="Microsoft">
                    <a href="https://microsoft.com">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022"/>
                        <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00"/>
                        <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF"/>
                        <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900"/>
                      </svg>
                    </a>
                  </div>
                  {/* Amazon */}
                  <div className="lp-logo-icon" title="Amazon">
                    <a href="https://amazon.com">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.958 10.09c0 1.232.029 2.256-.592 3.347-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.689zm3.186 7.705a.658.658 0 0 1-.742.074c-1.044-.869-1.231-1.271-1.805-2.099-1.727 1.76-2.948 2.286-5.187 2.286-2.651 0-4.712-1.636-4.712-4.912 0-2.559 1.387-4.302 3.362-5.154 1.711-.755 4.104-.889 5.935-1.098V6.55c0-.718.056-1.565-.364-2.187-.368-.558-1.074-.789-1.697-.789-1.152 0-2.178.592-2.43 1.817-.052.271-.254.537-.531.551l-2.974-.321c-.251-.056-.529-.259-.457-.643C6.494 2.378 9.37 1.5 11.938 1.5c1.312 0 3.024.35 4.059 1.346 1.312 1.226 1.187 2.86 1.187 4.638v4.201c0 1.263.524 1.818 1.017 2.499.175.245.213.538-.008.719l-1.049.892zM20.48 18.4c-3.398 2.516-8.324 3.853-12.57 3.853-5.947 0-11.306-2.198-15.36-5.854-.318-.288-.033-.681.349-.457 4.37 2.542 9.773 4.069 15.352 4.069 3.764 0 7.905-.78 11.714-2.398.574-.244 1.053.376.515.787z" fill="#FF9900"/>
                      </svg>
                    </a>
                  </div>
                  {/* Meta */}
                  <div className="lp-logo-icon" title="Meta">
                    <a href="https://meta.com">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z" fill="#1877F2"/>
                    </svg>
                    </a>
                  </div>
                  <span className="lp-logo-dots">···</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          2. WHY TALENT LIKE US (FEATURES GRID - HORIZONTAL CARDS)
         ══════════════════════════════════════════════════════════════════ */}
      <section className="lp-features-section" id="features">
        <div className="lp-container">
          <div className="lp-section-heading">
            <span className="lp-pill-tag">OUR FEATURES</span>
            <h2 className="lp-section-title">Why Talent Like Us</h2>
            <p className="lp-section-subtitle">
              A complete recruitment ecosystem tailored to streamline hiring and accelerate careers.
            </p>
          </div>

          <div className="lp-features-grid">
            {/* Feature 1 */}
            <div className="lp-feature-card">
              <div className="lp-feat-icon-box">
                <Zap size={22} />
              </div>
              <div className="lp-feat-content">
                <h3 className="lp-feat-title">Smart Job Matching</h3>
                <p className="lp-feat-desc">
                  Our AI evaluates candidate capabilities and matches you with top positions in real time.
                </p>
              </div>
            </div>

            {/* Feature 2: Recruiter QR & Team Collaboration */}
            <div className="lp-feature-card">
              <div className="lp-feat-icon-box">
                <QrCode size={22} />
              </div>
              <div className="lp-feat-content">
                <h3 className="lp-feat-title">Recruiter QR & Team Invites</h3>
                <p className="lp-feat-desc">
                  Generate one-time QR codes and links to onboard hiring managers and recruiters in seconds.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="lp-feature-card">
              <div className="lp-feat-icon-box">
                <Shield size={22} />
              </div>
              <div className="lp-feat-content">
                <h3 className="lp-feat-title">Verified Profiles</h3>
                <p className="lp-feat-desc">
                  Every company and applicant undergoes authentication, ensuring zero ghost jobs or fake resumes.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="lp-feature-card">
              <div className="lp-feat-icon-box">
                <Award size={22} />
              </div>
              <div className="lp-feat-content">
                <h3 className="lp-feat-title">Automated Screening</h3>
                <p className="lp-feat-desc">
                  Objective role assessments test practical competency, letting your skills speak for themselves.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="lp-feature-card">
              <div className="lp-feat-icon-box">
                <MessageSquare size={22} />
              </div>
              <div className="lp-feat-content">
                <h3 className="lp-feat-title">Fast Direct Chat</h3>
                <p className="lp-feat-desc">
                  Connect directly with hiring managers without recruiter delays or lost emails.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="lp-feature-card">
              <div className="lp-feat-icon-box">
                <Headphones size={22} />
              </div>
              <div className="lp-feat-content">
                <h3 className="lp-feat-title">Dedicated Support</h3>
                <p className="lp-feat-desc">
                  Our professional talent team provides 24/7 assistance for onboarding and hiring workflows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          3. BUILDING BETTER CAREER JOURNEYS (STATS SECTION)
         ══════════════════════════════════════════════════════════════════ */}
      <section className="lp-stats-section" id="stats">
        <div className="lp-container">
          <div className="lp-stats-inner">
            <div className="lp-stats-intro">
              <span className="lp-pill-tag">OUR IMPACT</span>
              <h2 className="lp-stats-title">
                Building Better <br /> Career Journeys
              </h2>
              <p className="lp-stats-desc">
                Connecting high-caliber talent with verified companies worldwide to build resilient, innovative teams.
              </p>
            </div>

            <div className="lp-stats-metrics">
              {/* Stat 1 */}
              <div className="lp-metric-card">
                <div className="lp-metric-icon-wrap">
                  <Building2 size={20} />
                </div>
                <div className="lp-metric-num">5,000+</div>
                <div className="lp-metric-label">Companies Hiring</div>
              </div>

              {/* Stat 2 */}
              <div className="lp-metric-card">
                <div className="lp-metric-icon-wrap">
                  <FileCheck size={20} />
                </div>
                <div className="lp-metric-num">15,000+</div>
                <div className="lp-metric-label">Active Job Openings</div>
              </div>

              {/* Stat 3 */}
              <div className="lp-metric-card">
                <div className="lp-metric-icon-wrap">
                  <Users size={20} />
                </div>
                <div className="lp-metric-num">120K+</div>
                <div className="lp-metric-label">Candidates Placed</div>
              </div>

              {/* Stat 4 */}
              <div className="lp-metric-card">
                <div className="lp-metric-icon-wrap">
                  <Star size={20} />
                </div>
                <div className="lp-metric-num">99%</div>
                <div className="lp-metric-label">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          4. 3 SIMPLE STEPS TO GET HIRED (PROCESS & CANDIDATE CARD)
         ══════════════════════════════════════════════════════════════════ */}
      <section className="lp-steps-section" id="how-it-works">
        <div className="lp-container">
          <div className="lp-section-heading">
            <span className="lp-pill-tag">HOW IT WORKS</span>
            <h2 className="lp-section-title">3 Simple Steps to Get Hired</h2>
            <p className="lp-section-subtitle">
              Your streamlined path from signing up to receiving your verified job offer.
            </p>
          </div>

          <div className="lp-steps-layout">
            {/* Left Steps Cards */}
            <div className="lp-steps-cards">
              <div className="lp-step-card">
                <div className="lp-step-num-badge">01</div>
                <div className="lp-step-icon lp-step-icon-blue">
                  <Shield size={24} />
                </div>
                <div className="lp-step-text">
                  <h3>Create & Verify Your Profile</h3>
                  <p>
                    Set up your professional profile in minutes. Add credentials, portfolio links, and complete role-based tests.
                  </p>
                </div>
              </div>

              <div className="lp-step-card">
                <div className="lp-step-num-badge">02</div>
                <div className="lp-step-icon lp-step-icon-purple">
                  <Zap size={24} />
                </div>
                <div className="lp-step-text">
                  <h3>Get Matched with Top Roles</h3>
                  <p>
                    Our matching engine recommends verified positions tailored directly to your skills and salary expectations.
                  </p>
                </div>
              </div>

              <div className="lp-step-card">
                <div className="lp-step-num-badge">03</div>
                <div className="lp-step-icon lp-step-icon-green">
                  <CheckCircle size={24} />
                </div>
                <div className="lp-step-text">
                  <h3>Interview & Land the Offer</h3>
                  <p>
                    Connect directly with employers, schedule real-time video interviews, and receive formal offers securely.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Candidate Profile Preview Widget */}
            <div className="lp-steps-widget">
              <div className="lp-candidate-card-preview">
                <div className="lp-cand-header">
                  <div className="lp-cand-avatar">
                    <img
                      src="/assets/hero-woman2.jpg"
                      alt="Candidate Preview"
                      className="lp-cand-avatar-img"
                    />
                    <span className="lp-online-dot" />
                  </div>
                  <div className="lp-cand-meta">
                    <h4>Sarah Jenkins</h4>
                    <span>Senior Full-Stack Developer</span>
                    <div className="lp-cand-location">San Francisco, CA • Remote</div>
                  </div>
                </div>

                <div className="lp-cand-badges">
                  <span className="lp-cand-tag">React.js</span>
                  <span className="lp-cand-tag">Node.js</span>
                  <span className="lp-cand-tag">TypeScript</span>
                  <span className="lp-cand-tag">AWS</span>
                </div>

                <div className="lp-cand-score-box">
                  <div className="lp-cand-score-item">
                    <span className="lp-cs-val">99%</span>
                    <span className="lp-cs-lbl">Assessment</span>
                  </div>
                  <div className="lp-cand-score-divider" />
                  <div className="lp-cand-score-item">
                    <span className="lp-cs-val">4.9/5</span>
                    <span className="lp-cs-lbl">Interview Rating</span>
                  </div>
                </div>

                <div className="lp-cand-action">
                  <Link to="/company/signup" className="lp-cand-btn">
                    Interview Requested ✓
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          5. NEW FEATURE SECTION: RECRUITER & TEAM JOIN SECTION (JOIN COMPANY)
         ══════════════════════════════════════════════════════════════════ */}
      <section className="lp-recruiter-join-section" id="recruiter-join">
        <div className="lp-container">
          <div className="lp-rjoin-card-wrapper">
            <div className="lp-rjoin-grid">
              {/* Left Column: Heading, Explanation & "Join Company" Button */}
              <div className="lp-rjoin-content">
                <span className="lp-pill-tag" style={{ backgroundColor: "#ede9fe", color: "#6d28d9", borderColor: "#ddd6fe" }}>
                  TEAM COLLABORATION
                </span>
                <h2 className="lp-rjoin-title">
                  Join Your Company Team <br />
                  <span style={{ color: "#5b5dfa" }}>With QR Code or Direct Link</span>
                </h2>
                <p className="lp-rjoin-desc">
                  Received an invitation from your company admin? Verify your one-time link or scan the secure QR code to join your recruitment workspace in seconds.
                </p>

                <div className="lp-rjoin-features-list">
                  <div className="lp-rjoin-feat-item">
                    <div className="lp-rjoin-feat-check">
                      <Check size={16} />
                    </div>
                    <span>Single-use encrypted QR codes & direct invite links</span>
                  </div>
                  <div className="lp-rjoin-feat-item">
                    <div className="lp-rjoin-feat-check">
                      <Check size={16} />
                    </div>
                    <span>Instant access to live candidate pipelines & resumes</span>
                  </div>
                  <div className="lp-rjoin-feat-item">
                    <div className="lp-rjoin-feat-check">
                      <Check size={16} />
                    </div>
                    <span>Collaborative interview scheduling and evaluation scoring</span>
                  </div>
                </div>

                {/* The "Join Company" action button requested by the user */}
                <div className="lp-rjoin-cta-row">
                  <Link to="/join-company" className="lp-btn-primary" style={{ backgroundColor: "#5b5dfa", boxShadow: "0 8px 24px -4px rgba(91, 93, 250, 0.4)" }} id="landing-join-company-btn">
                    Join Company <ArrowRight size={18} />
                  </Link>
                  <Link to="/company/login" className="lp-btn-outline">
                    Company Portal
                  </Link>
                </div>
              </div>

              {/* Right Column: Visual Preview of Recruiter QR Join Card */}
              <div className="lp-rjoin-visual">
                <Link to="/join-company" className="lp-rjoin-preview-card" title="Click to open Join Company page">
                  <div className="lp-rjp-top-bar">
                    <div className="lp-rjp-tag">
                      <QrCode size={14} /> Scan to Join
                    </div>
                    <span className="lp-rjp-live">Live Link</span>
                  </div>

                  <div className="lp-rjp-scanner-box">
                    <div className="qr-corner qr-corner-tl" />
                    <div className="qr-corner qr-corner-tr" />
                    <div className="qr-corner qr-corner-bl" />
                    <div className="qr-corner qr-corner-br" />

                    <svg viewBox="0 0 160 160" width="120" height="120" className="qr-code-svg">
                      <rect width="160" height="160" fill="#ffffff" />
                      <rect x="15" y="15" width="40" height="40" rx="4" fill="#1e1b4b" />
                      <rect x="23" y="23" width="24" height="24" rx="2" fill="#ffffff" />
                      <rect x="29" y="29" width="12" height="12" fill="#1e1b4b" />
                      <rect x="105" y="15" width="40" height="40" rx="4" fill="#1e1b4b" />
                      <rect x="113" y="23" width="24" height="24" rx="2" fill="#ffffff" />
                      <rect x="119" y="29" width="12" height="12" fill="#1e1b4b" />
                      <rect x="15" y="105" width="40" height="40" rx="4" fill="#1e1b4b" />
                      <rect x="23" y="113" width="24" height="24" rx="2" fill="#ffffff" />
                      <rect x="29" y="119" width="12" height="12" fill="#1e1b4b" />
                      <rect x="68" y="20" width="12" height="12" fill="#1e1b4b" />
                      <rect x="84" y="20" width="12" height="12" fill="#1e1b4b" />
                      <rect x="68" y="44" width="12" height="24" fill="#1e1b4b" />
                      <rect x="84" y="56" width="12" height="24" fill="#1e1b4b" />
                      <rect x="20" y="68" width="16" height="12" fill="#1e1b4b" />
                      <rect x="44" y="68" width="16" height="24" fill="#1e1b4b" />
                      <rect x="68" y="88" width="24" height="12" fill="#1e1b4b" />
                      <rect x="100" y="88" width="12" height="24" fill="#1e1b4b" />
                      <rect x="120" y="68" width="24" height="12" fill="#1e1b4b" />
                      <rect x="132" y="88" width="12" height="24" fill="#1e1b4b" />
                      <rect x="68" y="112" width="12" height="12" fill="#1e1b4b" />
                      <rect x="88" y="124" width="24" height="12" fill="#1e1b4b" />
                      <rect x="124" y="124" width="16" height="16" fill="#1e1b4b" />
                    </svg>

                    <div className="qr-scan-laser-line" />
                  </div>

                  <div className="lp-rjp-footer">
                    <strong>Click to Enter Code or Scan</strong>
                    <span>Instant Recruiter Onboarding →</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          6. PEOPLE SAY ABOUT US (TESTIMONIALS)
         ══════════════════════════════════════════════════════════════════ */}
      <section className="lp-reviews-section" id="testimonials">
        <div className="lp-container">
          <div className="lp-section-heading">
            <span className="lp-pill-tag">TESTIMONIALS</span>
            <h2 className="lp-section-title">People Say About Us</h2>
            <p className="lp-section-subtitle">
              Discover how HireHub has transformed hiring for companies and job seekers alike.
            </p>
          </div>

          <div className="lp-reviews-grid">
            {/* Review 1 */}
            <div className="lp-review-card">
              <div className="lp-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className="lp-review-quote">
                "HireHub cut our hiring cycle by more than 50%. The skill assessment scores accurately reflect actual engineering competency."
              </p>
              <div className="lp-review-author">
                <div className="lp-author-avatar lp-author-avatar-1">MR</div>
                <div className="lp-author-info">
                  <strong>Michael Rodriguez</strong>
                  <span>VP of Engineering, CloudScale</span>
                </div>
              </div>
            </div>

            {/* Review 2 */}
            <div className="lp-review-card">
              <div className="lp-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className="lp-review-quote">
                "Within 10 days of verifying my profile and completing the assessment, I had 3 competitive interview offers on the table."
              </p>
              <div className="lp-review-author">
                <div className="lp-author-avatar lp-author-avatar-2">EK</div>
                <div className="lp-author-info">
                  <strong>Elena Korolev</strong>
                  <span>Senior Product Designer</span>
                </div>
              </div>
            </div>

            {/* Review 3 */}
            <div className="lp-review-card">
              <div className="lp-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className="lp-review-quote">
                "The direct employer chat and calendar integration removed all friction. Our recruiting team will never go back to traditional boards."
              </p>
              <div className="lp-review-author">
                <div className="lp-author-avatar lp-author-avatar-3">TA</div>
                <div className="lp-author-info">
                  <strong>Tariq Al-Mansoor</strong>
                  <span>Head of Talent, Nexora Labs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          7. VIDEO / TEAM COLLABORATION / MISSION SECTION
         ══════════════════════════════════════════════════════════════════ */}
      <section className="lp-about-section" id="about">
        <div className="lp-container">
          <div className="lp-about-grid">
            {/* Left: Office Meeting Video Preview */}
            <div className="lp-about-media">
              <div className="lp-media-card">
                <video
                  src="/assets/team-office.mp4"
                  alt="HireHub modern collaborative team"
                  className="lp-media-video"
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                />
              </div>
            </div>

            {/* Right: Mission and Value Points */}
            <div className="lp-about-content">
              <span className="lp-pill-tag">OUR MISSION</span>
              <h2 className="lp-about-title">
                Over 10,000+ Teams Build Their Future With HireHub
              </h2>
              <p className="lp-about-desc">
                We believe exceptional recruitment happens when technology removes barriers between talented individuals and great companies.
              </p>

              <div className="lp-about-features">
                <div className="lp-about-feat-item">
                  <div className="lp-af-check"><Check size={16} /></div>
                  <div>
                    <strong>Data-Driven Matching:</strong>
                    <span> Eliminate guesswork with role-tailored algorithms.</span>
                  </div>
                </div>

                <div className="lp-about-feat-item">
                  <div className="lp-af-check"><Check size={16} /></div>
                  <div>
                    <strong>Collaborative Team Workspaces:</strong>
                    <span> Involve multiple hiring managers seamlessly.</span>
                  </div>
                </div>

                <div className="lp-about-feat-item">
                  <div className="lp-af-check"><Check size={16} /></div>
                  <div>
                    <strong>Automated Scheduling & Offers:</strong>
                    <span> Send verified offer letters with e-signatures.</span>
                  </div>
                </div>
              </div>

              <div className="lp-about-cta-row">
                <Link to="/candidate/signup" className="lp-btn-primary">
                  Explore Platform <ChevronRight size={16} />
                </Link>
                <Link to="/join-company" className="lp-btn-link" style={{ fontWeight: 700 }}>
                  Join as Recruiter via QR / Link →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
