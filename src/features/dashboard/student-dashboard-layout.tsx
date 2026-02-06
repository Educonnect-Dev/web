import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiPost } from "../../services/api-client";

type AuthUser = {
  id: string;
  email: string;
  role: "student" | "teacher";
};

type AuthState = {
  user: AuthUser;
  accessToken: string;
};

type StudentDashboardLayoutProps = {
  auth: AuthState;
  children: ReactNode;
};

const STORAGE_KEY = "educonnect_auth";

export function StudentDashboardLayout({ auth, children }: StudentDashboardLayoutProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">Educonnect</div>
        <nav className="dashboard-nav">
          <NavLink to="/dashboard/student" end className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("navigation.student.overview")}
          </NavLink>
          <NavLink to="/feed" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("navigation.student.feed")}
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("navigation.student.calendar")}
          </NavLink>
          <NavLink
            to="/dashboard/student/sessions"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            {t("navigation.student.sessions")}
          </NavLink>
          <div className="nav-item disabled">
            <span className="nav-item__label">{t("navigation.student.messages")}</span>
            <span className="nav-badge nav-badge--coming">{t("common.comingSoon")}</span>
          </div>
          <div className="nav-item disabled">
            <span className="nav-item__label">{t("navigation.student.subscriptions")}</span>
            <span className="nav-badge nav-badge--coming">{t("common.comingSoon")}</span>
          </div>
          <div className="nav-item disabled">
            <span className="nav-item__label">{t("navigation.student.progress")}</span>
            <span className="nav-badge nav-badge--coming">{t("common.comingSoon")}</span>
          </div>
        </nav>
        <div className="sidebar-footer">
          <span>{auth.user.email}</span>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await apiPost("/auth/logout", {});
              window.localStorage.removeItem(STORAGE_KEY);
              navigate("/login");
            }}
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="dashboard-main">{children}</main>

      <nav className="mobile-nav" aria-label="Navigation élève">
        <NavLink to="/dashboard/student" end className={({ isActive }) => `mobile-nav__item${isActive ? " active" : ""}`}>
          {t("navigation.student.home")}
        </NavLink>
        <NavLink to="/feed" className={({ isActive }) => `mobile-nav__item${isActive ? " active" : ""}`}>
          {t("navigation.student.feed")}
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => `mobile-nav__item${isActive ? " active" : ""}`}>
          {t("navigation.student.calendar")}
        </NavLink>
        <NavLink
          to="/dashboard/student/sessions"
          className={({ isActive }) => `mobile-nav__item${isActive ? " active" : ""}`}
        >
          {t("navigation.student.sessions")}
        </NavLink>
        <div className="mobile-nav__item disabled">{t("navigation.student.messages")}</div>
      </nav>
    </div>
  );
}
