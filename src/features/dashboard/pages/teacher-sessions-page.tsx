import { Fragment, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiDelete, apiGet, apiPatch, apiPost } from "../../../services/api-client";
import { studentAnneeOptions, studentNiveauOptions } from "../../profile/profile-options";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string } };
};

type Session = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  placesMax: number;
  niveau?: string;
  annee?: string;
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

type Participant = {
  id: string;
  nom?: string;
  email?: string;
};

type SessionEditForm = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  placesMax: number;
  niveau: string;
  annee: string;
};

export function TeacherSessionsPage() {
  const { auth } = useOutletContext<AuthContext>();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionQuery, setSessionQuery] = useState("");
  const [filterNiveau, setFilterNiveau] = useState("");
  const [filterAnnee, setFilterAnnee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [placesMax, setPlacesMax] = useState(50);
  const [niveau, setNiveau] = useState("");
  const [annee, setAnnee] = useState("");
  const [error, setError] = useState<{ message: string; details?: unknown } | null>(null);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceEntry[] | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceSectionFlash, setAttendanceSectionFlash] = useState(false);
  const attendanceSectionRef = useRef<HTMLDivElement | null>(null);
  const [participantsBySession, setParticipantsBySession] = useState<Record<string, Participant[]>>({});
  const [participantsLoading, setParticipantsLoading] = useState<Record<string, boolean>>({});
  const [participantsError, setParticipantsError] = useState<Record<string, string>>({});
  const [emailSubjectBySession, setEmailSubjectBySession] = useState<Record<string, string>>({});
  const [emailMessageBySession, setEmailMessageBySession] = useState<Record<string, string>>({});
  const [emailStatusBySession, setEmailStatusBySession] = useState<Record<string, string>>({});
  const [sessionActionStatus, setSessionActionStatus] = useState<string | null>(null);
  const [sessionEditForm, setSessionEditForm] = useState<SessionEditForm | null>(null);
  const [sessionEditSaving, setSessionEditSaving] = useState(false);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(true);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  useEffect(() => {
    refreshSessions();
  }, [auth.user.id, auth.user.role]);

  useEffect(() => {
    if (!attendanceSessionId) return;
    setAttendanceSectionFlash(true);
    const timeoutId = window.setTimeout(() => {
      setAttendanceSectionFlash(false);
    }, 1200);

    const rafId = window.requestAnimationFrame(() => {
      attendanceSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(rafId);
    };
  }, [attendanceSessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 900px)");
    const syncPanels = () => {
      const shouldCollapse = media.matches;
      setIsCreatePanelOpen(!shouldCollapse);
      setIsFilterPanelOpen(!shouldCollapse);
    };
    syncPanels();
    media.addEventListener("change", syncPanels);
    return () => media.removeEventListener("change", syncPanels);
  }, []);

  const niveauOptions = Array.from(new Set(sessions.map((s) => s.niveau).filter(Boolean) as string[])).sort();
  const anneeOptions = Array.from(new Set(sessions.map((s) => s.annee).filter(Boolean) as string[])).sort();
  const activeAttendanceSession = attendanceSessionId ? sessions.find((session) => session.id === attendanceSessionId) : null;
  const filteredSessions = sessions.filter((session) => {
    const matchesQuery = sessionQuery.trim()
      ? normalizeFilterText(session.title).includes(normalizeFilterText(sessionQuery))
      : true;
    const matchesNiveau = filterNiveau ? session.niveau === filterNiveau : true;
    const matchesAnnee = filterAnnee ? session.annee === filterAnnee : true;
    const matchesStatus = filterStatus ? session.status === filterStatus : true;
    return matchesQuery && matchesNiveau && matchesAnnee && matchesStatus;
  });

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
        niveau: niveau || undefined,
        annee: annee || undefined,
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
    setNiveau("");
    setAnnee("");
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
    if (attendanceSessionId === sessionId) {
      setAttendanceSessionId(null);
      setAttendance(null);
      setAttendanceError(null);
      return;
    }
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

  const closeAttendancePanel = () => {
    setAttendanceSessionId(null);
    setAttendance(null);
    setAttendanceError(null);
  };

  const loadParticipants = async (sessionId: string) => {
    if (participantsBySession[sessionId] || participantsLoading[sessionId]) return;
    setParticipantsLoading((prev) => ({ ...prev, [sessionId]: true }));
    setParticipantsError((prev) => ({ ...prev, [sessionId]: "" }));
    const response = await apiGet<Participant[]>(`/sessions/${sessionId}/participants`);
    if (response.error) {
      setParticipantsError((prev) => ({ ...prev, [sessionId]: response.error!.message }));
      setParticipantsLoading((prev) => ({ ...prev, [sessionId]: false }));
      return;
    }
    setParticipantsBySession((prev) => ({ ...prev, [sessionId]: response.data as Participant[] }));
    setParticipantsLoading((prev) => ({ ...prev, [sessionId]: false }));
  };

  const handleSendEmail = async (sessionId: string) => {
    const subject = emailSubjectBySession[sessionId]?.trim() ?? "";
    const message = emailMessageBySession[sessionId]?.trim() ?? "";
    if (!subject || !message) {
      setEmailStatusBySession((prev) => ({ ...prev, [sessionId]: t("teacherPages.emailMissing") }));
      return;
    }
    setEmailStatusBySession((prev) => ({ ...prev, [sessionId]: "" }));
    const response = await apiPost<{ sent: number; skipped: number }>(
      `/sessions/${sessionId}/participants/email`,
      { subject, message },
    );
    if (response.error) {
      setEmailStatusBySession((prev) => ({ ...prev, [sessionId]: response.error!.message }));
      return;
    }
    const result = response.data as { sent: number; skipped: number };
    setEmailStatusBySession((prev) => ({
      ...prev,
      [sessionId]: t("teacherPages.emailSent", { sent: result.sent, skipped: result.skipped }),
    }));
  };

  const handleEditSession = (session: Session) => {
    setError(null);
    setSessionActionStatus(null);
    setSessionEditForm({
      id: session.id,
      title: session.title,
      scheduledAt: toDatetimeLocalInputValue(session.scheduledAt),
      durationMinutes: session.durationMinutes,
      placesMax: session.placesMax,
      niveau: session.niveau ?? "",
      annee: session.annee ?? "",
    });
  };

  const submitSessionEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionEditForm) return;
    setSessionEditSaving(true);
    const response = await apiPatch<Session>(`/sessions/${sessionEditForm.id}`, {
      title: sessionEditForm.title.trim(),
      scheduledAt: toLocalIsoWithOffset(sessionEditForm.scheduledAt),
      durationMinutes: Number(sessionEditForm.durationMinutes),
      placesMax: Number(sessionEditForm.placesMax),
      niveau: sessionEditForm.niveau || undefined,
      annee: sessionEditForm.annee || undefined,
    });
    setSessionEditSaving(false);
    if (response.error) {
      setError({ message: response.error.message, details: response.error.details });
      return;
    }
    setSessionEditForm(null);
    setSessionActionStatus("Session mise à jour.");
    refreshSessions();
  };

  const handleDeleteSession = async (session: Session) => {
    setError(null);
    setSessionActionStatus(null);
    const confirmed = window.confirm(`Supprimer la session "${session.title}" ?`);
    if (!confirmed) return;
    const response = await apiDelete<{ deleted: true }>(`/sessions/${session.id}`);
    if (response.error) {
      setError({ message: response.error.message, details: response.error.details });
      return;
    }
    setSessionActionStatus("Session supprimée.");
    refreshSessions();
  };

  return (
    <section className="dashboard-section">
      <h1>{t("teacherPages.sessionsTitle")}</h1>
      <div className="dashboard-card">
        <div className="sessions-panel-header">
          <h2>{t("teacherPages.scheduleTitle")}</h2>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setIsCreatePanelOpen((prev) => !prev)}
            aria-expanded={isCreatePanelOpen}
          >
            {isCreatePanelOpen ? "Masquer" : "Afficher"}
          </button>
        </div>
        {isCreatePanelOpen ? (
        <form className="content-form sessions-create-form" onSubmit={handleSubmit}>
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
          <label>
            Niveau
            <select
              value={niveau}
              onChange={(event) => setNiveau(event.target.value)}
            >
              <option value="">Sélectionner un niveau</option>
              {studentNiveauOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Année
            <select
              value={annee}
              onChange={(event) => setAnnee(event.target.value)}
            >
              <option value="">Sélectionner une année</option>
              {studentAnneeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
        ) : null}
      </div>
      <div className="dashboard-card">
        <h2>{t("teacherPages.sessionTableTitle")}</h2>
        {sessionActionStatus ? <div className="form-success">{sessionActionStatus}</div> : null}
        <div className="sessions-panel-header sessions-panel-header--filters">
          <h3>Filtres</h3>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            aria-expanded={isFilterPanelOpen}
          >
            {isFilterPanelOpen ? "Masquer" : "Afficher"}
          </button>
        </div>
        {isFilterPanelOpen ? (
          <div className="content-form sessions-filters-form" style={{ marginBottom: 12 }}>
            <label>
              Recherche
              <input
                value={sessionQuery}
                onChange={(event) => setSessionQuery(event.target.value)}
                placeholder="Titre de session"
              />
            </label>
            <label>
              Niveau
              <select value={filterNiveau} onChange={(event) => setFilterNiveau(event.target.value)}>
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
              <select value={filterAnnee} onChange={(event) => setFilterAnnee(event.target.value)}>
                <option value="">Toutes</option>
                {anneeOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Statut
              <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                <option value="">Tous</option>
                <option value="ouvert">Ouvert</option>
                <option value="complet">Complet</option>
                <option value="annulee">Annulée</option>
                <option value="terminee">Terminée</option>
              </select>
            </label>
          </div>
        ) : null}
        <div className="teacher-sessions-table-wrap">
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>{t("teacherPages.title")}</th>
              <th>{t("teacherPages.dateTime")}</th>
              <th>{t("teacherPages.durationMinutes")}</th>
              <th>{t("teacherPages.maxParticipants")}</th>
              <th>Niveau</th>
              <th>Année</th>
              <th>{t("teacherPages.start")}</th>
              <th>{t("teacherPages.statusLabel")}</th>
              <th>{t("teacherPages.attendance")}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.length ? (
              filteredSessions.map((session) => (
                <Fragment key={session.id}>
                <tr>
                  {(() => {
                    const timing = getTiming(session);
                    const canStart = Boolean(session.zoomStartUrl);
                    return (
                      <>
                  <td>{session.title}</td>
                  <td>{new Date(session.scheduledAt).toLocaleString("fr-FR")}</td>
                  <td>{session.durationMinutes} min</td>
                  <td>{session.placesMax}</td>
                  <td>{session.niveau || "-"}</td>
                  <td>{session.annee || "-"}</td>
                  <td>
                    {canStart ? (
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => openJitsiMeetingPreferApp(session.zoomStartUrl!)}
                      >
                        {t("teacherPages.start")}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{session.status}</td>
                  <td>
                    {timing.isPast ? (
                      <button className="btn btn-ghost" type="button" onClick={() => handleAttendance(session.id)}>
                        {attendanceSessionId === session.id ? "Masquer présence" : t("teacherPages.attendance")}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <div className="row-actions teacher-sessions-actions">
                      <button className="btn btn-ghost" type="button" onClick={() => handleEditSession(session)}>
                        Modifier
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={() => handleDeleteSession(session)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td colSpan={10}>
                    <details onToggle={(event) => {
                      if ((event.target as HTMLDetailsElement).open) {
                        loadParticipants(session.id);
                      }
                    }}>
                      <summary>{t("teacherPages.participants")}</summary>
                      {participantsError[session.id] ? (
                        <div className="form-error">{participantsError[session.id]}</div>
                      ) : participantsLoading[session.id] ? (
                        <div className="empty-state">{t("teacherPages.loadingParticipants")}</div>
                      ) : (
                        <>
                          <div className="dashboard-list">
                            {(participantsBySession[session.id] ?? []).length ? (
                              (participantsBySession[session.id] ?? []).map((participant) => (
                                <div key={participant.id} className="dashboard-row">
                                  <div>
                                    <strong>{participant.nom ?? participant.id}</strong>
                                    <p>{participant.email ?? "-"}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="empty-state">{t("teacherPages.noParticipants")}</div>
                            )}
                          </div>
                          <div className="content-form">
                            <label>
                              {t("teacherPages.emailSubject")}
                              <input
                                value={emailSubjectBySession[session.id] ?? ""}
                                onChange={(event) =>
                                  setEmailSubjectBySession((prev) => ({
                                    ...prev,
                                    [session.id]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label>
                              {t("teacherPages.emailMessage")}
                              <textarea
                                value={emailMessageBySession[session.id] ?? ""}
                                onChange={(event) =>
                                  setEmailMessageBySession((prev) => ({
                                    ...prev,
                                    [session.id]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <button className="btn btn-primary" type="button" onClick={() => handleSendEmail(session.id)}>
                              {t("teacherPages.emailSend")}
                            </button>
                            {emailStatusBySession[session.id] ? (
                              <div className="form-success">{emailStatusBySession[session.id]}</div>
                            ) : null}
                          </div>
                        </>
                      )}
                    </details>
                  </td>
                </tr>
                </Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={10}>Aucune session pour ces filtres.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <div className="mobile-cards mobile-cards--spaced teacher-sessions-mobile-list">
          {filteredSessions.length ? (
            filteredSessions.map((session) => (
              <article key={session.id} className="mobile-card">
                {(() => {
                  const timing = getTiming(session);
                    const canStart = Boolean(session.zoomStartUrl);
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
                <div className="mobile-card__row">
                  <span className="mobile-card__label">Niveau</span>
                  <span>{session.niveau || "-"}</span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">Année</span>
                  <span>{session.annee || "-"}</span>
                </div>
                <div className="mobile-card__actions">
                  {canStart ? (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => openJitsiMeetingPreferApp(session.zoomStartUrl!)}
                    >
                      {t("teacherPages.start")}
                    </button>
                  ) : null}
                  {timing.isPast ? (
                    <button className="secondary-button" type="button" onClick={() => handleAttendance(session.id)}>
                      {attendanceSessionId === session.id ? "Masquer présence" : t("teacherPages.attendance")}
                    </button>
                  ) : null}
                  <button className="secondary-button" type="button" onClick={() => handleEditSession(session)}>
                    Modifier
                  </button>
                  <button className="secondary-button" type="button" onClick={() => handleDeleteSession(session)}>
                    Supprimer
                  </button>
                </div>
                <details
                  className="mobile-card__details"
                  onToggle={(event) => {
                    if ((event.target as HTMLDetailsElement).open) {
                      loadParticipants(session.id);
                    }
                  }}
                >
                  <summary>{t("teacherPages.participants")}</summary>
                  {participantsError[session.id] ? (
                    <div className="form-error">{participantsError[session.id]}</div>
                  ) : participantsLoading[session.id] ? (
                    <div className="empty-state">{t("teacherPages.loadingParticipants")}</div>
                  ) : (
                    <>
                      <div className="dashboard-list">
                        {(participantsBySession[session.id] ?? []).length ? (
                          (participantsBySession[session.id] ?? []).map((participant) => (
                            <div key={participant.id} className="dashboard-row">
                              <div>
                                <strong>{participant.nom ?? participant.id}</strong>
                                <p>{participant.email ?? "-"}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">{t("teacherPages.noParticipants")}</div>
                        )}
                      </div>
                    </>
                  )}
                </details>
                <details className="mobile-card__details">
                  <summary>{t("teacherPages.emailSend")}</summary>
                  <div className="content-form">
                    <label>
                      {t("teacherPages.emailSubject")}
                      <input
                        value={emailSubjectBySession[session.id] ?? ""}
                        onChange={(event) =>
                          setEmailSubjectBySession((prev) => ({
                            ...prev,
                            [session.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      {t("teacherPages.emailMessage")}
                      <textarea
                        value={emailMessageBySession[session.id] ?? ""}
                        onChange={(event) =>
                          setEmailMessageBySession((prev) => ({
                            ...prev,
                            [session.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <button className="btn btn-primary" type="button" onClick={() => handleSendEmail(session.id)}>
                      {t("teacherPages.emailSend")}
                    </button>
                    {emailStatusBySession[session.id] ? (
                      <div className="form-success">{emailStatusBySession[session.id]}</div>
                    ) : null}
                  </div>
                </details>
                    </>
                  );
                })()}
              </article>
            ))
          ) : (
            <div className="mobile-card mobile-card--empty">Aucune session pour ces filtres.</div>
          )}
        </div>
        {attendanceSessionId ? (
          <div
            ref={attendanceSectionRef}
            className={`dashboard-card teacher-sessions-attendance${attendanceSectionFlash ? " teacher-sessions-attendance--flash" : ""}`}
          >
            <div className="sessions-panel-header sessions-panel-header--filters">
              <h3>{t("teacherPages.attendanceTitle")}</h3>
              <button className="btn btn-ghost" type="button" onClick={closeAttendancePanel}>
                Masquer
              </button>
            </div>
            <div className="teacher-sessions-attendance__hint">
              {attendanceSessionId
                ? `Liste affichée pour: ${activeAttendanceSession?.title ?? attendanceSessionId}`
                : ""}
            </div>
            {attendanceError ? <div className="form-error">{attendanceError}</div> : null}
            {attendance ? (
              <>
                <table className="dashboard-table dashboard-table--mobile-hide">
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

                <div className="mobile-cards mobile-cards--spaced teacher-sessions-mobile-list">
                  {attendance.length ? (
                    attendance.map((entry) => (
                      <article key={`${attendanceSessionId}-mobile-${entry.student.id}`} className="mobile-card">
                        <div className="mobile-card__header">
                          <strong>{entry.student.nom ?? entry.student.id}</strong>
                          <span className={`status ${entry.present ? "live" : ""}`}>
                            {entry.present ? t("teacherPages.presentYes") : t("teacherPages.presentNo")}
                          </span>
                        </div>
                        <div className="mobile-card__meta">{entry.student.email ?? "-"}</div>
                        <div className="mobile-card__row">
                          <span className="mobile-card__label">{t("teacherPages.duration")}</span>
                          <span>{entry.durationMinutes} min</span>
                        </div>
                        {(entry.joinTime || entry.leaveTime) ? (
                          <div className="mobile-card__meta">
                            {entry.joinTime ? `Join: ${new Date(entry.joinTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                            {entry.joinTime && entry.leaveTime ? " • " : ""}
                            {entry.leaveTime ? `Leave: ${new Date(entry.leaveTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                          </div>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <div className="mobile-card mobile-card--empty">{t("teacherPages.attendanceEmpty")}</div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">{t("teacherPages.attendanceEmpty")}</div>
            )}
          </div>
        ) : null}
      </div>
      {sessionEditForm ? (
        <div className="crud-modal" role="dialog" aria-modal="true" aria-label="Modifier la session">
          <button
            className="crud-modal__overlay"
            type="button"
            onClick={() => (sessionEditSaving ? null : setSessionEditForm(null))}
            aria-label="Fermer"
          />
          <div className="crud-modal__content">
            <div className="crud-modal__header">
              <h3>Modifier la session</h3>
            </div>
            <form className="content-form" onSubmit={submitSessionEdit}>
              <label>
                Titre
                <input
                  value={sessionEditForm.title}
                  onChange={(event) =>
                    setSessionEditForm((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                  required
                />
              </label>
              <label>
                Date / heure
                <input
                  type="datetime-local"
                  value={sessionEditForm.scheduledAt}
                  onChange={(event) =>
                    setSessionEditForm((prev) => (prev ? { ...prev, scheduledAt: event.target.value } : prev))
                  }
                  required
                />
              </label>
              <label>
                Durée (minutes)
                <input
                  type="number"
                  min={15}
                  max={240}
                  value={sessionEditForm.durationMinutes}
                  onChange={(event) =>
                    setSessionEditForm((prev) =>
                      prev ? { ...prev, durationMinutes: Number(event.target.value) } : prev,
                    )
                  }
                  required
                />
              </label>
              <label>
                Places max
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={sessionEditForm.placesMax}
                  onChange={(event) =>
                    setSessionEditForm((prev) =>
                      prev ? { ...prev, placesMax: Number(event.target.value) } : prev,
                    )
                  }
                  required
                />
              </label>
              <label>
                Niveau
                <select
                  value={sessionEditForm.niveau}
                  onChange={(event) =>
                    setSessionEditForm((prev) => (prev ? { ...prev, niveau: event.target.value } : prev))
                  }
                >
                  <option value="">Sélectionner un niveau</option>
                  {studentNiveauOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Année
                <select
                  value={sessionEditForm.annee}
                  onChange={(event) =>
                    setSessionEditForm((prev) => (prev ? { ...prev, annee: event.target.value } : prev))
                  }
                >
                  <option value="">Sélectionner une année</option>
                  {studentAnneeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="crud-modal__actions">
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setSessionEditForm(null)}
                  disabled={sessionEditSaving}
                >
                  Annuler
                </button>
                <button className="btn btn-primary" type="submit" disabled={sessionEditSaving}>
                  {sessionEditSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function toLocalIsoWithOffset(value: string) {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    return value;
  }
  const [inputYear, inputMonth, inputDay] = datePart.split("-").map((part) => Number(part));
  const [inputHour, inputMinute] = timePart.split(":").map((part) => Number(part));
  if (
    !inputYear ||
    !inputMonth ||
    !inputDay ||
    Number.isNaN(inputHour) ||
    Number.isNaN(inputMinute)
  ) {
    return value;
  }
  const date = new Date(inputYear, inputMonth - 1, inputDay, inputHour, inputMinute, 0);
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

function toDatetimeLocalInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeFilterText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function openJitsiMeetingPreferApp(meetingUrl: string) {
  if (typeof window === "undefined") return;

  if (!isMobileOrTabletDevice()) {
    window.open(meetingUrl, "_blank", "noopener,noreferrer");
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(meetingUrl);
  } catch {
    window.location.assign(meetingUrl);
    return;
  }

  const platform = getMobilePlatform();
  if (platform === "ios") {
    const shouldOpenApp = window.confirm("Ouvrir dans l'app Jitsi ?");
    if (!shouldOpenApp) {
      window.location.assign(meetingUrl);
      return;
    }
    const appUrl = buildIosJitsiSchemeUrl(parsedUrl);
    openWithFallbackToWeb(appUrl, meetingUrl);
    return;
  }

  const appUrl =
    platform === "android"
      ? buildAndroidJitsiIntentUrl(parsedUrl, meetingUrl)
      : meetingUrl;
  openWithFallbackToWeb(appUrl, meetingUrl);
}

function buildAndroidJitsiIntentUrl(parsedUrl: URL, fallbackUrl: string) {
  const path = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  const safeFallbackUrl = encodeURIComponent(fallbackUrl);
  return `intent://${parsedUrl.host}${path}#Intent;scheme=https;package=org.jitsi.meet;S.browser_fallback_url=${safeFallbackUrl};end`;
}

function buildIosJitsiSchemeUrl(parsedUrl: URL) {
  const path = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  return `org.jitsi.meet://${parsedUrl.host}${path}`;
}

function openWithFallbackToWeb(appUrl: string, fallbackUrl: string) {
  let fallbackTriggered = false;

  const fallbackToWeb = () => {
    if (fallbackTriggered) return;
    fallbackTriggered = true;
    cleanup();
    window.location.assign(fallbackUrl);
  };

  const cancelFallback = () => {
    cleanup();
  };

  const timer = window.setTimeout(fallbackToWeb, 1400);

  const onVisibilityChange = () => {
    if (document.hidden) {
      cancelFallback();
    }
  };

  const cleanup = () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", cancelFallback);
    window.removeEventListener("blur", cancelFallback);
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", cancelFallback, { once: true });
  window.addEventListener("blur", cancelFallback, { once: true });
  window.location.assign(appUrl);
}

function isMobileOrTabletDevice() {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const isMobileUa = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const isIpadDesktopMode =
    navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;

  return isMobileUa || isIpadDesktopMode;
}

function getMobilePlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const userAgent = navigator.userAgent || "";
  if (/Android/i.test(userAgent)) return "android";
  const isIosUa = /iPhone|iPad|iPod/i.test(userAgent);
  const isIpadDesktopMode =
    navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  if (isIosUa || isIpadDesktopMode) return "ios";
  return "other";
}
