import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, MessageSquare, LogOut, User, ChevronDown } from "lucide-react";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { logoutUser } from "../../features/auth/authSlice";
import { getProfileImageUrl } from "../../utils/profileImage";
import "../../features/company/styles/companyDashboard.css";
import "../../features/company/styles/companyHeader.css";

export default function CompanyHeader() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { user, role } = useAppSelector((s) => s.auth);

  const { userName, userRole, userInitials, userImageUrl } = useMemo(() => {
    const isRecruiter = role === "recruiter";
    const name = user?.name || (isRecruiter ? "Recruiter" : user?.companyName || "Company");
    const subtitle = isRecruiter
      ? user?.designation || user?.department || "Recruiter"
      : "Company Admin";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || (isRecruiter ? "R" : "CA");
    return {
      userName: name,
      userRole: subtitle,
      userInitials: initials,
      userImageUrl: getProfileImageUrl(user),
    };
  }, [user, role]);

  const handleLogout = async () => {
    setShowDropdown(false);
    await dispatch(logoutUser());
    navigate("/role-select");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/company/manage-jobs?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="comp-top-header">
      <form onSubmit={handleSearchSubmit} className="comp-header-search-wrap" role="search">
        <Search size={16} className="comp-header-search-icon" />
        <input
          type="text"
          className="comp-header-search-input"
          placeholder="Search jobs, candidates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <div className="comp-header-actions">
        <Link
          to="/company/notifications"
          className="comp-icon-btn"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="comp-icon-badge" />
        </Link>

        <div className="comp-header-profile">
          <button
            type="button"
            className="comp-header-user-btn"
            onClick={() => setShowDropdown((prev) => !prev)}
            aria-expanded={showDropdown}
          >
            <div className="comp-header-user-avatar">
              {userInitials}
              {userImageUrl && (
                <img
                  src={userImageUrl}
                  alt=""
                  aria-hidden="true"
                  onError={(event) => event.currentTarget.remove()}
                />
              )}
            </div>
            <div className="comp-header-user-copy">
              <span className="comp-header-user-name">{userName}</span>
              <span className="comp-header-user-sub">{userRole}</span>
            </div>
            <ChevronDown size={15} className="comp-header-chevron" />
          </button>

          {showDropdown && (
            <div className="comp-header-dropdown">
              <Link
                to="/company/profile"
                className="comp-header-menu-item"
                onClick={() => setShowDropdown(false)}
              >
                <User size={15} />
                <span>My Profile</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="comp-header-menu-item danger"
              >
                <LogOut size={15} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
