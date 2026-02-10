import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { apiGet } from "../../services/api-client";
import { StudentDashboardLayout } from "../dashboard/student-dashboard-layout";

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

export function FeedPage() {
  const { t } = useTranslation();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadPage = async (page: number) => {
    setIsLoading(true);
    const response = await apiGet<FeedItem[]>(`/feed?page=${page}&limit=6`);
    if (response.data) {
      setItems((prev) => [...prev, ...(response.data ?? [])]);
      const meta = response.meta as FeedMeta;
      setNextPage(meta.nextPage ?? null);
    }
    setIsLoading(false);
  };

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
    if (nextPage === 1) {
      loadPage(1);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth || auth.user.role !== "student") return;
    const onScroll = () => {
      if (isLoading || nextPage === null) return;
      const scrollTop = window.scrollY;
      const viewport = window.innerHeight;
      const fullHeight = document.body.offsetHeight;
      if (scrollTop + viewport >= fullHeight - 200) {
        loadPage(nextPage);
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [auth, isLoading, nextPage]);

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">{t("studentPages.loginTitleFeed")}</h1>
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
      <section className="dashboard-section" ref={containerRef}>
        <h1>{t("studentPages.feedTitle")}</h1>
        <div className="dashboard-card">
          <div className="feed-list">
            {items.length ? (
              items.map((item) => (
                <article key={item.id} className="content-card feed-card">
                  <div className="feed-card__media">
                    {item.fileUrl ? (
                      <div className="content-preview">
                      {item.type === "pdf" ? (
                        <iframe
                          title={item.title}
                          src={`${item.fileUrl}#toolbar=0`}
                          loading="lazy"
                        />
                      ) : (
                        <video src={item.fileUrl} controls preload="metadata" />
                      )}
                      </div>
                    ) : (
                      <div className={`content-preview content-preview--static content-preview--${item.type}`}>
                        <div className="content-preview__badge">{item.type.toUpperCase()}</div>
                        <div className="content-preview__icon">{item.type === "pdf" ? "PDF" : "▶"}</div>
                        <div className="content-preview__title">{item.title}</div>
                      </div>
                    )}
                  </div>
                  <div className="feed-card__body">
                    <div className="feed-card__eyebrow">{item.type.toUpperCase()}</div>
                    <h3 className="feed-card__title">{item.title}</h3>
                    <a className="content-author content-author--link" href={`/public-profiles/${item.teacherId}`}>
                      <span className="content-author__avatar">
                        {(item.teacherName ?? "P").slice(0, 1).toUpperCase()}
                      </span>
                      <strong className="content-author__name">
                        {item.teacherName ?? "Professeur"}
                      </strong>
                    </a>
                    <div className="feed-card__meta">
                      <span className="feed-card__price">
                        {item.isPaid ? `${item.price} ${item.currency}` : "Gratuit"}
                      </span>
                      <span className="feed-card__date">
                        {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div className="feed-card__actions">
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
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">{t("studentPages.noContent")}</div>
            )}
          </div>
          {nextPage ? (
            <button
              className="btn btn-primary"
              type="button"
              disabled={isLoading}
              onClick={() => loadPage(nextPage)}
            >
              {isLoading ? t("studentPages.loading") : t("studentPages.loadMore")}
            </button>
          ) : null}
        </div>
      </section>
    </StudentDashboardLayout>
  );
}
