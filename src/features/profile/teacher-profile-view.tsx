import { useMemo, useState, type CSSProperties } from "react";

import { useLanguage } from "../../shared/hooks/use-language";
import { formatTeacherDisplayName } from "../../utils/teacher-display";

type Language = "fr" | "ar";

type PublicProfile = {
  profile: {
    id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    headline?: string;
    teachingApproach?: string;
    subject: string;
    level?: string;
    isVerified: boolean;
    teachingLevel?: "lycee" | "cem";
    currentPosition?: string;
    experienceYears?: number;
    city?: string;
    languages?: string[];
    specialtyTags?: string[];
    contactWhatsapp?: string;
    contactTelegram?: string;
    websiteUrl?: string;
    youtubeUrl?: string;
    linkedinUrl?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    tiktokUrl?: string;
    bookingUrl?: string;
    coverImageUrl?: string;
    accentColor?: string;
    avatarUrl?: string;
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
    teacherLabel: "Professeur",
    approachTitle: "Méthode",
    contactsTitle: "Contacts",
    cityLabel: "Ville",
    languagesLabel: "Langues",
    specialtiesLabel: "Spécialités",
    contentsCount: "Contenus",
    offersCount: "Offres",
    bookingCta: "Réserver un créneau",
  },
  ar: {
    verified: "ملف موثّق",
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
    teacherLabel: "الأستاذ",
    approachTitle: "المنهجية",
    contactsTitle: "جهات التواصل",
    cityLabel: "المدينة",
    languagesLabel: "اللغات",
    specialtiesLabel: "التخصصات",
    contentsCount: "المحتويات",
    offersCount: "العروض",
    bookingCta: "احجز موعدا",
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
  const profileDisplayName = profileName
    ? formatTeacherDisplayName(profileName, copy.teacherLabel)
    : data.profile.subject;
  const heroInitial = profileName?.charAt(0).toUpperCase() ?? data.profile.subject?.charAt(0).toUpperCase() ?? "P";
  const avatarAlt = profileName || data.profile.subject || "Prof";
  const [preview, setPreview] = useState<{
    type: "pdf" | "video";
    url: string;
    title: string;
  } | null>(null);
  const profileStyle = {
    ["--profile-accent" as string]: data.profile.accentColor ?? "#f38b1e",
  } as CSSProperties;
  const socialLinks = [
    data.profile.websiteUrl ? { label: "Site", url: data.profile.websiteUrl } : null,
    data.profile.youtubeUrl ? { label: "YouTube", url: data.profile.youtubeUrl } : null,
    data.profile.linkedinUrl ? { label: "LinkedIn", url: data.profile.linkedinUrl } : null,
    data.profile.instagramUrl ? { label: "Instagram", url: data.profile.instagramUrl } : null,
    data.profile.facebookUrl ? { label: "Facebook", url: data.profile.facebookUrl } : null,
    data.profile.tiktokUrl ? { label: "TikTok", url: data.profile.tiktokUrl } : null,
    data.profile.contactTelegram
      ? { label: "Telegram", url: `https://t.me/${data.profile.contactTelegram.replace(/^@/, "")}` }
      : null,
  ].filter(Boolean) as Array<{ label: string; url: string }>;

  return (
    <div className="profile-view" dir={isRtl ? "rtl" : "ltr"} style={profileStyle}>
      <section className="profile-card profile-card--hero">
        {data.profile.coverImageUrl ? (
          <div className="profile-cover">
            <img src={data.profile.coverImageUrl} alt="" loading="lazy" />
          </div>
        ) : null}
        <div className="profile-hero">
          <div className="profile-avatar">
            {data.profile.avatarUrl ? (
              <img src={data.profile.avatarUrl} alt={avatarAlt} loading="lazy" />
            ) : (
              heroInitial
            )}
          </div>
          <div className="profile-hero__text">
            <h2 className="profile-title">{profileDisplayName}</h2>
            {data.profile.isVerified ? <p className="profile-status">{copy.verified}</p> : null}
            {data.profile.headline ? <p className="profile-headline">{data.profile.headline}</p> : null}
            {profileName ? <p className="profile-name">{data.profile.subject}</p> : null}
            {data.profile.bio ? <p className="profile-bio">{data.profile.bio}</p> : null}
          </div>
          {data.profile.isVerified ? <span className="profile-verified is-verified">✓</span> : null}
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
          {data.profile.city ? (
            <span className="profile-tag">
              {copy.cityLabel}: {data.profile.city}
            </span>
          ) : null}
          {data.profile.languages?.length ? (
            <span className="profile-tag">
              {copy.languagesLabel}: {data.profile.languages.join(" • ")}
            </span>
          ) : null}
        </div>
        <div className="profile-metrics">
          <div className="profile-metric">
            <strong>{data.contents.length}</strong>
            <span>{copy.contentsCount}</span>
          </div>
          <div className="profile-metric">
            <strong>{data.offers.length}</strong>
            <span>{copy.offersCount}</span>
          </div>
          <div className="profile-metric">
            <strong>{data.profile.experienceYears ?? 0}</strong>
            <span>{copy.experienceLabel}</span>
          </div>
        </div>
        {data.profile.specialtyTags?.length ? (
          <div className="profile-specialties">
            {data.profile.specialtyTags.map((tag) => (
              <span key={tag} className="profile-chip">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
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

      {data.profile.teachingApproach ? (
        <section className="profile-card profile-card--access">
          <h3>{copy.approachTitle}</h3>
          <p>{data.profile.teachingApproach}</p>
        </section>
      ) : null}

      {(socialLinks.length || data.profile.contactWhatsapp) ? (
        <section className="profile-section">
          <div className="profile-section__header">
            <h3>{copy.contactsTitle}</h3>
          </div>
          <div className="profile-actions">
            {data.profile.contactWhatsapp ? (
              <a
                className="btn btn-ghost"
                href={`https://wa.me/${data.profile.contactWhatsapp.replace(/[^\d+]/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            ) : null}
            {socialLinks.map((link) => (
              <a key={link.label} className="btn btn-ghost" href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {data.profile.bookingUrl ? (
        <section className="profile-card profile-card--access">
          <div className="profile-actions">
            <a className="btn btn-primary" href={data.profile.bookingUrl} target="_blank" rel="noreferrer">
              {copy.bookingCta}
            </a>
          </div>
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
                {mode === "preview" ? (
                  <span className="profile-price">
                    {offer.price} {offer.currency}
                  </span>
                ) : null}
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
