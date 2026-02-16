import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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

type NotificationItem = {
  id: string;
  type: "session_reminder" | "new_content";
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
};

const STORAGE_KEY = "educonnect_auth";

export function StudentDashboardLayout({ auth, children }: StudentDashboardLayoutProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const desktopBellRef = useRef<HTMLButtonElement | null>(null);
  const mobileBellRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (auth.user.role !== "student") return;
    let active = true;
    const loadNotifications = async () => {
      const response = await apiGet<NotificationItem[]>("/notifications/me?limit=8");
      if (!active || !response.data) return;
      setNotifications(response.data);
      setUnreadNotifications(response.data.filter((item) => !item.readAt).length);
    };
    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 60000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [auth.user.role]);

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

  const handleBellToggle = () => {
    setIsMobileMenuOpen(false);
    setIsNotificationsOpen((prev) => !prev);
  };

  const handleMarkAllRead = async () => {
    const response = await apiPost<{ modified: number }>("/notifications/read-all", {});
    if (!response.data) return;
    const nowIso = new Date().toISOString();
    setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? nowIso })));
    setUnreadNotifications(0);
  };

  const handleLogout = async () => {
    await apiPost("/auth/logout", {});
    window.localStorage.removeItem(STORAGE_KEY);
    navigate("/login");
  };

  return (
    <div className="dashboard-shell">
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
          <button className="nav-item" type="button" onClick={handleLogout}>
            Déconnexion
          </button>
        </nav>
        <div className="sidebar-footer">
          <span>{auth.user.email}</span>
        </div>
      </aside>

      <main className="dashboard-main">{children}</main>

      {isNotificationsOpen ? (
        <div className="dashboard-notif-popover" ref={panelRef} role="dialog" aria-label={t("navigation.student.notifications")}>
          <div className="dashboard-notif-popover__header">
            <strong>{t("studentDashboard.notificationsTitle")}</strong>
            {unreadNotifications ? (
              <button className="btn btn-ghost" type="button" onClick={handleMarkAllRead}>
                {t("studentDashboard.markAllRead")}
              </button>
            ) : null}
          </div>
          <div className="dashboard-notif-popover__list">
            {notifications.length ? (
              notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`dashboard-notif-item${notification.readAt ? "" : " dashboard-notif-item--unread"}`}
                >
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <small>{new Date(notification.createdAt).toLocaleString(dateLocale)}</small>
                </article>
              ))
            ) : null}
          </div>
        </div>
      ) : null}

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
            <button className="mobile-nav-drawer__item" type="button" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
