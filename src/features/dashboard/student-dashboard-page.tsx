import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { apiGet } from "../../services/api-client";
import { StudentDashboardLayout } from "./student-dashboard-layout";

type AuthUser = {
  id: string;
  email: string;
  role: "student" | "teacher";
};

type AuthState = {
  user: AuthUser;
  accessToken: string;
};

type FeedItem = {
  id: string;
  teacherId: string;
  teacherName?: string;
  title: string;
  type: "video" | "pdf";
  price: number;
  currency: string;
  isPaid: boolean;
  fileUrl?: string;
  createdAt: string;
};

type FeedMeta = {
  nextPage: number | null;
  total: number;
};

type StudentDashboardSummary = {
  feed: {
    items: FeedItem[];
    nextPage: number | null;
    total: number;
  };
  upcomingSessions: Array<{
    id: string;
    teacherId: string;
    title: string;
    scheduledAt: string;
    zoomJoinUrl?: string;
    status: "ouvert" | "complet" | "annulee" | "terminee";
  }>;
  recommendedTeachers: Array<{
    teacherId: string;
    subject: string;
    teachingLevel: "lycee" | "cem";
    bio?: string;
  }>;
  progress: {
    completedQuizzes: number;
    totalQuizzes: number;
    currentStreak: number;
  };
  eduQuiz: {
    availableCount: number;
  };
  activeSubscriptions: Array<{ id: string; teacherId: string }>;
  recentMessages: Array<{
    threadId: string;
    teacherId: string;
    fromUserId: string;
    toUserId: string;
    content: string;
    createdAt: string;
  }>;
};

const STORAGE_KEY = "educonnect_auth";

