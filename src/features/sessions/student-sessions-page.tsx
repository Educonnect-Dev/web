import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../services/api-client";
import { StudentDashboardLayout } from "../dashboard/student-dashboard-layout";
import { openJitsiMeetingInBrowserOnly } from "./utils/open-jitsi";

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
  teacherName?: string;
  teacherSubject?: string;
  niveau?: string;
  annee?: string;
};

export function StudentSessionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [niveauFilter, setNiveauFilter] = useState("");
  const [anneeFilter, setAnneeFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

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
  const subjectOptions = Array.from(
    new Set(sessions.map((session) => session.teacherSubject).filter(Boolean) as string[]),
  ).sort();
  const niveauOptions = Array.from(
    new Set(sessions.map((session) => session.niveau).filter(Boolean) as string[]),
  ).sort();
  const anneeOptions = Array.from(
    new Set(sessions.map((session) => session.annee).filter(Boolean) as string[]),
  ).sort();
  const filteredSessions = sessions.filter((session) => {
    const matchesQuery = query.trim()
      ? normalizeSessionSearch([session.title, session.teacherName, session.teacherSubject].filter(Boolean).join(" ")).includes(
          normalizeSessionSearch(query),
        )
      : true;
    const matchesSubject = subjectFilter ? session.teacherSubject === subjectFilter : true;
    const matchesNiveau = niveauFilter ? session.niveau === niveauFilter : true;
    const matchesAnnee = anneeFilter ? session.annee === anneeFilter : true;
    return matchesQuery && matchesSubject && matchesNiveau && matchesAnnee;
  });
  const { upcoming, past } = useMemo(() => {
    const upcomingList: Session[] = [];
    const pastList: Session[] = [];
    filteredSessions.forEach((session) => {
      const start = new Date(session.scheduledAt).getTime();
      if (start >= now) {
        upcomingList.push(session);
      } else {
        pastList.push(session);
      }
    });
    return { upcoming: upcomingList, past: pastList };
  }, [filteredSessions, now]);

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
      openJitsiMeetingInBrowserOnly(response.data.zoomJoinUrl);
      return;
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
          <Link className="btn btn-primary" to="/login">
            {t("auth.loginCta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <StudentDashboardLayout auth={auth}>
      <section className="dashboard-section">
        <div className="sessions-hub-header">
          <div>
            <h1>{t("studentPages.mySessionsTitle")}</h1>
            <p className="dashboard-muted">{t("studentPages.mySessionsTitle")}</p>
          </div>
          <div className="sessions-tabs" role="tablist" aria-label="Navigation sessions">
            <button
              type="button"
              role="tab"
              aria-selected={false}
              className="sessions-tab"
              onClick={() => navigate("/calendar")}
            >
              {t("studentPages.calendarTitle")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={true}
              className="sessions-tab is-active"
              onClick={() => navigate("/dashboard/student/sessions")}
            >
              {t("studentPages.mySessionsTitle")}
            </button>
          </div>
        </div>
        {error ? <div className="form-error">{error}</div> : null}
        <div className="student-sessions-stack">
          <div className="dashboard-card">
            <div className="sessions-panel-header sessions-panel-header--filters">
              <h2>Filtres</h2>
              <button className="btn btn-ghost" type="button" onClick={() => setIsFilterPanelOpen((prev) => !prev)}>
                {isFilterPanelOpen ? "Masquer" : "Afficher"}
              </button>
            </div>
            {isFilterPanelOpen ? (
              <div className="content-form">
                <label>
                  Recherche
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Titre / prof / matière"
                  />
                </label>
                <label>
                  Matière
                  <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                    <option value="">Toutes</option>
                    {subjectOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Niveau
                  <select value={niveauFilter} onChange={(event) => setNiveauFilter(event.target.value)}>
                    <option value="">Tous</option>
                    {niveauOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Année
                  <select value={anneeFilter} onChange={(event) => setAnneeFilter(event.target.value)}>
                    <option value="">Toutes</option>
                    {anneeOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>

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
                      {(session.teacherName || session.teacherSubject) ? (
                        <p>
                          {session.teacherName ? `Prof: ${session.teacherName}` : "Prof"}{" "}
                          {session.teacherSubject ? `• Matière: ${session.teacherSubject}` : ""}
                        </p>
                      ) : null}
                      {(session.niveau || session.annee) ? (
                        <p>
                          {session.niveau ? `Niveau: ${session.niveau}` : "Niveau"}{" "}
                          {session.annee ? `• Année: ${session.annee}` : ""}
                        </p>
                      ) : null}
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
                    {(session.teacherName || session.teacherSubject) ? (
                      <p>
                        {session.teacherName ? `Prof: ${session.teacherName}` : "Prof"}{" "}
                        {session.teacherSubject ? `• Matière: ${session.teacherSubject}` : ""}
                      </p>
                    ) : null}
                    {(session.niveau || session.annee) ? (
                      <p>
                        {session.niveau ? `Niveau: ${session.niveau}` : "Niveau"}{" "}
                        {session.annee ? `• Année: ${session.annee}` : ""}
                      </p>
                    ) : null}
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
        </div>
      </section>
    </StudentDashboardLayout>
  );
}

function normalizeSessionSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
