import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiGet, apiPost } from "../../services/api-client";
import { useLanguage } from "../../shared/hooks/use-language";
import { StudentDashboardLayout } from "../dashboard/student-dashboard-layout";
import { subjectOptions, teachingLevelOptions } from "../profile/profile-options";
import { useTranslation } from "react-i18next";

type PublicProfile = {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  subject: string;
  level?: string;
  teachingLevel: "lycee" | "cem";
  currentPosition?: string;
  experienceYears?: number;
  avatarUrl?: string;
};

type Subscription = {
  id: string;
  teacherId: string;
  studentId: string;
  status: "active" | "canceled";
};

type AuthUser = {
  id: string;
  email: string;
  role: "student" | "teacher";
};

type AuthState = {
  user: AuthUser;
  accessToken: string;
};

const STORAGE_KEY = "educonnect_auth";

export function TeacherSearchPage() {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const isRtl = language === "ar";
  const [auth, setAuth] = useState<AuthState | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthState;
    } catch {
      return null;
    }
  });
  const [authChecked, setAuthChecked] = useState(false);
  const [subject, setSubject] = useState("");
  const [teachingLevel, setTeachingLevel] = useState("");
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [statusByTeacher, setStatusByTeacher] = useState<Record<string, "idle" | "success" | "error">>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setAuth(null);
      setAuthChecked(true);
      return;
    }
    try {
      setAuth(JSON.parse(raw) as AuthState);
    } catch {
      setAuth(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!auth || auth.user.role !== "student") return;
    apiGet<Subscription[]>("/subscriptions/me").then((response) => {
      if (response.data) {
        setSubscriptions(response.data);
      }
    });
  }, [auth]);

  const handleSearch = async () => {
    if (!subject || !teachingLevel) {
      setError(t("search.missing"));
      return;
    }
    setError("");
    setIsLoading(true);
    const params = new URLSearchParams({ subject, teachingLevel });
    const response = await apiGet<PublicProfile[]>(`/profiles/search?${params.toString()}`);
    setResults(response.data ?? []);
    setIsLoading(false);
  };

  const handleSubscribe = async (teacherId: string) => {
    if (!auth || auth.user.role !== "student") return;
    if (subscriptions.some((item) => item.teacherId === teacherId)) {
      setStatusByTeacher((prev) => ({ ...prev, [teacherId]: "success" }));
      return;
    }
    const response = await apiPost("/subscriptions", { teacherId });
    if (response.error) {
      setStatusByTeacher((prev) => ({ ...prev, [teacherId]: "error" }));
      return;
    }
    setSubscriptions((prev) => [
      ...prev,
      { id: `${teacherId}-me`, teacherId, studentId: "me", status: "active" },
    ]);
    setStatusByTeacher((prev) => ({ ...prev, [teacherId]: "success" }));
  };

  if (!authChecked) {
    return (
      <div className="app-boot">
        <div className="app-boot__card">
          <div className="app-boot__spinner" />
          <p>Connexion en cours...</p>
        </div>
      </div>
    );
  }

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">{t("search.title")}</h1>
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
      <section className="search-page" dir={isRtl ? "rtl" : "ltr"}>
      <div className="search-bg" aria-hidden="true" />
      <header className="search-hero">
        <div className="search-hero-text">
          <span className="search-eyebrow">{t("search.eyebrow")}</span>
          <h1 className="search-title">{t("search.title")}</h1>
          <p className="search-subtitle">{t("search.subtitle")}</p>
        </div>
        <div className="search-hero-card">
          <span className="search-hero-badge">{t("search.heroBadge")}</span>
          <h3>{t("search.heroLineOne")}</h3>
          <p>{t("search.heroLineTwo")}</p>
        </div>
      </header>

      <section className="search-filters">
        <div className="search-filters__header">
          <h2>{t("search.filtersTitle")}</h2>
          <p>{t("search.filtersHint")}</p>
        </div>
        <div className="search-filters__fields">
          <label htmlFor="subjectSearch">{t("search.subjectLabel")}</label>
          <select
            id="subjectSearch"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          >
            <option value="">--</option>
            {subjectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label htmlFor="levelSearch">{t("search.levelLabel")}</label>
          <select
            id="levelSearch"
            value={teachingLevel}
            onChange={(event) => setTeachingLevel(event.target.value)}
          >
            <option value="">--</option>
            {teachingLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="search-filters__actions">
          <button className="btn btn-primary" type="button" onClick={handleSearch}>
            {t("search.search")}
          </button>
          {error ? <p className="search-helper search-helper--error">{error}</p> : null}
        </div>
      </section>

      <section className="search-results">
        <div className="search-results__header">
          <h2>{t("search.resultsTitle")}</h2>
          <span className="search-results__count">{results.length}</span>
        </div>

        {isLoading ? <div className="search-helper">{t("search.loading")}</div> : null}
        {!isLoading && results.length === 0 && !error ? (
          <div className="search-empty">{t("search.empty")}</div>
        ) : null}

        {results.length ? (
          <div className="search-results__grid">
            {results.map((profile) => {
              const isTeacherSubscribed = subscriptions.some(
                (item) => item.teacherId === profile.userId,
              );
              const subjectLabel =
                subjectOptions.find((option) => option.value === profile.subject)?.label ??
                profile.subject;
              return (
                <article key={profile.id} className="teacher-card">
                  <div className="teacher-card__header">
                    <div className="teacher-card__identity">
                      <span className="teacher-card__avatar" aria-hidden="true">
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt="" loading="lazy" />
                        ) : (
                          ([profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.subject)
                            .slice(0, 1)
                            .toUpperCase()
                        )}
                      </span>
                      <div>
                        <p className="teacher-card__subject">
                          {[profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.subject}
                        </p>
                        <p className="teacher-card__level">
                          {subjectLabel} • {profile.teachingLevel === "lycee" ? "Lycée" : "CEM"}
                        </p>
                      </div>
                    </div>
                    {isTeacherSubscribed ? (
                      <span className="teacher-card__badge">{t("search.subscribedTag")}</span>
                    ) : null}
                  </div>
                  {profile.bio ? <p className="teacher-card__bio">{profile.bio}</p> : null}
                  <div className="teacher-card__actions">
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => handleSubscribe(profile.userId)}
                      disabled={isTeacherSubscribed}
                    >
                      {isTeacherSubscribed ? t("search.subscribed") : t("search.subscribe")}
                    </button>
                    <Link className="btn btn-ghost" to={`/public-profiles/${profile.userId}`}>
                      {t("search.openProfile")}
                    </Link>
                  </div>
                  {statusByTeacher[profile.userId] === "error" ? (
                    <span className="search-helper search-helper--error">
                      {t("search.subscribeError")}
                    </span>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
      </section>
    </StudentDashboardLayout>
  );
}
