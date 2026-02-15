import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
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

const STORAGE_KEY = "educonnect_auth";

export function TeacherDashboardLayout() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setAuth(JSON.parse(raw) as AuthState);
    } catch {
      setAuth(null);
    }
  }, []);

  useEffect(() => {
    if (!auth || auth.user.role !== "teacher") return;
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
  }, [auth]);

  if (!auth || auth.user.role !== "teacher") {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-card">
          <h2>Accès réservé</h2>
          <p>Connecte‑toi en tant que prof pour accéder au dashboard.</p>
          <Link className="btn btn-primary" to="/login">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const unreadLabel = unreadNotifications > 99 ? "99+" : String(unreadNotifications);

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo-row">
          <div className="dashboard-logo">Educonnect</div>
          <Link
            className="dashboard-bell"
            to="/dashboard/teacher#notifications"
            aria-label={t("navigation.teacher.notifications")}
          >
            <span aria-hidden="true">🔔</span>
            {unreadNotifications ? <span className="dashboard-bell__badge">{unreadLabel}</span> : null}
          </Link>
        </div>
        <nav className="dashboard-nav">
          <NavLink to="/dashboard/teacher" end className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("navigation.teacher.overview")}
          </NavLink>
          <NavLink to="/dashboard/teacher/contents" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("navigation.teacher.contents")}
          </NavLink>
          <NavLink to="/dashboard/teacher/subscribers" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("navigation.teacher.subscribers")}
          </NavLink>
          <NavLink to="/dashboard/teacher/sessions" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          {t("navigation.teacher.sessions")}
        </NavLink>
        <Link to="/dashboard/teacher#notifications" className="nav-item">
          {t("navigation.teacher.notifications")}
        </Link>
        <div className="nav-item disabled">
          <span className="nav-item__label">{t("navigation.teacher.sessionSubscribers")}</span>
          <span className="nav-badge nav-badge--coming">{t("common.comingSoon")}</span>
        </div>
          <div className="nav-item disabled">
            <span className="nav-item__label">{t("navigation.teacher.revenue")}</span>
            <span className="nav-badge nav-badge--coming">{t("common.comingSoon")}</span>
          </div>
          <div className="nav-item disabled">
            <span className="nav-item__label">{t("navigation.teacher.messages")}</span>
            <span className="nav-badge nav-badge--coming">{t("common.comingSoon")}</span>
          </div>
          <NavLink to="/dashboard/teacher/profile" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("navigation.teacher.profile")}
          </NavLink>
          <NavLink to="/dashboard/teacher/settings" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("navigation.teacher.settings")}
          </NavLink>
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

      <main className="dashboard-main">
        <Outlet context={{ auth }} />
      </main>

      <nav className="mobile-nav" aria-label="Navigation prof">
        <NavLink to="/dashboard/teacher" end className={({ isActive }) => `mobile-nav__item${isActive ? " active" : ""}`}>
          {t("navigation.teacher.home")}
        </NavLink>
        <NavLink to="/dashboard/teacher/sessions" className={({ isActive }) => `mobile-nav__item${isActive ? " active" : ""}`}>
          {t("navigation.teacher.sessions")}
        </NavLink>
        <Link className="mobile-nav__item mobile-nav__item--bell" to="/dashboard/teacher#notifications">
          <span aria-hidden="true">🔔</span>
          {unreadNotifications ? <span className="mobile-nav__badge">{unreadLabel}</span> : null}
        </Link>
        <button
          className={`mobile-nav__item${isMobileMenuOpen ? " active" : ""}`}
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          {t("navigation.teacher.more")}
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
            <div className="mobile-nav-drawer__item disabled">
              <span>{t("navigation.teacher.messages")}</span>
              <span className="nav-badge nav-badge--coming">{t("common.comingSoon")}</span>
            </div>
            <NavLink to="/dashboard/teacher/contents" className="mobile-nav-drawer__item" onClick={() => setIsMobileMenuOpen(false)}>
              {t("navigation.teacher.contents")}
            </NavLink>
            <NavLink to="/dashboard/teacher/subscribers" className="mobile-nav-drawer__item" onClick={() => setIsMobileMenuOpen(false)}>
              {t("navigation.teacher.subscribers")}
            </NavLink>
            <Link to="/dashboard/teacher#notifications" className="mobile-nav-drawer__item" onClick={() => setIsMobileMenuOpen(false)}>
              {t("navigation.teacher.notifications")}
            </Link>
            <div className="mobile-nav-drawer__item disabled">
              <span>{t("navigation.teacher.sessionSubscribers")}</span>
              <span className="nav-badge nav-badge--coming">{t("common.comingSoon")}</span>
            </div>
            <div className="mobile-nav-drawer__item disabled">
              <span>{t("navigation.teacher.revenue")}</span>
              <span className="nav-badge nav-badge--coming">{t("common.comingSoon")}</span>
            </div>
            <NavLink to="/dashboard/teacher/profile" className="mobile-nav-drawer__item" onClick={() => setIsMobileMenuOpen(false)}>
              {t("navigation.teacher.profile")}
            </NavLink>
            <NavLink to="/dashboard/teacher/settings" className="mobile-nav-drawer__item" onClick={() => setIsMobileMenuOpen(false)}>
              {t("navigation.teacher.settings")}
            </NavLink>
          </div>
        </>
      ) : null}
    </div>
  );
}
