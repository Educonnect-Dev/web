import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export function TeacherDashboardPage() {
  const { t } = useTranslation();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const navigate = useNavigate();
  const [summary, setSummary] = useState<{
    contentsCount: number;
    subscribersCount: number;
    revenueMonth: number;
    upcomingSessions: Array<{
      id: string;
      title: string;
      scheduledAt: string;
      status: "ouvert" | "complet" | "annulee" | "terminee";
    }>;
  } | null>(null);

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
    if (!auth) return;
    apiGet("/dashboard/teacher/summary").then((response) => {
      if (response.data) {
        setSummary(response.data as typeof summary);
      }
    });
  }, [auth]);

  if (!auth || auth.user.role !== "teacher") {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-card">
          <h2>{t("auth.reserved")}</h2>
          <p>{t("auth.loginAsTeacher")}</p>
          <Link className="btn btn-primary" to="/login">
            {t("auth.loginCta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">Educonnect</div>
        <nav className="dashboard-nav">
          <button className="nav-item active">Vue d'ensemble</button>
          <button className="nav-item">Contenus</button>
          <button className="nav-item">Abonnés</button>
          <button className="nav-item">Sessions live</button>
          <button className="nav-item">Revenus</button>
          <button className="nav-item">Messages</button>
          <button className="nav-item">Paramètres</button>
        </nav>
        <div className="sidebar-footer">
          <span>{auth.user.email}</span>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await apiPost("/auth/logout", {});
              window.localStorage.removeItem(STORAGE_KEY);
              navigate("/login", { replace: true });
            }}
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{t("teacherDashboard.title")}</h1>
            <p>{t("teacherDashboard.welcome", { email: auth.user.email })}</p>
          </div>
          <div className="dashboard-actions">
            <button className="btn btn-ghost">{t("teacherDashboard.scheduleSession")}</button>
            <button className="btn btn-primary">{t("teacherDashboard.publishContent")}</button>
          </div>
        </header>

        <section className="dashboard-grid">
          <div className="dashboard-card highlight">
            <h3>{t("teacherDashboard.revenueMonth")}</h3>
            <div className="dashboard-value">{summary ? summary.revenueMonth : 0} DZD</div>
            <span className="dashboard-tag">+12% vs mois dernier</span>
          </div>
          <div className="dashboard-card">
            <h3>{t("teacherDashboard.subscribersActive")}</h3>
            <div className="dashboard-value">{summary ? summary.subscribersCount : 0}</div>
            <span className="dashboard-tag">+7 cette semaine</span>
          </div>
          <div className="dashboard-card">
            <h3>{t("teacherDashboard.contentsPublished")}</h3>
            <div className="dashboard-value">{summary ? summary.contentsCount : 0}</div>
            <span className="dashboard-tag">PDF • Vidéos</span>
          </div>
        </section>

        <div className="dashboard-columns">
        <section className="dashboard-section">
            <h2>{t("teacherDashboard.upcomingSessions")}</h2>
            <div className="dashboard-list">
              {summary?.upcomingSessions.length ? (
                summary.upcomingSessions.map((session) => (
                  <div key={session.id} className="dashboard-row">
                    <div>
                      <strong>{session.title}</strong>
                      <p>{session.scheduledAt}</p>
                    </div>
                    <span className={`status ${session.status === "ouvert" ? "live" : ""}`}>
                      {t(`teacherDashboard.status.${session.status}`)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="dashboard-row">
                  <div>
                    <strong>{t("teacherDashboard.noneSessions")}</strong>
                    <p>{t("teacherDashboard.planNext")}</p>
                  </div>
                  <span className="status">{t("teacherDashboard.toCome")}</span>
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-section">
            <h2>{t("teacherDashboard.quickActions")}</h2>
            <div className="quick-actions">
              <button className="btn btn-primary">{t("teacherDashboard.createPdf")}</button>
              <button className="btn btn-ghost">{t("teacherDashboard.updateProfile")}</button>
              <button className="btn btn-ghost">{t("teacherDashboard.viewStats")}</button>
            </div>
            <div className="dashboard-card compact">
              <h3>{t("teacherDashboard.todayTodo")}</h3>
              <ul className="dashboard-todo">
                <li>Répondre à 3 messages</li>
                <li>Uploader une vidéo premium</li>
                <li>Publier un extrait gratuit</li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
