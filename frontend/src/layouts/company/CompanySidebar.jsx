import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { getProfileImageUrl } from "../../utils/profileImage";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Users,
  Calendar,
  Settings,
  UserPlus,
  Plus,
  ChevronLeft,
} from "lucide-react";
import "../../features/company/styles/companyDashboard.css";

export default function CompanySidebar({ isCollapsed = false, onToggleCollapse }) {
  // Determine if the user is a recruiter or company admin — read from Redux
  const { user, role } = useAppSelector((s) => s.auth);
  const isRecruiter = role === "recruiter";

  const { profileName, profileSubtitle } = useMemo(() => {
    if (isRecruiter) {
      return {
        profileName: user?.name || "Recruiter",
        profileSubtitle: user?.designation || user?.department || "Recruiter",
      };
    }
    return {
      profileName: user?.companyName || user?.company?.name || user?.name || "Company",
      profileSubtitle: "Company Admin",
    };
  }, [user, isRecruiter]);

  // 1. Recruiter Navigation Items (Exact match with reference image 7)
  const recruiterNavItems = [
    { label: "Dashboard", path: "/company/dashboard", icon: LayoutDashboard },
    { label: "Post Job", path: "/company/post-job", icon: Plus },
    { label: "Jobs", path: "/company/manage-jobs", icon: Briefcase },
    { label: "Applications", path: "/company/manage-applications", icon: FileText },
    { label: "Candidates", path: "/company/shortlisted", icon: Users },
    { label: "Interviews", path: "/company/schedule-interview", icon: Calendar },
  ];

  // 2. Company Admin Navigation Items (Manage Recruiters & View Reports, No direct Job Posting)
  const companyNavItems = [
    { label: "Dashboard", path: "/company/dashboard", icon: LayoutDashboard },
    { label: "Add Recruiter", path: "/company/add-recruiter", icon: UserPlus },
    { label: "Recruiters List", path: "/company/manage-recruiters", icon: Users },
    { label: "Jobs", path: "/company/manage-jobs", icon: Briefcase },
    { label: "Applications", path: "/company/manage-applications", icon: FileText},
    { label: "Candidates", path: "/company/shortlisted", icon: Users },
    { label: "Interviews", path: "/company/schedule-interview", icon: Calendar},
  ];

  const navItems = isRecruiter ? recruiterNavItems : companyNavItems;

  const avatarInitials = profileName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase() || "ABC";
  const avatarImageUrl = getProfileImageUrl(user);

  return (
    <aside
      className={`comp-sidebar ${isCollapsed ? "collapsed" : "expanded"}`}
      aria-label="Company Portal Navigation"
    >
      <div>
        {/* Brand / Logo */}
        <div
          className="comp-sidebar-brand"
          onClick={onToggleCollapse}
          role="button"
          tabIndex={0}
          title={isCollapsed ? "Click to expand sidebar" : "Click to collapse sidebar"}
        >
          <div className="comp-sidebar-logo-icon">
            <img src="/logo.png" alt="HiringHub Logo" className="landing-logo-img" />
          </div>
          {!isCollapsed && (
            <div className="comp-sidebar-brand-text-wrap">
              <span className="comp-sidebar-brand-name">Hiring Hub</span>
              <span className="comp-sidebar-toggle-indicator" title="Click to collapse">
                <ChevronLeft size={16} />
              </span>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="comp-sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={`${item.path}-${item.label}`}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) => `comp-nav-item ${isActive ? "active" : ""}`}
              >
                <div className="comp-nav-icon-wrap">
                  <Icon size={18} />
                </div>
                {!isCollapsed && (
                  <>
                    <span className="comp-nav-label">{item.label}</span>
                    {item.badge && <span className="comp-nav-badge">{item.badge}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Connected Company Card in Footer (Matching Reference UI Image 7) */}
      <NavLink
        to="/company/profile"
        className={({ isActive }) => `comp-sidebar-footer ${isActive ? "active" : ""}`}
        title={isCollapsed ? `${profileName} (Profile)` : "View Profile"}
        aria-label="Open Profile"
      >
        <div className="comp-sidebar-avatar" title={profileName}>
          {avatarInitials}
          {avatarImageUrl && (
            <img
              src={avatarImageUrl}
              alt=""
              aria-hidden="true"
              onError={(event) => event.currentTarget.remove()}
            />
          )}
        </div>
        {!isCollapsed && (
          <div className="comp-sidebar-company-info">
            <span className="comp-sidebar-company-title" title={profileName}>
              {profileName}
            </span>
            <span className="comp-sidebar-company-role">{profileSubtitle}</span>
          </div>
        )}
      </NavLink>
    </aside>
  );
}
