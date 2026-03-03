import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { apiGet, apiPost } from "../../services/api-client";
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

type FeedComment = {
  id: string;
  contentId: string;
  isPaid: boolean;
  authorId: string;
  authorRole: "student" | "teacher";
  authorName: string;
  text: string;
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
    comments: isAr ? "التعليقات" : "Commentaires",
    commentPlaceholder: isAr ? "اكتب تعليقك..." : "Écris un commentaire...",
    publishComment: isAr ? "نشر" : "Publier",
    noComments: isAr ? "لا توجد تعليقات بعد" : "Aucun commentaire pour le moment",
  };
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [blockedTeacherIds, setBlockedTeacherIds] = useState<string[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [commentsByItem, setCommentsByItem] = useState<Record<string, FeedComment[]>>({});
  const [commentInputByItem, setCommentInputByItem] = useState<Record<string, string>>({});
  const [commentsLoadingByItem, setCommentsLoadingByItem] = useState<Record<string, boolean>>({});
  const [commentsSubmittingByItem, setCommentsSubmittingByItem] = useState<Record<string, boolean>>({});
  const [commentsOpenByItem, setCommentsOpenByItem] = useState<Record<string, boolean>>({});
  const [likedByItem, setLikedByItem] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  const commentKey = (itemId: string, isPaid: boolean) => `${isPaid ? "paid" : "free"}:${itemId}`;

  const loadComments = async (itemId: string, isPaid: boolean) => {
    const key = commentKey(itemId, isPaid);
    if (commentsLoadingByItem[key]) return;
    setCommentsLoadingByItem((prev) => ({ ...prev, [key]: true }));
    const response = await apiGet<FeedComment[]>(`/feed/${itemId}/comments?isPaid=${isPaid ? "true" : "false"}`);
    if (response.data) {
      setCommentsByItem((prev) => ({ ...prev, [key]: response.data ?? [] }));
    }
    setCommentsLoadingByItem((prev) => ({ ...prev, [key]: false }));
  };

  const loadPage = async (page: number) => {
    setIsLoading(true);
    const response = await apiGet<FeedItem[]>(`/feed?page=${page}&limit=6`);
    if (response.data) {
      const nextItems = response.data ?? [];
      setItems((prev) => [...prev, ...nextItems]);
      const meta = response.meta as FeedMeta;
      setNextPage(meta.nextPage ?? null);
    }
    setIsLoading(false);
  };

  const submitComment = async (item: FeedItem) => {
    const key = commentKey(item.id, item.isPaid);
    const input = (commentInputByItem[key] ?? "").trim();
    if (!input || commentsSubmittingByItem[key]) return;
    setCommentsSubmittingByItem((prev) => ({ ...prev, [key]: true }));
    const response = await apiPost<FeedComment>(`/feed/${item.id}/comments`, {
      text: input,
      isPaid: item.isPaid,
    });
    if (response.data) {
      setCommentsByItem((prev) => ({
        ...prev,
        [key]: [...(prev[key] ?? []), response.data as FeedComment],
      }));
      setCommentInputByItem((prev) => ({ ...prev, [key]: "" }));
    }
    setCommentsSubmittingByItem((prev) => ({ ...prev, [key]: false }));
  };

  const toggleComments = async (item: FeedItem) => {
    const key = commentKey(item.id, item.isPaid);
    const nextOpen = !commentsOpenByItem[key];
    setCommentsOpenByItem((prev) => ({ ...prev, [key]: nextOpen }));
    if (nextOpen && commentsByItem[key] === undefined) {
      await loadComments(item.id, item.isPaid);
    }
  };

  const toggleLike = (item: FeedItem) => {
    const key = commentKey(item.id, item.isPaid);
    setLikedByItem((prev) => ({ ...prev, [key]: !prev[key] }));
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
                <article key={`${item.isPaid ? "paid" : "free"}-${item.id}`} className="content-card feed-card">
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
                    <div className="feed-card__engagement">
                      <button
                        className={`feed-engage-btn ${likedByItem[commentKey(item.id, item.isPaid)] ? "is-liked" : ""}`}
                        type="button"
                        aria-label="Aimer"
                        onClick={() => toggleLike(item)}
                      >
                        <span className="feed-engage-btn__icon" aria-hidden="true">♥</span>
                        <span>J'aime</span>
                      </button>
                      <button
                        className={`feed-engage-btn ${commentsOpenByItem[commentKey(item.id, item.isPaid)] ? "is-active" : ""}`}
                        type="button"
                        aria-label={feedCopy.comments}
                        onClick={() => toggleComments(item)}
                      >
                        <span className="feed-engage-btn__icon" aria-hidden="true">💬</span>
                        <span>{feedCopy.comments}</span>
                      </button>
                    </div>
                    {commentsOpenByItem[commentKey(item.id, item.isPaid)] ? (
                      <div className="feed-comments">
                        <div className="feed-comments__list">
                          {(commentsByItem[commentKey(item.id, item.isPaid)] ?? []).length ? (
                            (commentsByItem[commentKey(item.id, item.isPaid)] ?? []).map((comment) => (
                              <div key={comment.id} className="feed-comment">
                                <strong>{comment.authorName}</strong>
                                <span>{new Date(comment.createdAt).toLocaleString(dateLocale)}</span>
                                <p>{comment.text}</p>
                              </div>
                            ))
                          ) : commentsLoadingByItem[commentKey(item.id, item.isPaid)] ? (
                            <div className="feed-comment feed-comment--empty">{t("studentPages.loading")}</div>
                          ) : (
                            <div className="feed-comment feed-comment--empty">{feedCopy.noComments}</div>
                          )}
                        </div>
                        <div className="feed-comments__composer">
                          <textarea
                            value={commentInputByItem[commentKey(item.id, item.isPaid)] ?? ""}
                            onChange={(event) =>
                              setCommentInputByItem((prev) => ({
                                ...prev,
                                [commentKey(item.id, item.isPaid)]: event.target.value,
                              }))
                            }
                            placeholder={feedCopy.commentPlaceholder}
                            rows={2}
                          />
                          <button
                            className="btn btn-ghost"
                            type="button"
                            disabled={commentsSubmittingByItem[commentKey(item.id, item.isPaid)]}
                            onClick={() => submitComment(item)}
                          >
                            {feedCopy.publishComment}
                          </button>
                        </div>
                      </div>
                    ) : null}
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
