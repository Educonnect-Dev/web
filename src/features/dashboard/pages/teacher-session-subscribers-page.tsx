import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet } from "../../../services/api-client";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string } };
};

type Subscriber = {
  id: string;
  teacherId: string;
  studentId: string;
  status: "active" | "canceled";
};

export function TeacherSessionSubscribersPage() {
  const { auth } = useOutletContext<AuthContext>();
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState("");
  const [query, setQuery] = useState("");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canFetch = useMemo(() => sessionId.trim().length > 0, [sessionId]);

  useEffect(() => {
    if (!canFetch) return;
    setError(null);
    const url = `/sessions/${encodeURIComponent(sessionId)}/subscribers${query ? `?q=${encodeURIComponent(query)}` : ""}`;
    apiGet<Subscriber[]>(url).then((response) => {
      if (response.error) {
        setError(response.error.message);
        setSubscribers([]);
        return;
      }
      setSubscribers(response.data ?? []);
    });
  }, [auth.user.id, auth.user.role, canFetch, query, sessionId]);

  return (
    <section className="dashboard-section">
      <h1>{t("teacherPages.subscribersBySessionTitle")}</h1>
      <div className="dashboard-card">
        <div className="content-form">
          <label>
            {t("teacherPages.sessionId")}
            <input value={sessionId} onChange={(event) => setSessionId(event.target.value)} />
          </label>
          <label>
            {t("teacherPages.filter")}
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
        </div>
      </div>
      <div className="dashboard-card">
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>{t("teacherPages.studentId")}</th>
              <th>{t("teacherPages.status")}</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.length ? (
              subscribers.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td>{subscriber.studentId}</td>
                  <td>{subscriber.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2}>{t("teacherPages.noSubscribers")}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mobile-cards mobile-cards--spaced">
          {subscribers.length ? (
            subscribers.map((subscriber) => (
              <article key={subscriber.id} className="mobile-card">
                <div className="mobile-card__header">
                  <strong>{subscriber.studentId}</strong>
                  <span className="status">{subscriber.status}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="mobile-card mobile-card--empty">{t("teacherPages.noSubscribers")}</div>
          )}
        </div>
      </div>
    </section>
  );
}
