import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../services/api-client";
import { StudentDashboardLayout } from "../dashboard/student-dashboard-layout";

const STORAGE_KEY = "educonnect_auth";

type AuthUser = {
  id: string;
  email: string;
  role: "student" | "teacher";
};

type AuthState = {
  user: AuthUser;
  accessToken: string;
};

type Session = {
  id?: string;
  _id?: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  zoomJoinUrl?: string;
  status: "ouvert" | "complet" | "annulee" | "terminee";
};

export function StudentSessionsPage() {
  const { t } = useTranslation();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    if (!auth || auth.user.role !== "student") return;
    apiGet<Session[]>(`/sessions/students/${auth.user.id}/sessions`).then((response) => {
      if (response.error) {
        setError(response.error.message);
        return;
      }
      if (response.data) {
        setSessions(response.data as Session[]);
      }
    });
  }, [auth]);

  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const upcomingList: Session[] = [];
    const pastList: Session[] = [];
    sessions.forEach((session) => {
      const start = new Date(session.scheduledAt).getTime();
      if (start >= now) {
        upcomingList.push(session);
      } else {
        pastList.push(session);
      }
    });
    return { upcoming: upcomingList, past: pastList };
  }, [sessions, now]);

  const getTiming = (session: Session) => {
    const start = new Date(session.scheduledAt).getTime();
    const end = start + session.durationMinutes * 60 * 1000;
    const msToStart = start - Date.now();
    const isLive = Date.now() >= start && Date.now() <= end;
    const canJoin = msToStart <= 15 * 60 * 1000;
    return { start, end, msToStart, isLive, canJoin };
  };

  const handleJoin = async (sessionId: string) => {
    const response = await apiGet<{ zoomJoinUrl: string }>(`/sessions/${sessionId}/join`);
    if (response.error) {
      setError(response.error.message);
      return;
    }
    if (response.data?.zoomJoinUrl) {
      window.open(response.data.zoomJoinUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleUnenroll = async (sessionId: string) => {
    const response = await apiPost<Session>(`/sessions/${sessionId}/unenroll`, {});
    if (response.error) {
      setError(response.error.message);
      return;
    }
    setSessions((prev) =>
      prev.filter((session) => (session.id ?? session._id ?? "") !== sessionId),
    );
  };

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">{t("studentPages.mySessionsTitle")}</h1>
          <p>{t("auth.loginAsStudent")}</p>
          <a className="btn btn-primary" href="/login">
            {t("auth.loginCta")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <StudentDashboardLayout auth={auth}>
      <section className="dashboard-section">
        <h1>{t("studentPages.mySessionsTitle")}</h1>
        {error ? <div className="form-error">{error}</div> : null}

        <div className="dashboard-card">
          <h2>{t("studentPages.upcomingSessions")}</h2>
          {upcoming.length ? (
            <div className="dashboard-list">
              {upcoming.map((session) => {
                const sessionId = session.id ?? session._id ?? "";
                const timing = getTiming(session);
                return (
                  <div key={sessionId} className="dashboard-row">
                    <div>
                      <strong>{session.title}</strong>
                      <p>{new Date(session.scheduledAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <div className="row-actions">
                      {timing.isLive ? (
                        <span className="status live">{t("studentPages.live")}</span>
                      ) : (
                        <span className="status">{t(`studentDashboard.status.${session.status}`)}</span>
                      )}
                      {session.zoomJoinUrl ? (
                        <button className="btn btn-primary" type="button" onClick={() => handleJoin(sessionId)}>
                          {t("studentPages.open")}
                        </button>
                      ) : timing.canJoin ? (
                        <button className="btn btn-primary" type="button" onClick={() => handleJoin(sessionId)}>
                          {t("studentPages.join")}
                        </button>
                      ) : (
                        <button className="btn btn-ghost" type="button" onClick={() => handleUnenroll(sessionId)}>
                          {t("studentPages.unenroll")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">{t("studentPages.noUpcomingSessions")}</div>
          )}
        </div>

        <div className="dashboard-card">
          <h2>{t("studentPages.pastSessions")}</h2>
          {past.length ? (
            <div className="dashboard-list">
              {past.map((session) => {
                const sessionId = session.id ?? session._id ?? "";
                return (
                <div key={sessionId} className="dashboard-row">
                  <div>
                    <strong>{session.title}</strong>
                    <p>{new Date(session.scheduledAt).toLocaleString("fr-FR")}</p>
                  </div>
                  <span className="status">{t("studentPages.completed")}</span>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">{t("studentPages.noPastSessions")}</div>
          )}
        </div>
      </section>
    </StudentDashboardLayout>
  );
}
