import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../../services/api-client";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string } };
};

type Subscriber = {
  id: string;
  studentId: string;
  status: "active" | "canceled";
};

export function TeacherSubscribersPage() {
  const { auth } = useOutletContext<AuthContext>();
  const { t } = useTranslation();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedSubscriber, setSelectedSubscriber] = useState<string>("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Subscriber[]>("/subscriptions").then((response) => {
      if (response.data) {
        setSubscribers(response.data as Subscriber[]);
      }
    });
  }, [auth.user.id, auth.user.role]);

  const sendMessage = async () => {
    if (!selectedSubscriber || !message) return;
    const response = await apiPost(
      "/messages",
      { toUserId: selectedSubscriber, content: message },
    );
    if (response.error) {
      setStatus("Erreur d'envoi");
      return;
    }
    setStatus("Message envoyé");
    setMessage("");
  };

  return (
    <section className="dashboard-section">
      <h1>{t("teacherPages.subscribersTitle")}</h1>
      <div className="dashboard-card">
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>{t("teacherPages.studentId")}</th>
              <th>{t("teacherPages.statusLabel")}</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.length ? (
              subscribers.map((item) => (
                <tr key={item.id}>
                  <td>{item.studentId}</td>
                  <td>{item.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2}>{t("teacherPages.noSubscribersActive")}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mobile-cards mobile-cards--spaced">
          {subscribers.length ? (
            subscribers.map((item) => (
              <article key={item.id} className="mobile-card">
                <div className="mobile-card__header">
                  <strong>{item.studentId}</strong>
                  <span className="status">{item.status}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="mobile-card mobile-card--empty">{t("teacherPages.noSubscribersActive")}</div>
          )}
        </div>
      </div>
      <div className="dashboard-card" style={{ marginTop: 16 }}>
        <h3>{t("teacherPages.messageTitle")}</h3>
        <div className="settings-grid">
          <label>
            <span>{t("teacherPages.selectSubscriber")}</span>
            <select
              value={selectedSubscriber}
              onChange={(event) => setSelectedSubscriber(event.target.value)}
            >
              <option value="">{t("teacherPages.selectSubscriber")}</option>
              {subscribers.map((item) => (
                <option key={item.id} value={item.studentId}>
                  {item.studentId}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("teacherPages.messageLabel")}</span>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Votre message..."
            />
          </label>
          <button className="btn btn-primary" type="button" onClick={sendMessage}>
            {t("teacherPages.send")}
          </button>
          {status ? <div className="form-success">{status}</div> : null}
        </div>
      </div>
    </section>
  );
}
