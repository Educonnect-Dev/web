import { useEffect, useState } from "react";
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
  id: string;
  title: string;
  scheduledAt: string;
  status: "pending" | "confirmed";
};

type SessionRequest = {
  sessionId: string;
  studentId: string;
  status: "accepted" | "waitlist";
  createdAt: string;
};

export function StudentCalendarPage() {
  const { t } = useTranslation();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [requests, setRequests] = useState<Record<string, SessionRequest>>({});
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
    apiGet<Session[]>("/sessions/calendar").then((response) => {
      if (response.error) {
        setError(response.error.message);
        return;
      }
      if (response.data) {
        setSessions(response.data as Session[]);
      }
    });
    apiGet<SessionRequest[]>("/sessions/requests/me").then((response) => {
      if (response.data) {
        const map: Record<string, SessionRequest> = {};
        (response.data as SessionRequest[]).forEach((item) => {
          map[item.sessionId] = item;
        });
        setRequests(map);
      }
    });
  }, [auth]);

  const handleRequest = async (sessionId: string) => {
    if (!auth) return;
    const response = await apiPost<SessionRequest>(
      `/sessions/${sessionId}/requests`,
      {},
    );
    if (response.error) {
      setError(
        response.error.code === "SESSION_FULL"
          ? t("studentPages.sessionFull")
          : response.error.message,
      );
      return;
    }
    if (response.data) {
      setRequests((prev) => ({ ...prev, [sessionId]: response.data as SessionRequest }));
    }
  };

  const handleJoin = async (sessionId: string) => {
    const response = await apiGet<{ meetingUrl: string }>(`/sessions/${sessionId}/join`);
    if (response.error) {
      setError(response.error.message);
      return;
    }
    if (response.data?.meetingUrl) {
      window.open(response.data.meetingUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">{t("studentPages.loginTitleCalendar")}</h1>
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
        <h1>{t("studentPages.calendarTitle")}</h1>
        <div className="dashboard-card">
          {error ? <div className="form-error">{error}</div> : null}
          <table className="dashboard-table dashboard-table--mobile-hide">
            <thead>
              <tr>
                <th>{t("studentPages.tableSession")}</th>
                <th>{t("studentPages.tableDate")}</th>
                <th>{t("studentPages.tableAccess")}</th>
                <th>{t("studentPages.tableStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length ? (
                sessions.map((session) => (
                  <tr key={session.id}>
                    <td>{session.title}</td>
                    <td>{new Date(session.scheduledAt).toLocaleString("fr-FR")}</td>
                    <td>
                      {requests[session.id]?.status === "accepted" ? (
                        <button className="secondary-button" type="button" onClick={() => handleJoin(session.id)}>
                          {t("studentPages.open")}
                        </button>
                      ) : (
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => handleRequest(session.id)}
                        >
                          {t("studentPages.request")}
                        </button>
                      )}
                    </td>
                    <td>
                      {requests[session.id]?.status === "accepted"
                        ? t("studentPages.statusAccepted")
                        : requests[session.id]?.status === "waitlist"
                          ? t("studentPages.statusWaitlist")
                          : t("studentPages.statusNotEnrolled")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>{t("studentPages.noSessions")}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mobile-cards mobile-cards--spaced">
            {sessions.length ? (
              sessions.map((session) => (
                <article key={session.id} className="mobile-card">
                  <div className="mobile-card__header">
                    <strong>{session.title}</strong>
                    <span className="status">
                      {requests[session.id]?.status === "accepted"
                        ? t("studentPages.statusAccepted")
                        : requests[session.id]?.status === "waitlist"
                          ? t("studentPages.statusWaitlist")
                          : t("studentPages.statusNotEnrolled")}
                    </span>
                  </div>
                  <div className="mobile-card__row">
                    <span className="mobile-card__label">{t("studentPages.tableDate")}</span>
                    <span>{new Date(session.scheduledAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <div className="mobile-card__actions">
                    {requests[session.id]?.status === "accepted" ? (
                      <button className="secondary-button" type="button" onClick={() => handleJoin(session.id)}>
                        {t("studentPages.open")}
                      </button>
                    ) : (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => handleRequest(session.id)}
                      >
                        {t("studentPages.request")}
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="mobile-card mobile-card--empty">{t("studentPages.noSessions")}</div>
            )}
          </div>
        </div>
      </section>
    </StudentDashboardLayout>
  );
}
