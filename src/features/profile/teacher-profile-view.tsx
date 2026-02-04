import { useMemo, useState } from "react";

import { useLanguage } from "../../shared/hooks/use-language";

type Language = "fr" | "ar";

type PublicProfile = {
  profile: {
    id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    subject: string;
    level?: string;
    isVerified: boolean;
    teachingLevel?: "lycee" | "cem";
    currentPosition?: string;
    experienceYears?: number;
  };
  contents: Array<{
    id: string;
    title: string;
    type: "video" | "pdf";
    price: number;
    currency: string;
    isPaid: boolean;
    fileUrl?: string;
  }>;
  offers: Array<{ id: string; title: string; price: number; currency: string; description: string }>;
};

const translations: Record<Language, Record<string, string>> = {
  fr: {
    verified: "Profil vérifié",
    notVerified: "Profil non vérifié",
    subscribe: "S'abonner",
    subscribedBadge: "Déjà abonné",
    accessBlockTitle: "Accès abonné",
    accessBlockDesc: "Vous avez accès aux contenus abonnés de ce prof.",
    subscribed: "Abonnement activé",
    subscribeError: "Impossible de s'abonner",
    offers: "Offres",
    contents: "Contenus",
    free: "Gratuit",
    paid: "Payant",
    viewPdf: "Voir PDF",
    viewVideo: "Voir vidéo",
    close: "Fermer",
    levelLabel: "Niveau",
    teachingLevelLabel: "Niveau enseigné",
    positionLabel: "Poste",
    experienceLabel: "Ancienneté",
  },
  ar: {
    verified: "ملف موثّق",
    notVerified: "ملف غير موثّق",
    subscribe: "اشترك",
    subscribedBadge: "مشترك بالفعل",
    accessBlockTitle: "وصول المشترك",
    accessBlockDesc: "لديك حق الوصول إلى محتوى الاشتراك.",
    subscribed: "تم الاشتراك",
    subscribeError: "تعذر الاشتراك",
    offers: "العروض",
    contents: "المحتويات",
    free: "مجاني",
    paid: "مدفوع",
    viewPdf: "عرض PDF",
    viewVideo: "عرض الفيديو",
    close: "إغلاق",
    levelLabel: "المستوى",
    teachingLevelLabel: "المستوى التعليمي",
    positionLabel: "المنصب",
    experienceLabel: "الخبرة",
  },
};

type TeacherProfileViewProps = {
  data: PublicProfile;
  mode: "student" | "preview";
  onSubscribe?: () => void;
  subscribeStatus?: "idle" | "success" | "error";
  isSubscribed?: boolean;
};

export function TeacherProfileView({
  data,
  mode,
  onSubscribe,
  subscribeStatus = "idle",
  isSubscribed = false,
}: TeacherProfileViewProps) {
  const { language } = useLanguage();
  const copy = useMemo(() => translations[language], [language]);
  const isRtl = language === "ar";
  const profileName = [data.profile.firstName, data.profile.lastName].filter(Boolean).join(" ");
  const heroInitial = profileName?.charAt(0).toUpperCase() ?? data.profile.subject?.charAt(0).toUpperCase() ?? "P";
  const [preview, setPreview] = useState<{
    type: "pdf" | "video";
    url: string;
    title: string;
  } | null>(null);

  return (
    <div className="profile-view" dir={isRtl ? "rtl" : "ltr"}>
      <section className="profile-card profile-card--hero">
        <div className="profile-hero">
          <div className="profile-avatar">{heroInitial}</div>
          <div className="profile-hero__text">
            <h2 className="profile-title">{profileName || data.profile.subject}</h2>
            <p className="profile-status">
              {data.profile.isVerified ? copy.verified : copy.notVerified}
            </p>
            {profileName ? <p className="profile-name">{data.profile.subject}</p> : null}
            {data.profile.bio ? <p className="profile-bio">{data.profile.bio}</p> : null}
          </div>
          <span
            className={`profile-verified ${data.profile.isVerified ? "is-verified" : "is-pending"}`}
          >
            {data.profile.isVerified ? "✓" : "•"}
          </span>
        </div>
        <div className="profile-meta">
          {data.profile.level ? (
            <span className="profile-tag">
              {copy.levelLabel}: {data.profile.level}
            </span>
          ) : null}
          {data.profile.teachingLevel ? (
            <span className="profile-tag">
              {copy.teachingLevelLabel}: {data.profile.teachingLevel}
            </span>
          ) : null}
          {data.profile.currentPosition ? (
            <span className="profile-tag">
              {copy.positionLabel}: {data.profile.currentPosition}
            </span>
          ) : null}
          {typeof data.profile.experienceYears === "number" ? (
            <span className="profile-tag">
              {copy.experienceLabel}: {data.profile.experienceYears} ans
            </span>
          ) : null}
        </div>
        {mode === "student" ? (
          <div className="profile-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={onSubscribe}
              disabled={isSubscribed}
            >
              {copy.subscribe}
            </button>
            {isSubscribed ? <div className="profile-message">{copy.subscribedBadge}</div> : null}
            {subscribeStatus === "success" ? (
              <div className="profile-message">{copy.subscribed}</div>
            ) : null}
            {subscribeStatus === "error" ? (
              <div className="profile-message profile-message--error">{copy.subscribeError}</div>
            ) : null}
          </div>
        ) : null}
      </section>

      {mode === "student" && isSubscribed ? (
        <section className="profile-card profile-card--access">
          <h3>{copy.accessBlockTitle}</h3>
          <p>{copy.accessBlockDesc}</p>
        </section>
      ) : null}

      <section className="profile-section">
        <div className="profile-section__header">
          <h3>{copy.offers}</h3>
        </div>
        <div className="profile-cards">
          {data.offers.length ? (
            data.offers.map((offer) => (
              <article key={offer.id} className="profile-item">
                <div>
                  <h4>{offer.title}</h4>
                  <p>{offer.description}</p>
                </div>
                <span className="profile-price">
                  {offer.price} {offer.currency}
                </span>
              </article>
            ))
          ) : (
            <div className="profile-empty">—</div>
          )}
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section__header">
          <h3>{copy.contents}</h3>
        </div>
        <div className="profile-cards">
          {data.contents.length ? (
            data.contents.map((item) => (
              <article key={item.id} className="profile-item">
                <div>
                  <h4>{item.title}</h4>
                  <p>
                    {item.type.toUpperCase()} •{" "}
                    {item.isPaid ? `${item.price} ${item.currency}` : copy.free}
                  </p>
                </div>
                <div className="profile-item__actions">
                  {item.fileUrl ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => setPreview({ type: item.type, url: item.fileUrl ?? "", title: item.title })}
                    >
                      {item.type === "pdf" ? copy.viewPdf : copy.viewVideo}
                    </button>
                  ) : null}
                  <span className="profile-chip">{item.isPaid ? copy.paid : copy.free}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="profile-empty">—</div>
          )}
        </div>
      </section>
      {preview ? (
        <div className="media-modal" role="dialog" aria-modal="true">
          <button className="media-modal__overlay" type="button" onClick={() => setPreview(null)} aria-label="Fermer" />
          <div className="media-modal__content">
            <div className="media-modal__header">
              <h4>{preview.title}</h4>
              <button className="btn btn-ghost" type="button" onClick={() => setPreview(null)}>
                {copy.close}
              </button>
            </div>
            <div className="media-modal__body">
              {preview.type === "pdf" ? (
                <iframe title={preview.title} src={`${preview.url}#toolbar=1`} />
              ) : (
                <video src={preview.url} controls />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
