import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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
  placesMax: number;
  enrolledStudentIds?: string[];
  niveau?: string;
  annee?: string;
  status: "ouvert" | "complet" | "annulee" | "terminee";
};

export function StudentCalendarPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const dateLocale = isAr ? "ar-DZ" : "fr-FR";
  const levelYearLabel = isAr ? "المستوى / السنة" : "Niveau / Année";
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enrolledSessions, setEnrolledSessions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = `${t("studentPages.calendarTitle")} | Educonnect`;
  }, [i18n.language, t]);

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
    apiGet<Session[]>(`/sessions/students/${auth.user.id}/sessions`).then((response) => {
      if (response.data) {
        const ids = (response.data as Session[])
          .map((session) => session.id ?? session._id)
          .filter((id): id is string => Boolean(id));
        setEnrolledSessions(new Set(ids));
      }
    });
  }, [auth]);

  const acceptedCount = (session: Session) => session.enrolledStudentIds?.length ?? 0;
  const isSessionFull = (session: Session) =>
    session.status === "complet" || acceptedCount(session) >= session.placesMax;
  const getSessionId = (session: Session) => session.id ?? session._id ?? "";
  const isSameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  const now = new Date();
  const { todaySessions, upcomingSessions } = sessions.reduce(
    (acc, session) => {
      const start = new Date(session.scheduledAt);
      if (isSameDay(start, now)) {
        acc.todaySessions.push(session);
      } else if (start.getTime() > now.getTime()) {
        acc.upcomingSessions.push(session);
      }
      return acc;
    },
    { todaySessions: [] as Session[], upcomingSessions: [] as Session[] },
  );

  const handleEnroll = async (sessionId: string) => {
    const response = await apiPost<Session>(`/sessions/${sessionId}/enroll`, {});
    if (response.error) {
      setError(
        response.error.code === "SESSION_FULL"
          ? t("studentPages.sessionFull")
          : response.error.message,
      );
      return;
    }
    if (response.data) {
      setSessions((prev) => prev.map((item) => (item.id === sessionId ? (response.data as Session) : item)));
      setEnrolledSessions((prev) => {
        const next = new Set(prev);
        next.add(sessionId);
        return next;
      });
    }
  };

  const handleJoin = async (sessionId: string) => {
    const response = await apiGet<{ zoomJoinUrl: string }>(`/sessions/${sessionId}/join`);
    if (response.error) {
      setError(response.error.message);
      return;
    }
    if (response.data?.zoomJoinUrl) {
      openStudentMeetingPreferApp(response.data.zoomJoinUrl);
      return;
    }
  };

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">{t("studentPages.loginTitleCalendar")}</h1>
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
        <h1>{t("studentPages.calendarTitle")}</h1>
        <div className="dashboard-card">
          {error ? <div className="form-error">{error}</div> : null}
          <h2>{t("studentPages.todaySessions")}</h2>
          <table className="dashboard-table dashboard-table--mobile-hide">
            <thead>
              <tr>
                <th>{t("studentPages.tableSession")}</th>
                <th>{t("studentPages.tableDate")}</th>
                <th>Niveau / Année</th>
                <th>{t("studentPages.tableAccess")}</th>
                <th>{t("studentPages.tableStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {todaySessions.length ? (
                todaySessions.map((session) => {
                  const sessionId = getSessionId(session);
                  return (
                    <tr key={sessionId}>
                      <td>{session.title}</td>
                      <td>{new Date(session.scheduledAt).toLocaleString(dateLocale)}</td>
                      <td>{[session.niveau, session.annee].filter(Boolean).join(" • ") || "-"}</td>
                      <td>
                        {enrolledSessions.has(sessionId) ? (
                          <button className="secondary-button" type="button" onClick={() => handleJoin(sessionId)}>
                            {t("studentPages.open")}
                          </button>
                        ) : isSessionFull(session) ? (
                          <span className="status">{t("studentPages.sessionFull")}</span>
                        ) : (
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => handleEnroll(sessionId)}
                          >
                            {t("studentPages.enroll")}
                          </button>
                        )}
                      </td>
                      <td>
                        {enrolledSessions.has(sessionId)
                          ? t("studentPages.statusAccepted")
                          : t("studentPages.statusNotEnrolled")}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5}>{t("studentPages.noTodaySessions")}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mobile-cards mobile-cards--spaced">
            {todaySessions.length ? (
              todaySessions.map((session) => {
                const sessionId = getSessionId(session);
                return (
                  <article key={sessionId} className="mobile-card">
                    <div className="mobile-card__header">
                      <strong>{session.title}</strong>
                      <span className="status">
                        {enrolledSessions.has(sessionId)
                          ? t("studentPages.statusAccepted")
                          : t("studentPages.statusNotEnrolled")}
                      </span>
                    </div>
                    <div className="mobile-card__row">
                      <span className="mobile-card__label">{t("studentPages.tableDate")}</span>
                      <span>{new Date(session.scheduledAt).toLocaleString(dateLocale)}</span>
                    </div>
                    <div className="mobile-card__row">
                      <span className="mobile-card__label">{levelYearLabel}</span>
                      <span>{[session.niveau, session.annee].filter(Boolean).join(" • ") || "-"}</span>
                    </div>
                    <div className="mobile-card__actions">
                      {enrolledSessions.has(sessionId) ? (
                        <button className="secondary-button" type="button" onClick={() => handleJoin(sessionId)}>
                          {t("studentPages.open")}
                        </button>
                      ) : isSessionFull(session) ? (
                        <span className="status">{t("studentPages.sessionFull")}</span>
                      ) : (
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => handleEnroll(sessionId)}
                        >
                          {t("studentPages.enroll")}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
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
                <th>Niveau / Année</th>
                <th>{t("studentPages.tableAccess")}</th>
                <th>{t("studentPages.tableStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {upcomingSessions.length ? (
                upcomingSessions.map((session) => {
                  const sessionId = getSessionId(session);
                  return (
                    <tr key={sessionId}>
                      <td>{session.title}</td>
                      <td>{new Date(session.scheduledAt).toLocaleString(dateLocale)}</td>
                      <td>{[session.niveau, session.annee].filter(Boolean).join(" • ") || "-"}</td>
                      <td>
                        {enrolledSessions.has(sessionId) ? (
                          <button className="secondary-button" type="button" onClick={() => handleJoin(sessionId)}>
                            {t("studentPages.open")}
                          </button>
                        ) : isSessionFull(session) ? (
                          <span className="status">{t("studentPages.sessionFull")}</span>
                        ) : (
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => handleEnroll(sessionId)}
                          >
                            {t("studentPages.enroll")}
                          </button>
                        )}
                      </td>
                      <td>
                        {enrolledSessions.has(sessionId)
                          ? t("studentPages.statusAccepted")
                          : t("studentPages.statusNotEnrolled")}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5}>{t("studentPages.noUpcomingSessions")}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mobile-cards mobile-cards--spaced">
            {upcomingSessions.length ? (
              upcomingSessions.map((session) => {
                const sessionId = getSessionId(session);
                return (
                  <article key={sessionId} className="mobile-card">
                    <div className="mobile-card__header">
                      <strong>{session.title}</strong>
                      <span className="status">
                        {enrolledSessions.has(sessionId)
                          ? t("studentPages.statusAccepted")
                          : t("studentPages.statusNotEnrolled")}
                      </span>
                    </div>
                    <div className="mobile-card__row">
                      <span className="mobile-card__label">{t("studentPages.tableDate")}</span>
                      <span>{new Date(session.scheduledAt).toLocaleString(dateLocale)}</span>
                    </div>
                    <div className="mobile-card__row">
                      <span className="mobile-card__label">{levelYearLabel}</span>
                      <span>{[session.niveau, session.annee].filter(Boolean).join(" • ") || "-"}</span>
                    </div>
                    <div className="mobile-card__actions">
                      {enrolledSessions.has(sessionId) ? (
                        <button className="secondary-button" type="button" onClick={() => handleJoin(sessionId)}>
                          {t("studentPages.open")}
                        </button>
                      ) : isSessionFull(session) ? (
                        <span className="status">{t("studentPages.sessionFull")}</span>
                      ) : (
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => handleEnroll(sessionId)}
                        >
                          {t("studentPages.enroll")}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="mobile-card mobile-card--empty">{t("studentPages.noUpcomingSessions")}</div>
            )}
          </div>
        </div>
      </section>
    </StudentDashboardLayout>
  );
}

function openStudentMeetingPreferApp(meetingUrl: string) {
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
