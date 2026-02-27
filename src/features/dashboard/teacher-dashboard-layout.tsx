import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../services/api-client";
import { DashboardNotificationsPopover } from "./components/dashboard-notifications-popover";
import { DASHBOARD_AUTH_STORAGE_KEY, useDashboardAuth } from "./hooks/use-dashboard-auth";
import { useDashboardNotifications } from "./hooks/use-dashboard-notifications";

export function TeacherDashboardLayout() {
  const auth = useDashboardAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [teacherAvatarUrl, setTeacherAvatarUrl] = useState<string | null>(null);
  const [teacherDisplayName, setTeacherDisplayName] = useState("");
  const desktopBellRef = useRef<HTMLButtonElement | null>(null);
  const mobileBellRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { notifications, unreadNotifications, markAllRead } = useDashboardNotifications({
    enabled: Boolean(auth && auth.user.role === "teacher"),
  });

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

  useEffect(() => {
    if (!auth || auth.user.role !== "teacher") return;
    apiGet<{ firstName?: string; lastName?: string; avatarUrl?: string }>("/profiles/me").then((response) => {
      if (!response.data) return;
      const first = response.data.firstName?.trim() ?? "";
      const last = response.data.lastName?.trim() ?? "";
      const fullName = [first, last].filter(Boolean).join(" ").trim();
      setTeacherDisplayName(fullName);
      setTeacherAvatarUrl(response.data.avatarUrl ?? null);
    });
  }, [auth?.user.id, auth?.user.role]);

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
  const dateLocale = i18n.language === "ar" ? "ar-DZ" : "fr-FR";
  const avatarInitial = (teacherDisplayName || auth.user.email).slice(0, 1).toUpperCase();

  const handleBellToggle = () => {
    setIsMobileMenuOpen(false);
    setIsNotificationsOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    await apiPost("/auth/logout", {});
    window.localStorage.removeItem(DASHBOARD_AUTH_STORAGE_KEY);
    navigate("/login");
  };

  return (
    <div className="dashboard-shell dashboard-shell--teacher">
      <aside className={`dashboard-sidebar${isSidebarCollapsed ? " is-collapsed" : ""}`}>
        <div className="dashboard-logo-row">
          {isSidebarCollapsed ? (
            <img className="dashboard-logo-icon" src="/favicon-96.png" alt="Educonnect" />
          ) : (
            <div className="dashboard-logo">Educonnect</div>
          )}
          <button
            className="dashboard-sidebar-toggle"
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label={isSidebarCollapsed ? "Déplier la barre latérale" : "Rétracter la barre latérale"}
            title={isSidebarCollapsed ? "Déplier" : "Rétracter"}
          >
            {isSidebarCollapsed ? "»" : "«"}
          </button>
          <button
            className={`dashboard-bell${isSidebarCollapsed ? " dashboard-bell--icon-only" : ""}`}
            aria-label={t("navigation.teacher.notifications")}
            type="button"
            onClick={handleBellToggle}
            ref={desktopBellRef}
          >
            <span aria-hidden="true">🔔</span>
            {unreadNotifications ? <span className="dashboard-bell__badge">{unreadLabel}</span> : null}
          </button>
        </div>
        <div className="sidebar-profile">
          <span className="sidebar-profile__avatar" aria-hidden="true">
            {teacherAvatarUrl ? <img src={teacherAvatarUrl} alt="" /> : avatarInitial}
          </span>
          {!isSidebarCollapsed ? (
            <div className="sidebar-profile__meta">
              <strong>{teacherDisplayName || "Professeur"}</strong>
              <span>{auth.user.email}</span>
            </div>
          ) : null}
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
        <span className="mobile-topbar__avatar" aria-hidden="true">
          {teacherAvatarUrl ? <img src={teacherAvatarUrl} alt="" /> : avatarInitial}
        </span>
      </div>

      <main className="dashboard-main">
        <Outlet context={{ auth }} />
      </main>

      {isNotificationsOpen ? (
        <DashboardNotificationsPopover
          ref={panelRef}
          ariaLabel={t("navigation.teacher.notifications")}
          title={t("teacherDashboard.notificationsTitle")}
          markAllLabel={t("teacherDashboard.markAllRead")}
          unreadNotifications={unreadNotifications}
          notifications={notifications}
          dateLocale={dateLocale}
          onMarkAllRead={markAllRead}
        />
      ) : null}

      <nav className="mobile-nav" aria-label="Navigation prof">
        <NavLink to="/dashboard/teacher" end className={({ isActive }) => `mobile-nav__item${isActive ? " active" : ""}`}>
          {t("navigation.teacher.home")}
        </NavLink>
        <NavLink to="/dashboard/teacher/sessions" className={({ isActive }) => `mobile-nav__item${isActive ? " active" : ""}`}>
          {t("navigation.teacher.sessions")}
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
            <button
              className="mobile-nav-drawer__item"
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                void handleLogout();
              }}
            >
              Déconnexion
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
