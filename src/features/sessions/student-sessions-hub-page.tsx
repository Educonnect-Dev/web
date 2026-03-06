import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { StudentDashboardLayout } from "../dashboard/student-dashboard-layout";
import { useStudentSessions } from "./hooks/use-student-sessions";
import type { StudentSessionAccessState } from "./utils/session-ui";

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

type StudentSessionsHubPageProps = {
  initialTab: "calendar" | "my-sessions";
};

export function StudentSessionsHubPage({ initialTab }: StudentSessionsHubPageProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [activeTab, setActiveTab] = useState<"calendar" | "my-sessions">(initialTab);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [niveauFilter, setNiveauFilter] = useState("");
  const [anneeFilter, setAnneeFilter] = useState("");

  const isAr = i18n.language === "ar";
  const dateLocale = isAr ? "ar-DZ" : "fr-FR";
  const levelYearLabel = isAr ? "المستوى / السنة" : "Niveau / Année";

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = "Mon calendrier";
  }, [i18n.language]);

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

  const {
    indexedCalendar,
    indexedMine,
    mySessions,
    error,
    enroll,
    join,
    unenroll,
    isJoiningSessionId,
  } = useStudentSessions({
    studentId: auth?.user.role === "student" ? auth.user.id : null,
    includeCalendar: true,
  });

  const allFilterSourceSessions = useMemo(
    () => [...indexedCalendar.map((item) => item.session), ...mySessions],
    [indexedCalendar, mySessions],
  );

  const isSameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  const subjectOptions = Array.from(
    new Set(allFilterSourceSessions.map((session) => session.teacherSubject).filter(Boolean) as string[]),
  ).sort();
  const niveauOptions = Array.from(
    new Set(allFilterSourceSessions.map((session) => session.niveau).filter(Boolean) as string[]),
  ).sort();
  const anneeOptions = Array.from(
    new Set(allFilterSourceSessions.map((session) => session.annee).filter(Boolean) as string[]),
  ).sort();

  const filteredCalendarSessions = indexedCalendar.filter(({ session }) =>
    matchesSessionFilters(session, { query, subjectFilter, niveauFilter, anneeFilter }),
  );

  const now = new Date();
  const { todaySessions, upcomingCalendarSessions } = filteredCalendarSessions.reduce(
    (acc, item) => {
      const start = new Date(item.session.scheduledAt);
      if (isSameDay(start, now)) acc.todaySessions.push(item);
      else if (start.getTime() > now.getTime()) acc.upcomingCalendarSessions.push(item);
      return acc;
    },
    {
      todaySessions: [] as typeof indexedCalendar,
      upcomingCalendarSessions: [] as typeof indexedCalendar,
    },
  );

  const filteredSessions = indexedMine.filter(({ session }) =>
    matchesSessionFilters(session, { query, subjectFilter, niveauFilter, anneeFilter }),
  );

  const { myUpcomingSessions, myPastSessions } = useMemo(() => {
    const myUpcoming: typeof filteredSessions = [];
    const myPast: typeof filteredSessions = [];
    filteredSessions.forEach((item) => {
      if (!item.timing.isPast) myUpcoming.push(item);
      else myPast.push(item);
    });
    return { myUpcomingSessions: myUpcoming, myPastSessions: myPast };
  }, [filteredSessions]);

  const switchTab = (tab: "calendar" | "my-sessions") => {
    setActiveTab(tab);
    navigate(tab === "calendar" ? "/calendar" : "/dashboard/student/sessions");
  };

  const activeFilterChips = [
    query.trim() ? { key: "query", label: `Recherche: ${query.trim()}` } : null,
    subjectFilter ? { key: "subject", label: `Matière: ${subjectFilter}` } : null,
    niveauFilter ? { key: "niveau", label: `Niveau: ${niveauFilter}` } : null,
    anneeFilter ? { key: "annee", label: `Année: ${anneeFilter}` } : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  const hasActiveFilters = activeFilterChips.length > 0;
  const resetFilters = () => {
    setQuery("");
    setSubjectFilter("");
    setNiveauFilter("");
    setAnneeFilter("");
  };

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">
            {activeTab === "calendar" ? t("studentPages.calendarTitle") : t("studentPages.mySessionsTitle")}
          </h1>
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
            <p className="dashboard-muted">
              {activeTab === "calendar" ? t("studentPages.calendarTitle") : t("studentPages.mySessionsTitle")}
            </p>
          </div>
          <div className="sessions-tabs" role="tablist" aria-label="Navigation sessions">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "calendar"}
              className={`sessions-tab${activeTab === "calendar" ? " is-active" : ""}`}
              onClick={() => switchTab("calendar")}
            >
              {t("studentPages.calendarTitle")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "my-sessions"}
              className={`sessions-tab${activeTab === "my-sessions" ? " is-active" : ""}`}
              onClick={() => switchTab("my-sessions")}
            >
              {t("studentPages.mySessionsTitle")}
            </button>
          </div>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        {activeTab === "calendar" ? (
          <div className="student-sessions-stack">
            <div className="dashboard-card">
              <h2>Filtres</h2>
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
              <FilterActionsBar
                chips={activeFilterChips}
                onReset={resetFilters}
                showReset={hasActiveFilters}
              />
            </div>

            <div className="dashboard-card">
              <h2>{t("studentPages.todaySessions")}</h2>
              <table className="dashboard-table dashboard-table--mobile-hide">
                <thead>
                  <tr>
                    <th>{t("studentPages.tableSession")}</th>
                    <th>{t("studentPages.tableDate")}</th>
                    <th>{levelYearLabel}</th>
                    <th>{t("studentPages.tableAccess")}</th>
                    <th>{t("studentPages.tableStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySessions.length ? (
                    todaySessions.map(({ session, sessionId, isEnrolled, accessState }) => (
                      <tr key={sessionId}>
                        <td>
                          <div>
                            <strong>{session.title}</strong>
                            {(session.teacherName || session.teacherSubject) ? (
                              <p>
                                {session.teacherName ? `Prof: ${session.teacherName}` : "Prof"}
                                {session.teacherSubject ? (
                                  <>
                                    {" "}
                                    <span className="session-subject-badge">{session.teacherSubject}</span>
                                  </>
                                ) : null}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td>{new Date(session.scheduledAt).toLocaleString(dateLocale)}</td>
                        <td>{[session.niveau, session.annee].filter(Boolean).join(" • ") || "-"}</td>
                        <td>
                          <CalendarAccessAction
                            accessState={accessState}
                            isBusy={isJoiningSessionId === sessionId}
                            onJoin={() => void join(sessionId)}
                            onEnroll={() => void enroll(sessionId, { sessionFullMessage: t("studentPages.sessionFull") })}
                            t={t}
                          />
                        </td>
                        <td>{isEnrolled ? t("studentPages.statusAccepted") : t("studentPages.statusNotEnrolled")}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>{t("studentPages.noTodaySessions")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="mobile-cards mobile-cards--spaced">
                {todaySessions.length ? (
                  todaySessions.map(({ session, sessionId, isEnrolled, accessState }) => (
                    <article key={sessionId} className="mobile-card">
                      <div className="mobile-card__header">
                        <strong>{session.title}</strong>
                        <span className="status">
                          {isEnrolled ? t("studentPages.statusAccepted") : t("studentPages.statusNotEnrolled")}
                        </span>
                      </div>
                      {(session.teacherName || session.teacherSubject) ? (
                        <div className="mobile-card__row">
                          <span className="mobile-card__label">Prof</span>
                          <span>
                            {session.teacherName || "-"}
                            {session.teacherSubject ? (
                              <>
                                {" "}
                                <span className="session-subject-badge">{session.teacherSubject}</span>
                              </>
                            ) : null}
                          </span>
                        </div>
                      ) : null}
                      <div className="mobile-card__row">
                        <span className="mobile-card__label">{t("studentPages.tableDate")}</span>
                        <span>{new Date(session.scheduledAt).toLocaleString(dateLocale)}</span>
                      </div>
                      <div className="mobile-card__row">
                        <span className="mobile-card__label">{levelYearLabel}</span>
                        <span>{[session.niveau, session.annee].filter(Boolean).join(" • ") || "-"}</span>
                      </div>
                      <div className="mobile-card__actions">
                        <CalendarAccessAction
                          accessState={accessState}
                          isBusy={isJoiningSessionId === sessionId}
                          onJoin={() => void join(sessionId)}
                          onEnroll={() => void enroll(sessionId, { sessionFullMessage: t("studentPages.sessionFull") })}
                          t={t}
                        />
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="mobile-card mobile-card--empty">{t("studentPages.noTodaySessions")}</div>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <h2>{t("studentPages.upcomingSessions")}</h2>
              <table className="dashboard-table dashboard-table--mobile-hide">
                <thead>
                  <tr>
                    <th>{t("studentPages.tableSession")}</th>
                    <th>{t("studentPages.tableDate")}</th>
                    <th>{levelYearLabel}</th>
                    <th>{t("studentPages.tableAccess")}</th>
                    <th>{t("studentPages.tableStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingCalendarSessions.length ? (
                    upcomingCalendarSessions.map(({ session, sessionId, isEnrolled, accessState }) => (
                      <tr key={sessionId}>
                        <td>
                          <div>
                            <strong>{session.title}</strong>
                            {(session.teacherName || session.teacherSubject) ? (
                              <p>
                                {session.teacherName ? `Prof: ${session.teacherName}` : "Prof"}
                                {session.teacherSubject ? (
                                  <>
                                    {" "}
                                    <span className="session-subject-badge">{session.teacherSubject}</span>
                                  </>
                                ) : null}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td>{new Date(session.scheduledAt).toLocaleString(dateLocale)}</td>
                        <td>{[session.niveau, session.annee].filter(Boolean).join(" • ") || "-"}</td>
                        <td>
                          <CalendarAccessAction
                            accessState={accessState}
                            isBusy={isJoiningSessionId === sessionId}
                            onJoin={() => void join(sessionId)}
                            onEnroll={() => void enroll(sessionId, { sessionFullMessage: t("studentPages.sessionFull") })}
                            t={t}
                          />
                        </td>
                        <td>{isEnrolled ? t("studentPages.statusAccepted") : t("studentPages.statusNotEnrolled")}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>{t("studentPages.noUpcomingSessions")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="mobile-cards mobile-cards--spaced">
                {upcomingCalendarSessions.length ? (
                  upcomingCalendarSessions.map(({ session, sessionId, isEnrolled, accessState }) => (
                    <article key={sessionId} className="mobile-card">
                      <div className="mobile-card__header">
                        <strong>{session.title}</strong>
                        <span className="status">
                          {isEnrolled ? t("studentPages.statusAccepted") : t("studentPages.statusNotEnrolled")}
                        </span>
                      </div>
                      {(session.teacherName || session.teacherSubject) ? (
                        <div className="mobile-card__row">
                          <span className="mobile-card__label">Prof</span>
                          <span>
                            {session.teacherName || "-"}
                            {session.teacherSubject ? (
                              <>
                                {" "}
                                <span className="session-subject-badge">{session.teacherSubject}</span>
                              </>
                            ) : null}
                          </span>
                        </div>
                      ) : null}
                      <div className="mobile-card__row">
                        <span className="mobile-card__label">{t("studentPages.tableDate")}</span>
                        <span>{new Date(session.scheduledAt).toLocaleString(dateLocale)}</span>
                      </div>
                      <div className="mobile-card__row">
                        <span className="mobile-card__label">{levelYearLabel}</span>
                        <span>{[session.niveau, session.annee].filter(Boolean).join(" • ") || "-"}</span>
                      </div>
                      <div className="mobile-card__actions">
                        <CalendarAccessAction
                          accessState={accessState}
                          isBusy={isJoiningSessionId === sessionId}
                          onJoin={() => void join(sessionId)}
                          onEnroll={() => void enroll(sessionId, { sessionFullMessage: t("studentPages.sessionFull") })}
                          t={t}
                        />
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="mobile-card mobile-card--empty">{t("studentPages.noUpcomingSessions")}</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="student-sessions-stack">
            <div className="dashboard-card">
              <h2>Filtres</h2>
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
              <FilterActionsBar
                chips={activeFilterChips}
                onReset={resetFilters}
                showReset={hasActiveFilters}
              />
            </div>

            <div className="dashboard-card">
              <h2>{t("studentPages.upcomingSessions")}</h2>
              {myUpcomingSessions.length ? (
                <div className="dashboard-list">
                  {myUpcomingSessions.map(({ session, sessionId, timing, accessState }) => (
                    <div key={sessionId} className="dashboard-row">
                      <div>
                        <strong>{session.title}</strong>
                        <p>{new Date(session.scheduledAt).toLocaleString(dateLocale)}</p>
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
                        <MySessionsAction
                          accessState={accessState}
                          isBusy={isJoiningSessionId === sessionId}
                          onJoin={() => void join(sessionId)}
                          onUnenroll={() => void unenroll(sessionId)}
                          t={t}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">{t("studentPages.noUpcomingSessions")}</div>
              )}
            </div>

            <div className="dashboard-card">
              <h2>{t("studentPages.pastSessions")}</h2>
              {myPastSessions.length ? (
                <div className="dashboard-list">
                  {myPastSessions.map(({ session, sessionId }) => (
                    <div key={sessionId} className="dashboard-row">
                      <div>
                        <strong>{session.title}</strong>
                        <p>{new Date(session.scheduledAt).toLocaleString(dateLocale)}</p>
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
                  ))}
                </div>
              ) : (
                <div className="empty-state">{t("studentPages.noPastSessions")}</div>
              )}
            </div>
          </div>
        )}
      </section>
    </StudentDashboardLayout>
  );
}

function FilterActionsBar({
  chips,
  onReset,
  showReset,
}: {
  chips: Array<{ key: string; label: string }>;
  onReset: () => void;
  showReset: boolean;
}) {
  return (
    <div className="sessions-filters-footer">
      <div className="sessions-filters-chips" aria-live="polite">
        {chips.length ? (
          chips.map((chip) => (
            <span key={chip.key} className="sessions-filter-chip">
              {chip.label}
            </span>
          ))
        ) : (
          <span className="sessions-filter-chip sessions-filter-chip--muted">Aucun filtre actif</span>
        )}
      </div>
      {showReset ? (
        <button type="button" className="btn btn-ghost sessions-filters-reset" onClick={onReset}>
          Réinitialiser les filtres
        </button>
      ) : null}
    </div>
  );
}

function normalizeSessionSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesSessionFilters(
  session: {
    title: string;
    teacherName?: string;
    teacherSubject?: string;
    niveau?: string;
    annee?: string;
  },
  filters: {
    query: string;
    subjectFilter: string;
    niveauFilter: string;
    anneeFilter: string;
  },
) {
  const { query, subjectFilter, niveauFilter, anneeFilter } = filters;
  const matchesQuery = query.trim()
    ? normalizeSessionSearch([session.title, session.teacherName, session.teacherSubject].filter(Boolean).join(" ")).includes(
        normalizeSessionSearch(query),
      )
    : true;
  const matchesSubject = subjectFilter ? session.teacherSubject === subjectFilter : true;
  const matchesNiveau = niveauFilter ? session.niveau === niveauFilter : true;
  const matchesAnnee = anneeFilter ? session.annee === anneeFilter : true;
  return matchesQuery && matchesSubject && matchesNiveau && matchesAnnee;
}

function CalendarAccessAction({
  accessState,
  isBusy,
  onJoin,
  onEnroll,
  t,
}: {
  accessState: StudentSessionAccessState;
  isBusy: boolean;
  onJoin: () => void;
  onEnroll: () => void;
  t: (key: string) => string;
}) {
  if (accessState === "full") return <span className="status">{t("studentPages.sessionFull")}</span>;
  if (accessState === "cancelled" || accessState === "ended") {
    return <span className="status">{t("studentDashboard.status.terminee")}</span>;
  }
  if (accessState === "join_now" || accessState === "open") {
    return (
      <button className="secondary-button" type="button" onClick={onJoin} disabled={isBusy}>
        {isBusy ? t("studentPages.loading") : accessState === "join_now" ? t("studentPages.join") : t("studentPages.open")}
      </button>
    );
  }
  if (accessState === "enroll") {
    return (
      <button className="secondary-button" type="button" onClick={onEnroll}>
        {t("studentPages.enroll")}
      </button>
    );
  }
  return <span className="status">{t("studentPages.statusAccepted")}</span>;
}

function MySessionsAction({
  accessState,
  isBusy,
  onJoin,
  onUnenroll,
  t,
}: {
  accessState: StudentSessionAccessState;
  isBusy: boolean;
  onJoin: () => void;
  onUnenroll: () => void;
  t: (key: string) => string;
}) {
  if (accessState === "join_now" || accessState === "open") {
    return (
      <button className="btn btn-primary" type="button" onClick={onJoin} disabled={isBusy}>
        {isBusy ? t("studentPages.loading") : accessState === "join_now" ? t("studentPages.join") : t("studentPages.open")}
      </button>
    );
  }
  if (accessState === "enrolled_wait") {
    return (
      <button className="btn btn-ghost" type="button" onClick={onUnenroll}>
        {t("studentPages.unenroll")}
      </button>
    );
  }
  if (accessState === "cancelled" || accessState === "ended") {
    return <span className="status">{t("studentPages.completed")}</span>;
  }
  return (
    <button className="btn btn-ghost" type="button" onClick={onUnenroll}>
      {t("studentPages.unenroll")}
    </button>
  );
}
