import React from "react";
import { Link } from "react-router-dom";
import { UserCheck, Building2, ArrowRight, Check } from "lucide-react";
import "../styles/auth.css";

export default function RoleSelectPage() {
  return (
    <div className="role-page">
      <div className="role-page-inner">
        <header className="role-page-header">
          <Link to="/" className="role-page-logo" aria-label="HireHub home">
            <img src="/logo.png" alt="" className="role-page-logo-image" />
            <span>Hire<strong>Hub</strong></span>
          </Link>
          <p className="role-page-kicker">Welcome to HireHub</p>
          <h1 className="role-page-heading">Choose your way in</h1>
          <p className="role-page-sub">Select the workspace that matches your goals.</p>
        </header>

        <div className="role-cards-grid">
          <section className="role-card-item candidate" aria-labelledby="candidate-portal-title">
            <div className="role-card-icon-wrap"><UserCheck size={28} /></div>
            <div className="role-card-label">For Job Seekers</div>
            <h2 id="candidate-portal-title" className="role-card-title">Find your next opportunity</h2>
            <p className="role-card-desc">
              Browse relevant jobs, manage your profile, and keep every application in one place.
            </p>
            <ul className="role-card-benefits">
              <li><Check size={15} /> Explore open roles</li>
              <li><Check size={15} /> Track applications</li>
            </ul>
            <div className="role-card-btns">
              <Link to="/candidate/login" className="role-btn-primary">
                <span>Sign In</span><ArrowRight size={16} />
              </Link>
              <Link to="/candidate/signup" className="role-btn-secondary">Create account</Link>
            </div>
          </section>

          <section className="role-card-item company" aria-labelledby="company-portal-title">
            <div className="role-card-icon-wrap"><Building2 size={28} /></div>
            <div className="role-card-label">For Employers</div>
            <h2 id="company-portal-title" className="role-card-title">Build your hiring team</h2>
            <p className="role-card-desc">
              Publish jobs, review candidates, and coordinate your hiring workflow from one workspace.
            </p>
            <ul className="role-card-benefits">
              <li><Check size={15} /> Manage job openings</li>
              <li><Check size={15} /> Collaborate with recruiters</li>
            </ul>
            <div className="role-card-btns">
              <Link to="/company/login" className="role-btn-primary">
                <span>Sign In</span><ArrowRight size={16} />
              </Link>
              <Link to="/company/signup" className="role-btn-secondary">Register company</Link>
            </div>
          </section>
        </div>

        <Link to="/" className="role-page-back">Back to home</Link>
      </div>
    </div>
  );
}
