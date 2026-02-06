import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../../services/api-client";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string } };
};

type Session = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  placesMax: number;
  zoomStartUrl?: string;
  status: "ouvert" | "complet" | "annulee" | "terminee";
};

type AttendanceEntry = {
  student: { id: string; nom?: string; email?: string };
  present: boolean;
  durationMinutes: number;
  joinTime?: string;
  leaveTime?: string;
};

export function TeacherSessionsPage() {
  const { auth } = useOutletContext<AuthContext>();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [placesMax, setPlacesMax] = useState(50);
  const [error, setError] = useState<{ message: string; details?: unknown } | null>(null);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceEntry[] | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  useEffect(() => {
    refreshSessions();
  }, [auth.user.id, auth.user.role]);

  const refreshSessions = () => {
    apiGet<Session[]>("/sessions").then((response) => {
      if (response.data) {
        setSessions(response.data as Session[]);
      }
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const isoDate = scheduledAt ? toLocalIsoWithOffset(scheduledAt) : "";
    const timezone = getLocalTimeZone();
    const response = await apiPost<Session>(
      "/sessions",
      {
        title,
        scheduledAt: isoDate,
        timezone,
        durationMinutes,
        placesMax,
      },
    );

    if (response.error) {
      setError({ message: response.error.message, details: response.error.details });
      return;
    }

    setTitle("");
    setScheduledAt("");
    setDurationMinutes(60);
    setPlacesMax(50);
    refreshSessions();
  };

  const getTiming = (session: Session) => {
    const start = new Date(session.scheduledAt).getTime();
    const end = start + session.durationMinutes * 60 * 1000;
    const now = Date.now();
    return {
      start,
      end,
      isLive: now >= start && now <= end,
      isSoon: start - now <= 15 * 60 * 1000 && start - now > 0,
      isPast: now > end,
    };
  };

  const handleAttendance = async (sessionId: string) => {
    setAttendanceSessionId(sessionId);
    setAttendance(null);
    setAttendanceError(null);
    const response = await apiGet<AttendanceEntry[]>(`/sessions/${sessionId}/attendance`);
    if (response.error) {
      setAttendanceError(response.error.message);
      return;
    }
    if (response.data) {
      setAttendance(response.data as AttendanceEntry[]);
    }
  };

  return (
    <section className="dashboard-section">
      <h1>{t("teacherPages.sessionsTitle")}</h1>
      <div className="dashboard-card">
        <h2>{t("teacherPages.scheduleTitle")}</h2>
        <form className="content-form" onSubmit={handleSubmit}>
          <label>
            {t("teacherPages.title")}
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label>
            {t("teacherPages.dateTime")}
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              required
            />
          </label>
          <label>
            {t("teacherPages.durationMinutes")}
            <input
              type="number"
              min={15}
              max={240}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
              required
            />
          </label>
          <label>
            {t("teacherPages.maxParticipants")}
            <input
              type="number"
              min={1}
              max={300}
              value={placesMax}
              onChange={(event) => setPlacesMax(Number(event.target.value))}
              required
            />
          </label>
          {error ? (
            <div className="form-error">
              <div>{error.message}</div>
              {Array.isArray(error.details) ? (
                <ul className="auth-details">
                  {error.details.map((item, index) => (
                    <li key={`${index}-${String(item)}`}>{String(item)}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <button className="btn btn-primary" type="submit">
            {t("teacherPages.createSession")}
          </button>
        </form>
      </div>
      <div className="dashboard-card">
        <h2>{t("teacherPages.sessionTableTitle")}</h2>
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>{t("teacherPages.title")}</th>
              <th>{t("teacherPages.dateTime")}</th>
              <th>{t("teacherPages.durationMinutes")}</th>
              <th>{t("teacherPages.maxParticipants")}</th>
              <th>{t("teacherPages.start")}</th>
              <th>{t("teacherPages.status")}</th>
              <th>{t("teacherPages.attendance")}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length ? (
              sessions.map((session) => (
                <tr key={session.id}>
                  {(() => {
                    const timing = getTiming(session);
                    const canStart = session.zoomStartUrl && (timing.isLive || timing.isSoon);
                    return (
                      <>
                  <td>{session.title}</td>
                  <td>{new Date(session.scheduledAt).toLocaleString("fr-FR")}</td>
                  <td>{session.durationMinutes} min</td>
                  <td>{session.placesMax}</td>
                  <td>
                    {canStart ? (
                      <a href={session.zoomStartUrl} target="_blank" rel="noreferrer">
                        {t("teacherPages.start")}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{session.status}</td>
                  <td>
                    {timing.isPast ? (
                      <button className="btn btn-ghost" type="button" onClick={() => handleAttendance(session.id)}>
                        {t("teacherPages.attendance")}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                      </>
                    );
                  })()}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>{t("teacherPages.noSessions")}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mobile-cards mobile-cards--spaced">
          {sessions.length ? (
            sessions.map((session) => (
              <article key={session.id} className="mobile-card">
                {(() => {
                  const timing = getTiming(session);
                  const canStart = session.zoomStartUrl && (timing.isLive || timing.isSoon);
                  return (
                    <>
                <div className="mobile-card__header">
                  <strong>{session.title}</strong>
                  <span className={`status ${session.status === "ouvert" ? "live" : ""}`}>
                    {t(`teacherPages.status.${session.status}`)}
                  </span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">{t("teacherPages.dateTime")}</span>
                  <span>{new Date(session.scheduledAt).toLocaleString("fr-FR")}</span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">{t("teacherPages.durationMinutes")}</span>
                  <span>{session.durationMinutes} min</span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">{t("teacherPages.maxParticipants")}</span>
                  <span>{session.placesMax}</span>
                </div>
                <div className="mobile-card__actions">
                  {canStart ? (
                    <a className="secondary-button" href={session.zoomStartUrl} target="_blank" rel="noreferrer">
                      {t("teacherPages.start")}
                    </a>
                  ) : null}
                  {timing.isPast ? (
                    <button className="secondary-button" type="button" onClick={() => handleAttendance(session.id)}>
                      {t("teacherPages.attendance")}
                    </button>
                  ) : null}
                </div>
                    </>
                  );
                })()}
              </article>
            ))
          ) : (
            <div className="mobile-card mobile-card--empty">{t("teacherPages.noSessions")}</div>
          )}
        </div>
        {attendanceSessionId ? (
          <div className="dashboard-card">
            <h3>{t("teacherPages.attendanceTitle")}</h3>
            {attendanceError ? <div className="form-error">{attendanceError}</div> : null}
            {attendance ? (
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>{t("teacherPages.studentName")}</th>
                    <th>{t("teacherPages.studentEmail")}</th>
                    <th>{t("teacherPages.present")}</th>
                    <th>{t("teacherPages.duration")}</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((entry) => (
                    <tr key={`${attendanceSessionId}-${entry.student.id}`}>
                      <td>{entry.student.nom ?? entry.student.id}</td>
                      <td>{entry.student.email ?? "-"}</td>
                      <td>{entry.present ? t("teacherPages.presentYes") : t("teacherPages.presentNo")}</td>
                      <td>{entry.durationMinutes} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">{t("teacherPages.attendanceEmpty")}</div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function toLocalIsoWithOffset(value: string) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
  const offsetMinutes = pad(Math.abs(offset) % 60);
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}${sign}${offsetHours}:${offsetMinutes}`;
}

function getLocalTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}
