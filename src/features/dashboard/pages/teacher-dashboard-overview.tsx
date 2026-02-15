import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../../services/api-client";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string } };
};

type Summary = {
  contentsCount: number;
  subscribersCount: number;
  revenueMonth: number;
  upcomingSessions: Array<{
    id: string;
    title: string;
    scheduledAt: string;
    status: "ouvert" | "complet" | "annulee" | "terminee";
  }>;
};

type Thread = {
  id: string;
  participantId: string;
  lastMessage: { content: string; createdAt: string };
};

type NotificationItem = {
  id: string;
  type: "session_reminder" | "new_content";
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
};

export function TeacherDashboardOverview() {
  const { auth } = useOutletContext<AuthContext>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [alerts, setAlerts] = useState<Thread[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    apiGet("/dashboard/teacher/summary").then((response) => {
      if (response.data) {
        setSummary(response.data as Summary);
      }
    });
    apiGet<Thread[]>("/messages/threads").then((response) => {
      if (response.data) {
        const list = (response.data as Thread[]).filter((thread) =>
          thread.lastMessage.content.includes("[SESSION_FULL]"),
        );
        setAlerts(list.slice(0, 3));
      }
    });
    apiGet<NotificationItem[]>("/notifications/me?limit=8").then((response) => {
      if (response.data) {
        setNotifications(response.data);
      }
    });
  }, [auth.user.id, auth.user.role]);

  const handleMarkAllNotificationsRead = async () => {
    const response = await apiPost<{ modified: number }>("/notifications/read-all", {});
    if (response.data) {
      const nowIso = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? nowIso })));
    }
  };

  return (
    <>
      <header className="dashboard-header">
        <div>
          <h1>{t("teacherDashboard.title")}</h1>
          <p>{t("teacherDashboard.welcome", { email: auth.user.email })}</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-ghost" type="button" onClick={() => navigate("/dashboard/teacher/sessions")}>
            {t("teacherDashboard.scheduleSession")}
          </button>
          <button className="btn btn-primary" type="button" onClick={() => navigate("/dashboard/teacher/contents")}>
            {t("teacherDashboard.publishContent")}
          </button>
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
            <button className="btn btn-primary" type="button" onClick={() => navigate("/dashboard/teacher/contents")}>
              {t("teacherDashboard.createPdf")}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => navigate("/dashboard/teacher/profile")}>
              {t("teacherDashboard.updateProfile")}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => navigate("/dashboard/teacher/revenue")}>
              {t("teacherDashboard.viewStats")}
            </button>
          </div>
          <div className="dashboard-card compact">
            <div id="notifications" className="row-actions">
              <h3>{t("teacherDashboard.notificationsTitle")}</h3>
              {notifications.some((item) => !item.readAt) ? (
                <button className="btn btn-ghost" type="button" onClick={handleMarkAllNotificationsRead}>
                  {t("teacherDashboard.markAllRead")}
                </button>
              ) : null}
            </div>
            <div className="dashboard-list">
              {notifications.length ? (
                notifications.map((notification) => (
                  <div key={notification.id} className="dashboard-row">
                    <div>
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                      <p>{new Date(notification.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <span className={`status ${notification.readAt ? "" : "live"}`}>
                      {t("teacherDashboard.notificationTag")}
                    </span>
                  </div>
                ))
              ) : (
                <div className="dashboard-row">
                  <div>
                    <strong>{t("teacherDashboard.notificationsEmpty")}</strong>
                  </div>
                </div>
              )}
            </div>
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
      {alerts.length ? (
        <section className="dashboard-section">
          <h2>Alertes</h2>
          <div className="dashboard-card">
            <div className="dashboard-list">
              {alerts.map((alert) => (
                <div key={alert.id} className="dashboard-row">
                  <div>
                    <strong>Session complète</strong>
                    <p>{alert.lastMessage.content.replace("[SESSION_FULL]", "").trim()}</p>
                  </div>
                  <span className="status">Nouveau</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
