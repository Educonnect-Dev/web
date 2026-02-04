import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../../services/api-client";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string } };
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

export function TeacherMessagesPage() {
  const { auth } = useOutletContext<AuthContext>();
  const { t } = useTranslation();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshThreads();
  }, [auth.user.id, auth.user.role]);

  const refreshThreads = () => {
    apiGet<Thread[]>("/messages/threads").then((response) => {
      if (response.data) {
        setThreads(response.data as Thread[]);
      }
    });
  };

  const handleReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const thread = threads.find((item) => item.id === selectedThread);
    if (!thread) {
      setError("Sélectionne une conversation.");
      return;
    }
    const response = await apiPost(
      "/messages",
      { toUserId: thread.participantId, content: message },
    );
    if (response.error) {
      setError(response.error.message);
      return;
    }
    setMessage("");
    refreshThreads();
  };

  return (
    <section className="dashboard-section">
      <h1>{t("teacherPages.messageTitle")}</h1>
      <div className="dashboard-card">
        <h2>{t("teacherPages.replyTitle")}</h2>
        <form className="content-form" onSubmit={handleReply}>
          <label>
            {t("teacherPages.selectSubscriber")}
            <select value={selectedThread} onChange={(event) => setSelectedThread(event.target.value)}>
              <option value="">{t("teacherPages.selectSubscriber")}</option>
              {threads.map((thread) => (
                <option key={thread.id} value={thread.id}>
                  {thread.participantId}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("teacherPages.messageLabel")}
            <input value={message} onChange={(event) => setMessage(event.target.value)} required />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button className="btn btn-primary" type="submit">
            {t("teacherPages.send")}
          </button>
        </form>
      </div>
      <div className="dashboard-card">
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>{t("teacherPages.studentId")}</th>
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
                <td colSpan={3}>{t("teacherPages.noMessages")}</td>
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
            <div className="mobile-card mobile-card--empty">{t("teacherPages.noMessages")}</div>
          )}
        </div>
      </div>
    </section>
  );
}