export function StudentDashboardPage() {
  const { t } = useTranslation();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [summary, setSummary] = useState<StudentDashboardSummary | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (!auth) return;
    apiGet<StudentDashboardSummary>("/dashboard/student/summary").then((response) => {
      if (response.data) {
        setSummary(response.data);
        setItems(response.data.feed.items);
        const meta = response.data.feed as FeedMeta;
        setNextPage(meta.nextPage ?? null);
      }
    });
  }, [auth]);

  const loadPage = async (page: number) => {
    if (!auth) return;
    setIsLoading(true);
    const response = await apiGet<FeedItem[]>(`/feed?page=${page}&limit=5`);
    if (response.data) {
      setItems((prev) => [...prev, ...(response.data ?? [])]);
      const meta = response.meta as FeedMeta;
      setNextPage(meta.nextPage ?? null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const onScroll = () => {
      if (isLoading || nextPage === null) return;
      const scrollTop = window.scrollY;
      const viewport = window.innerHeight;
      const fullHeight = document.body.offsetHeight;
      if (scrollTop + viewport >= fullHeight - 240) {
        loadPage(nextPage);
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLoading, nextPage, auth]);

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-card">
          <h2>{t("auth.reserved")}</h2>
          <p>{t("auth.loginAsStudent")}</p>
          <a className="btn btn-primary" href="/login">
            {t("auth.loginCta")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <StudentDashboardLayout auth={auth}>
      <header className="dashboard-header">
        <div>
          <h1>{t("studentDashboard.title")}</h1>
          <p>{t("studentDashboard.welcome", { email: auth.user.email })}</p>
        </div>
        <div className="dashboard-actions">
          <a className="btn btn-ghost" href="/search/teachers">
            {t("studentDashboard.searchCta")}
          </a>
          <button className="btn btn-primary">{t("studentDashboard.loadMore")}</button>
        </div>
      </header>

      <section className="dashboard-grid">
        <div className="dashboard-card highlight">
          <h3>{t("studentDashboard.progressTitle")}</h3>
          <div className="dashboard-value">
            {summary ? summary.progress.completedQuizzes : 0}/{summary ? summary.progress.totalQuizzes : 0}
          </div>
          <span className="dashboard-tag">
            {t("studentDashboard.streakLabel", { count: summary ? summary.progress.currentStreak : 0 })}
          </span>
        </div>
        <div className="dashboard-card">
          <h3>{t("studentDashboard.statQuizzes")}</h3>
          <div className="dashboard-value">{summary ? summary.eduQuiz.availableCount : 0}</div>
          <span className="dashboard-tag">{t("studentDashboard.statQuizzesTag")}</span>
        </div>
        <div className="dashboard-card">
          <h3>{t("studentDashboard.statSubscriptions")}</h3>
          <div className="dashboard-value">{summary ? summary.activeSubscriptions.length : 0}</div>
          <span className="dashboard-tag">{t("studentDashboard.statSubscriptionsTag")}</span>
        </div>
      </section>

      <div className="dashboard-columns">
        <section className="dashboard-section">
          <h2>{t("studentDashboard.quickFeed")}</h2>
          <div className="dashboard-card">
            <div className="content-grid">
              {items.length ? (
                items.map((item) => (
                  <article key={item.id} className="content-card">
                    <div className="content-tag">{item.type.toUpperCase()}</div>
                    <h3>{item.title}</h3>
                    {item.teacherName ? <p className="content-author">{item.teacherName}</p> : null}
                    <p>{item.isPaid ? `${item.price} ${item.currency}` : "Gratuit"}</p>
                    <small>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</small>
                    <div className="content-actions">
                      {item.type === "pdf" && item.fileUrl ? (
                        <a
                          className="btn btn-ghost"
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("studentPages.viewPdf")}
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">{t("studentDashboard.emptyFeed")}</div>
              )}
            </div>
            {nextPage ? (
              <button className="btn btn-primary" type="button" disabled={isLoading} onClick={() => loadPage(nextPage)}>
                {isLoading ? t("studentDashboard.loading") : t("studentDashboard.loadMore")}
              </button>
            ) : null}
          </div>
        </section>

        <section className="dashboard-section">
          <h2>{t("studentDashboard.upcomingTitle")}</h2>
          <div className="dashboard-list">
            {summary?.upcomingSessions.length ? (
              summary.upcomingSessions.map((session) => (
                <div key={session.id} className="dashboard-row">
                  <div>
                    <strong>{session.title}</strong>
                    <p>{session.scheduledAt}</p>
                  </div>
                  <span className={`status ${session.status === "ouvert" ? "live" : ""}`}>
                    {t(`studentDashboard.status.${session.status}`)}
                  </span>
                </div>
              ))
            ) : (
              <div className="dashboard-row">
                <div>
                  <strong>{t("studentDashboard.nonePlanned")}</strong>
                  <p>{t("studentDashboard.checkTeachers")}</p>
                </div>
                <span className="status">{t("studentDashboard.toCome")}</span>
              </div>
            )}
          </div>

          <div className="dashboard-card compact">
            <h3>{t("studentDashboard.recommendations")}</h3>
            <div className="dashboard-list">
              {summary?.recommendedTeachers.length ? (
                summary.recommendedTeachers.map((teacher) => (
                  <div key={teacher.teacherId} className="dashboard-row">
                    <div>
                      <strong>{teacher.subject}</strong>
                      <p>{teacher.teachingLevel === "lycee" ? "Lycée" : "CEM"}</p>
                    </div>
                    <span className="status">{t("studentDashboard.viewProfile")}</span>
                  </div>
                ))
              ) : (
                <div className="dashboard-row">
                  <div>
                    <strong>{t("studentDashboard.noneRecommendations")}</strong>
                    <p>{t("studentDashboard.discoverBySubject")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-card compact">
            <h3>{t("studentDashboard.recentMessages")}</h3>
            <div className="dashboard-list">
              {summary?.recentMessages.length ? (
                summary.recentMessages.map((message) => (
                  <div key={message.threadId} className="dashboard-row">
                    <div>
                      <strong>{message.content}</strong>
                      <p>{new Date(message.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <span className="status">{t("studentDashboard.new")}</span>
                  </div>
                ))
              ) : (
                <div className="dashboard-row">
                  <div>
                    <strong>{t("studentDashboard.noneMessages")}</strong>
                    <p>{t("studentDashboard.messagesHint")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-card compact">
            <h3>{t("studentDashboard.subscriptionsTitle")}</h3>
            <div className="dashboard-list">
              {summary?.activeSubscriptions.length ? (
                summary.activeSubscriptions.map((subscription) => (
                  <div key={subscription.id} className="dashboard-row">
                    <div>
                      <strong>Prof {subscription.teacherId}</strong>
                      <p>{t("studentDashboard.accessActive")}</p>
                    </div>
                    <span className="status live">{t("studentDashboard.active")}</span>
                  </div>
                ))
              ) : (
                <div className="dashboard-row">
                  <div>
                    <strong>{t("studentDashboard.noneSubscriptions")}</strong>
                    <p>{t("studentDashboard.subscribeHint")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </StudentDashboardLayout>
  );
}
