import React, { useState, useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import { Briefcase, Menu, X, User, Building2 } from "lucide-react";
import "../../styles/landing.css";

export default function LandingLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing-root">
      {/* ── Top Header ── */}
      <header className={`landing-header${scrolled ? " scrolled" : ""}`}>
        <div className="landing-header-inner">
          {/* Logo */}
          <Link to="/" className="landing-logo">
            <img src="/logo.png" alt="HiringHub Logo" className="landing-logo-img" />
            <span className="landing-logo-text">
              Hiring<strong>Hub</strong>
            </span>
          </Link>


          {/* Header Actions: JUST Candidate and Company buttons (No dropdown options) */}
          <div className="landing-header-actions">
            <Link to="/candidate/login" className="landing-header-btn-candidate">
              <User size={16} />
              <span>Candidate</span>
            </Link>

            <Link to="/company/login" className="landing-header-btn-company">
              <Building2 size={16} />
              <span>Company</span>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="landing-hamburger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="landing-mobile-menu">

            <div className="landing-mobile-btns">
              <Link to="/candidate/login" className="landing-mobile-btn-ghost" onClick={() => setMobileOpen(false)}>
                <User size={16} /> Candidate
              </Link>
              <Link to="/company/login" className="landing-mobile-btn-primary" onClick={() => setMobileOpen(false)}>
                <Building2 size={16} /> Company
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Main Landing Page Content ── */}
      <main className="landing-main">
        <Outlet />
      </main>

      {/* ── Blue CTA Banner (above footer) ── */}
      <section className="landing-pre-footer-cta">
        <div className="lp-container">
          <div className="lp-cta-strip">
            <div className="lp-cta-strip-text">
              <h2>Ready to Scale Your Team or Land Your Next Dream Job?</h2>
              <p>Join over 120,000+ professionals and 5,000+ innovative companies using HireHub.</p>
            </div>
            <div className="lp-cta-strip-actions">
              <Link to="/candidate/login" className="lp-btn-cta-white">
                Candidate Portal
              </Link>
              <Link to="/company/login" className="lp-btn-cta-outline">
                Company Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dark Navy Footer ── */}
      <footer className="landing-footer">
        <div className="lp-container">
          <div className="landing-footer-grid">
            {/* Col 1: Brand */}
            <div className="landing-footer-brand">
              <div className="landing-logo footer-logo">
                <img src="/logo.png" alt="HiringHub Logo" className="landing-logo-img" />
                <span className="landing-logo-text">
                  Hiring<strong>Hub</strong>
                </span>
              </div>
              <p className="landing-footer-tagline">
                Smarter Hiring, Brighter Futures. The intelligent recruitment platform connecting exceptional talent with high-growth organizations.
              </p>
              <div className="landing-footer-socials">
                {/* LinkedIn */}
                <div className="Linkedin-footer-socials">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.34 18V9.67H5.57V18h2.77ZM6.96 8.54a1.61 1.61 0 1 0 0-3.22 1.61 1.61 0 0 0 0 3.22ZM18.43 18v-4.56c0-2.44-1.3-3.58-3.03-3.58a2.62 2.62 0 0 0-2.36 1.3V9.67h-2.77V18h2.77v-4.12c0-1.08.2-2.12 1.54-2.12 1.32 0 1.34 1.23 1.34 2.19V18h2.51Z" />
                  </svg>
                </a>
                </div>

                {/* Instagram */}
                <div className="Instagram-footer-socials">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
                  </svg>
                </a>
                </div>

                {/* Facebook */}
                <div className="Facebook-footer-socials">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6V10H6.8v3h2.8v8h3.9Z" />
                  </svg>
                </a>
                </div>

                {/* X / Twitter */}
                <div className="X-footer-socials">
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X (Twitter)"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.6 22H2.5l7.3-8.4L1.8 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z" />
                  </svg>
                </a>
                </div>
              </div>
            </div>

            {/* Col 2: Candidates */}
            <div className="landing-footer-col">
              <h4>For Candidates</h4>
              <ul>
                <li><Link to="/candidate/login">Candidate Sign In</Link></li>
                <li><Link to="/candidate/signup">Create Free Account</Link></li>

              </ul>
            </div>

            {/* Col 3: Employers */}
            <div className="landing-footer-col">
              <h4>For Employers</h4>
              <ul>
                <li><Link to="/company/login">Company Sign In</Link></li>
                <li><Link to="/company/signup">Create Free Account</Link></li>
                <li><Link to="/join-company">Join Company</Link></li>
              </ul>
            </div>

            {/* Col 4: Platform & Legal */}
            <div className="landing-footer-col">
              <h4>Company & Legal</h4>
              <ul>
                <li><a href="/about">About HireHub</a></li>
                <li><a href="/success-stories">Success Stories</a></li>
                <li><a href="/security">Security & Verification</a></li>
                <li><a href="/terms">Terms of Service</a></li>
                <li><a href="/privacy">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <span>© {new Date().getFullYear()} HireHub Inc. All rights reserved.</span>
            <div className="landing-footer-bottom-links">
              <a href="/privacy">Privacy</a>
              <span>•</span>
              <a href="/terms">Terms</a>
              <span>•</span>
              <a href="/cookies">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
