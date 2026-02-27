import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../services/api-client";
import { DashboardNotificationsPopover } from "./components/dashboard-notifications-popover";
import { useDashboardNotifications } from "./hooks/use-dashboard-notifications";
import type { AuthState } from "./types";

type StudentDashboardLayoutProps = {
  auth: AuthState;
  children: ReactNode;
};

type StudentProfileTheme = {
  accentColor?: string;
};

const STORAGE_KEY = "educonnect_auth";

export function StudentDashboardLayout({ auth, children }: StudentDashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const desktopBellRef = useRef<HTMLButtonElement | null>(null);
  const mobileBellRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { notifications, unreadNotifications, markAllRead } = useDashboardNotifications({
    enabled: auth.user.role === "student",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cachedAccent = window.localStorage.getItem("student_accent_color");
    if (cachedAccent) setAccentColor(cachedAccent);
  }, []);

  useEffect(() => {
    if (auth.user.role !== "student") return;
    apiGet<StudentProfileTheme>("/student-profiles/me").then((response) => {
      if (response.data?.accentColor) {
        setAccentColor(response.data.accentColor);
        window.localStorage.setItem("student_accent_color", response.data.accentColor);
      } else {
        setAccentColor(null);
        window.localStorage.removeItem("student_accent_color");
      }
    });
  }, [auth.user.role, auth.user.id]);

  useEffect(() => {
    const onAccentUpdate = (event: Event) => {
      const next = (event as CustomEvent<{ accentColor?: string }>).detail?.accentColor;
      if (next) setAccentColor(next);
    };
    window.addEventListener("student-accent-updated", onAccentUpdate as EventListener);
    return () => window.removeEventListener("student-accent-updated", onAccentUpdate as EventListener);
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (desktopBellRef.current?.contains(target)) return;
      if (mobileBellRef.current?.contains(target)) return;
      setIsNotificationsOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isNotificationsOpen]);

  const unreadLabel = unreadNotifications > 99 ? "99+" : String(unreadNotifications);
  const dateLocale = i18n.language === "ar" ? "ar-DZ" : "fr-FR";
  const isSessionsRoute =
    location.pathname === "/calendar" || location.pathname === "/dashboard/student/sessions";

  const handleBellToggle = () => {
    setIsMobileMenuOpen(false);
    setIsNotificationsOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    await apiPost("/auth/logout", {});
    window.localStorage.removeItem(STORAGE_KEY);
    navigate("/login");
  };

  const studentShellStyle = {
    ["--student-accent" as string]: accentColor ?? "#f38b1e",
  } as CSSProperties;

  return (
    <div className="dashboard-shell dashboard-shell--student" style={studentShellStyle}>
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo-row">
          <div className="dashboard-logo">Educonnect</div>
          <button
            className="dashboard-bell"
            aria-label={t("navigation.student.notifications")}
            type="button"
            onClick={handleBellToggle}
            ref={desktopBellRef}
          >
            <span aria-hidden="true">🔔</span>
            {unreadNotifications ? <span className="dashboard-bell__badge">{unreadLabel}</span> : null}
          </button>
        </div>
        <nav className="dashboard-nav">
          <NavLink to="/dashboard/student" end className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("navigation.student.overview")}
          </NavLink>
          <NavLink to="/feed" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("navigation.student.feed")}
          </NavLink>
          <NavLink
            to="/dashboard/student/sessions"
            className={() => `nav-item${isSessionsRoute ? " active" : ""}`}
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
          <NavLink to="/dashboard/student/profile" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("navigation.student.profile")}
          </NavLink>
          <button className="nav-item" type="button" onClick={handleLogout}>
            Déconnexion
          </button>
        </nav>
        <div className="sidebar-footer">
          <span>{auth.user.email}</span>
        </div>
      </aside>

      <div className="mobile-topbar" aria-label="Educonnect">
        <div className="dashboard-logo">Educonnect</div>
      </div>

      <main className="dashboard-main">{children}</main>

      {isNotificationsOpen ? (
        <DashboardNotificationsPopover
          ref={panelRef}
          ariaLabel={t("navigation.student.notifications")}
          title={t("studentDashboard.notificationsTitle")}
          markAllLabel={t("studentDashboard.markAllRead")}
          unreadNotifications={unreadNotifications}
          notifications={notifications}
          dateLocale={dateLocale}
          onMarkAllRead={markAllRead}
        />
      ) : null}

      <nav className="mobile-nav" aria-label="Navigation élève">
        <NavLink to="/dashboard/student" end className={({ isActive }) => `mobile-nav__item${isActive ? " active" : ""}`}>
          {t("navigation.student.home")}
        </NavLink>
        <NavLink to="/feed" className={({ isActive }) => `mobile-nav__item${isActive ? " active" : ""}`}>
          {t("navigation.student.feed")}
        </NavLink>
        <NavLink to="/dashboard/student/sessions" className={() => `mobile-nav__item${isSessionsRoute ? " active" : ""}`}>
          {t("navigation.student.sessions")}
        </NavLink>
        <button
          className="mobile-nav__item mobile-nav__item--bell"
          type="button"
          onClick={handleBellToggle}
          ref={mobileBellRef}
        >
          <span aria-hidden="true">🔔</span>
          {unreadNotifications ? <span className="mobile-nav__badge">{unreadLabel}</span> : null}
        </button>
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
            <NavLink to="/dashboard/student/profile" className="mobile-nav-drawer__item" onClick={() => setIsMobileMenuOpen(false)}>
              {t("navigation.student.profile")}
            </NavLink>
            <button className="mobile-nav-drawer__item" type="button" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
