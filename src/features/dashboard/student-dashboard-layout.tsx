import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../services/api-client";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (auth.user.role !== "student") return;
    let active = true;
    const loadUnread = async () => {
      const response = await apiGet<Array<{ id: string }>>("/notifications/me?unreadOnly=true&limit=100");
      if (!active || !response.data) return;
      setUnreadNotifications(response.data.length);
    };
    void loadUnread();
    const intervalId = window.setInterval(() => {
      void loadUnread();
    }, 60000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [auth.user.role]);

  const unreadLabel = unreadNotifications > 99 ? "99+" : String(unreadNotifications);

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo-row">
          <div className="dashboard-logo">Educonnect</div>
          <Link
            className="dashboard-bell"
            to="/dashboard/student#notifications"
            aria-label={t("navigation.student.notifications")}
          >
            <span aria-hidden="true">🔔</span>
            {unreadNotifications ? <span className="dashboard-bell__badge">{unreadLabel}</span> : null}
          </Link>
        </div>
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
        <Link className="mobile-nav__item mobile-nav__item--bell" to="/dashboard/student#notifications">
          <span aria-hidden="true">🔔</span>
          {unreadNotifications ? <span className="mobile-nav__badge">{unreadLabel}</span> : null}
        </Link>
        <button
          className={`mobile-nav__item${isMobileMenuOpen ? " active" : ""}`}
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          {t("navigation.student.more")}
        </button>
      </nav>

      {isMobileMenuOpen ? (
        <>
          <button
            className="mobile-nav-overlay"
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="mobile-nav-drawer" role="dialog" aria-label="Plus de navigation">
            <NavLink to="/dashboard/student/sessions" className="mobile-nav-drawer__item" onClick={() => setIsMobileMenuOpen(false)}>
              {t("navigation.student.sessions")}
            </NavLink>
            <div className="mobile-nav-drawer__item disabled">
              <span>{t("navigation.student.messages")}</span>
              <span className="nav-badge nav-badge--coming">{t("common.comingSoon")}</span>
            </div>
            <div className="mobile-nav-drawer__item disabled">
              <span>{t("navigation.student.subscriptions")}</span>
              <span className="nav-badge nav-badge--coming">{t("common.comingSoon")}</span>
            </div>
            <div className="mobile-nav-drawer__item disabled">
              <span>{t("navigation.student.progress")}</span>
              <span className="nav-badge nav-badge--coming">{t("common.comingSoon")}</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
