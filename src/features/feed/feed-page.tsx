import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { apiGet } from "../../services/api-client";
import { formatTeacherDisplayName } from "../../utils/teacher-display";
import { StudentDashboardLayout } from "../dashboard/student-dashboard-layout";

type FeedItem = {
  id: string;
  teacherId: string;
  teacherName?: string;
  teacherAvatarUrl?: string;
  title: string;
  type: "video" | "pdf";
  price: number;
  currency: string;
  niveau?: string;
  annee?: string;
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
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const dateLocale = isAr ? "ar-DZ" : "fr-FR";
  const feedCopy = {
    free: isAr ? "مجاني" : "Gratuit",
    level: isAr ? "المستوى" : "Niveau",
    year: isAr ? "السنة" : "Année",
  };
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [blockedTeacherIds, setBlockedTeacherIds] = useState<string[]>([]);
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
    apiGet<string[]>("/subscriptions/me/blocked-teachers").then((response) => {
      if (response.data) {
        setBlockedTeacherIds(response.data as string[]);
      }
    });
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
          <Link className="btn btn-primary" to="/login">
            {t("auth.loginCta")}
          </Link>
        </div>
      </div>
    );
  }

  const visibleItems = items.filter((item) => !blockedTeacherIds.includes(item.teacherId));

  return (
    <StudentDashboardLayout auth={auth}>
      <section className="dashboard-section" ref={containerRef}>
        <h1>{t("studentPages.feedTitle")}</h1>
        <div className="dashboard-card">
          <div className="feed-list">
            {visibleItems.length ? (
              visibleItems.map((item) => (
                <article key={item.id} className="content-card feed-card">
                  <div className="feed-card__top">
                    <Link className="content-author content-author--link feed-card__author" to={`/public-profiles/${item.teacherId}`}>
                      <span className="content-author__avatar feed-card__author-avatar">
                        {item.teacherAvatarUrl ? (
                          <img src={item.teacherAvatarUrl} alt="" loading="lazy" />
                        ) : (
                          (item.teacherName ?? "P").slice(0, 1).toUpperCase()
                        )}
                      </span>
                      <div className="feed-card__author-text">
                        <strong className="content-author__name">
                          {item.teacherName
                            ? formatTeacherDisplayName(item.teacherName, t("common.teacherLabel"))
                            : t("common.teacherLabel")}
                        </strong>
                        <span className="feed-card__date">
                          {new Date(item.createdAt).toLocaleDateString(dateLocale)}
                        </span>
                      </div>
                    </Link>
                  </div>
                  <div className="feed-card__media">
                    {item.fileUrl ? (
                      <div className="content-preview">
                        {item.type === "pdf" ? (
                          <iframe
                            title={item.title}
                            src={`${item.fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
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
                    <div className="feed-card__badges-row">
                      <div className={`feed-card__type-badge content-tag content-tag--${item.type}`}>
                        <span className="content-tag__icon" aria-hidden="true">
                          {item.type === "pdf" ? "📄" : "▶"}
                        </span>
                        <span>{item.type.toUpperCase()}</span>
                      </div>
                      <div className={`feed-card__price-badge content-price ${item.isPaid ? "content-price--paid" : "content-price--free"}`}>
                        {item.isPaid ? `${item.price} ${item.currency}` : feedCopy.free}
                      </div>
                    </div>
                    <h3 className="feed-card__title">{item.title}</h3>
                    {(item.niveau || item.annee) ? (
                      <div className="feed-card__meta">
                        <span>{item.niveau ? `${feedCopy.level}: ${item.niveau}` : feedCopy.level}</span>
                        <span>{item.annee ? `${feedCopy.year}: ${item.annee}` : "-"}</span>
                      </div>
                    ) : null}
                    <div className="feed-card__actions">
                      {item.type === "pdf" && item.fileUrl ? (
                        <a
                          className="btn btn-primary feed-card__pdf-cta"
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
            ) : isLoading ? (
              Array.from({ length: 3 }).map((_, index) => <FeedCardSkeleton key={`feed-skeleton-${index}`} />)
            ) : (
              <div className="empty-state">{t("studentPages.noContent")}</div>
            )}
            {isLoading && visibleItems.length ? (
              <div className="feed-list__loading-more" aria-hidden="true">
                <FeedCardSkeleton compact />
              </div>
            ) : null}
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

function FeedCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <article className={`content-card feed-card feed-card--skeleton${compact ? " feed-card--skeleton-compact" : ""}`} aria-hidden="true">
      <div className="feed-card__top">
        <div className="feed-card__author">
          <span className="feed-skeleton feed-skeleton--avatar" />
          <div className="feed-card__author-text">
            <span className="feed-skeleton feed-skeleton--line feed-skeleton--line-lg" />
            <span className="feed-skeleton feed-skeleton--line feed-skeleton--line-sm" />
          </div>
        </div>
      </div>
      <div className="feed-card__media">
        <span className="feed-skeleton feed-skeleton--chip feed-skeleton--chip-left" />
        <span className="feed-skeleton feed-skeleton--chip feed-skeleton--chip-right" />
        <div className="feed-skeleton feed-skeleton--media" />
      </div>
      <div className="feed-card__body">
        <span className="feed-skeleton feed-skeleton--line feed-skeleton--title" />
        <span className="feed-skeleton feed-skeleton--line feed-skeleton--title-short" />
        <div className="feed-card__meta">
          <span className="feed-skeleton feed-skeleton--pill" />
          <span className="feed-skeleton feed-skeleton--pill" />
        </div>
        <div className="feed-card__actions">
          <span className="feed-skeleton feed-skeleton--button" />
        </div>
      </div>
    </article>
  );
}
