import { useEffect, useRef, useState } from "react";
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

type NotificationItem = {
  id: string;
  type: "session_reminder" | "new_content";
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
};

const STORAGE_KEY = "educonnect_auth";

export function TeacherDashboardLayout() {
  const [auth, setAuth] = useState<AuthState | null>(null);
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
  }, [auth]);

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
            aria-label={t("navigation.teacher.notifications")}
            type="button"
            onClick={handleBellToggle}
            ref={desktopBellRef}
          >
            <span aria-hidden="true">🔔</span>
            {unreadNotifications ? <span className="dashboard-bell__badge">{unreadLabel}</span> : null}
          </button>
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

      <main className="dashboard-main">
        <Outlet context={{ auth }} />
      </main>

      {isNotificationsOpen ? (
        <div className="dashboard-notif-popover" ref={panelRef} role="dialog" aria-label={t("navigation.teacher.notifications")}>
          <div className="dashboard-notif-popover__header">
            <strong>{t("teacherDashboard.notificationsTitle")}</strong>
            {unreadNotifications ? (
              <button className="btn btn-ghost" type="button" onClick={handleMarkAllRead}>
                {t("teacherDashboard.markAllRead")}
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
                  <p>{formatNotificationTeacherLabel(notification.message)}</p>
                  <small>{formatNotificationDate(notification.createdAt, dateLocale)}</small>
                </article>
              ))
            ) : null}
          </div>
        </div>
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

function formatNotificationTeacherLabel(text: string) {
  return text
    .replace(/^(.+?) a publié\b/u, (_, name: string) => `${withProfessorPrefix(name)} a publié`)
    .replace(/\bavec (.+?) commence bientôt\./u, (_, name: string) => `avec ${withProfessorPrefix(name)} commence bientôt.`);
}

function withProfessorPrefix(name: string) {
  const trimmed = name.trim();
  if (/^(Pr|Prof\.?|Professeur)\b/i.test(trimmed)) return trimmed;
  return `Pr ${trimmed}`;
}

function formatNotificationDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
