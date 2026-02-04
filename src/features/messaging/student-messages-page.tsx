import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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

type Thread = {
  id: string;
  participantId: string;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    fromUserId: string;
  };
};

export function StudentMessagesPage() {
  const { t } = useTranslation();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const teacherId = searchParams.get("teacherId") ?? "";

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
    if (!auth || auth.user.role !== "student" || !teacherId) return;
    apiGet<Thread[]>(`/messages/threads/${teacherId}`).then((response) => {
      if (response.error) {
        setError(response.error.message);
        setThreads([]);
        return;
      }
      setThreads(response.data ?? []);
    });
  }, [auth, teacherId]);

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!auth || auth.user.role !== "student" || !teacherId) return;

    const response = await apiPost(
      "/messages/student",
      { toUserId: teacherId, content: message },
    );

    if (response.error) {
      setError(response.error.message);
      return;
    }
    setMessage("");
  };

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">{t("studentPages.loginTitleMessages")}</h1>
          <p>{t("auth.loginAsStudent")}</p>
          <a className="btn btn-primary" href="/login">
            {t("auth.loginCta")}
          </a>
        </div>
      </div>
    );
  }

  if (!teacherId) {
    return (
      <StudentDashboardLayout auth={auth}>
        <section className="dashboard-section">
          <h1>{t("studentPages.messagesTitle")}</h1>
          <div className="dashboard-card">
            <p>{t("studentPages.selectTeacher")}</p>
          </div>
        </section>
      </StudentDashboardLayout>
    );
  }

  return (
    <StudentDashboardLayout auth={auth}>
      <section className="dashboard-section">
        <h1>{t("studentPages.messagesTitle")}</h1>
        <div className="dashboard-card">
          {error ? <div className="form-error">{error}</div> : null}
          <table className="dashboard-table dashboard-table--mobile-hide">
            <thead>
              <tr>
                <th>{t("studentPages.conversation")}</th>
                <th>{t("studentPages.lastMessage")}</th>
                <th>{t("studentPages.tableDate")}</th>
              </tr>
            </thead>
            <tbody>
              {threads.length ? (
                threads.map((thread) => (
                  <tr key={thread.id}>
                    <td>{thread.participantId}</td>
                    <td>{thread.lastMessage.content}</td>
                    <td>{new Date(thread.lastMessage.createdAt).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>{t("studentPages.noConversations")}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mobile-cards mobile-cards--spaced">
            {threads.length ? (
              threads.map((thread) => (
                <article key={thread.id} className="mobile-card">
                  <div className="mobile-card__header">
                    <strong>{thread.participantId}</strong>
                    <span>{new Date(thread.lastMessage.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <div className="mobile-card__row">
                    <span className="mobile-card__label">{t("studentPages.lastMessage")}</span>
                    <span>{thread.lastMessage.content}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="mobile-card mobile-card--empty">{t("studentPages.noConversations")}</div>
            )}
          </div>
        </div>
        <div className="dashboard-card">
          <h2>{t("studentPages.sendMessage")}</h2>
          <form className="content-form" onSubmit={handleSend}>
            <label>
              Message
              <input value={message} onChange={(event) => setMessage(event.target.value)} required />
            </label>
            {error ? <div className="form-error">{error}</div> : null}
            <button className="btn btn-primary" type="submit">
              {t("studentPages.send")}
            </button>
          </form>
        </div>
      </section>
    </StudentDashboardLayout>
  );
}
