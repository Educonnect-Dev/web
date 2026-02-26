import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Link, useParams } from "react-router-dom";

import { apiDelete, apiGet, apiPost } from "../../services/api-client";
import { useLanguage } from "../../shared/hooks/use-language";
import { useTranslation } from "react-i18next";
import { StudentDashboardLayout } from "../dashboard/student-dashboard-layout";
import { TeacherProfileView } from "./teacher-profile-view";
import { useSeoMeta } from "../../shared/hooks/use-seo-meta";

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

type AuthState = {
  user: { id: string; role: "student" | "teacher"; email: string };
  accessToken: string;
};

type Subscription = {
  id: string;
  teacherId: string;
  studentId: string;
  status: "active" | "canceled";
};

const STORAGE_KEY = "educonnect_auth";

export function PublicProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState<PublicProfile | null>(null);
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "success" | "error">("idle");
  const [unsubscribeStatus, setUnsubscribeStatus] = useState<"idle" | "success" | "error">("idle");
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [blockedTeacherIds, setBlockedTeacherIds] = useState<string[]>([]);
  const { language } = useLanguage();
  const { t } = useTranslation();
  const isRtl = language === "ar";
  const isAr = language === "ar";
  const profileName = [data?.profile.firstName, data?.profile.lastName].filter(Boolean).join(" ").trim();

  useSeoMeta({
    title: data
      ? `${profileName ? `Professeur ${profileName}` : "Profil professeur"} | Educonnect`
      : "Profil professeur | Educonnect",
    description: data
      ? `${profileName ? `${profileName} · ` : ""}${data.profile.subject} · ${
          data.profile.teachingLevel === "lycee" ? "Lycée" : data.profile.teachingLevel === "cem" ? "CEM" : "Cours"
        } sur Educonnect.`
      : "Découvrez un professeur, ses contenus et ses offres sur Educonnect.",
    robots: "index,follow",
    canonicalPath: id ? `/public-profiles/${id}` : "/public-profiles",
    ogType: "profile",
  });

  const isStudent = auth?.user.role === "student";
  const isSubscribed = useMemo(
    () => Boolean(id && subscriptions.some((item) => item.teacherId === id)),
    [id, subscriptions],
  );

  useEffect(() => {
    if (!id) return;
    apiGet<PublicProfile>(`/public-profiles/${id}`).then((response) => {
      if (response.data) {
        setData(response.data);
      }
    });
  }, [id]);

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
    if (!isStudent) return;
    apiGet<Subscription[]>("/subscriptions/me").then((response) => {
      if (response.data) {
        setSubscriptions(response.data);
      }
    });
    apiGet<string[]>("/subscriptions/me/blocked-teachers").then((response) => {
      if (response.data) {
        setBlockedTeacherIds(response.data as string[]);
      }
    });
  }, [isStudent]);

  const isBlockedByTeacher = Boolean(isStudent && id && blockedTeacherIds.includes(id));

  const handleSubscribe = async () => {
    if (!id) return;
    if (isSubscribed) {
      setSubscribeStatus("success");
      setUnsubscribeStatus("idle");
      return;
    }
    setSubscribeStatus("idle");
    setUnsubscribeStatus("idle");
    const response = await apiPost("/subscriptions", { teacherId: id });
    if (response.error) {
      setSubscribeStatus("error");
      return;
    }
    setSubscribeStatus("success");
    setSubscriptions((prev) => [
      ...prev,
      { id: `${id}-${auth?.user.id ?? ""}`, teacherId: id, studentId: auth?.user.id ?? "", status: "active" },
    ]);
  };

  const handleUnsubscribe = async () => {
    if (!id || !isSubscribed) return;
    setSubscribeStatus("idle");
    setUnsubscribeStatus("idle");
    const response = await apiDelete(`/subscriptions/${id}`);
    if (response.error) {
      setUnsubscribeStatus("error");
      return;
    }
    setUnsubscribeStatus("success");
    setSubscriptions((prev) => prev.filter((item) => item.teacherId !== id));
  };

  const wrapWithLayout = (node: ReactElement) =>
    isStudent && auth ? <StudentDashboardLayout auth={auth}>{node}</StudentDashboardLayout> : node;

  if (!id) {
    return wrapWithLayout(
      <section className="profile-public" dir={isRtl ? "rtl" : "ltr"}>
        <div className="profile-bg" aria-hidden="true" />
        <header className="profile-header">
          <div>
            <p className="profile-eyebrow">{t("publicProfile.title")}</p>
            <h1>{t("publicProfile.title")}</h1>
            <p className="profile-subtitle">{t("publicProfile.subtitle")}</p>
          </div>
          <Link className="profile-back" to="/search/teachers">
            {t("publicProfile.back")}
          </Link>
        </header>
        <div className="profile-content">
          <div className="profile-card profile-card--notice">{t("publicProfile.missingId")}</div>
        </div>
      </section>
    );
  }

  if (!data) {
    return wrapWithLayout(
      <section className="profile-public" dir={isRtl ? "rtl" : "ltr"}>
        <div className="profile-bg" aria-hidden="true" />
        <header className="profile-header">
          <div>
            <p className="profile-eyebrow">{t("publicProfile.title")}</p>
            <h1>{t("publicProfile.title")}</h1>
            <p className="profile-subtitle">{t("publicProfile.subtitle")}</p>
          </div>
          <Link className="profile-back" to="/search/teachers">
            {t("publicProfile.back")}
          </Link>
        </header>
        <div className="profile-content">
          <div className="profile-card profile-card--notice">{t("publicProfile.loading")}</div>
        </div>
      </section>
    );
  }

  if (isBlockedByTeacher) {
    return wrapWithLayout(
      <section className="profile-public" dir={isRtl ? "rtl" : "ltr"}>
        <div className="profile-bg" aria-hidden="true" />
        <header className="profile-header">
          <div>
            <p className="profile-eyebrow">{t("publicProfile.title")}</p>
            <h1>{t("publicProfile.title")}</h1>
            <p className="profile-subtitle">{t("publicProfile.subtitle")}</p>
          </div>
          <Link className="profile-back" to="/search/teachers">
            {t("publicProfile.back")}
          </Link>
        </header>
        <div className="profile-content">
          <div className="profile-card profile-card--notice">
            {isAr ? "هذا الملف الشخصي لم يعد متاحًا." : "Ce profil n'est plus accessible."}
          </div>
        </div>
      </section>
    );
  }

  return wrapWithLayout(
    <section className="profile-public" dir={isRtl ? "rtl" : "ltr"}>
      <div className="profile-bg" aria-hidden="true" />
      <header className="profile-header">
        <div>
          <p className="profile-eyebrow">{t("publicProfile.title")}</p>
          <h1>{t("publicProfile.title")}</h1>
          <p className="profile-subtitle">{t("publicProfile.subtitle")}</p>
        </div>
        <Link className="profile-back" to="/search/teachers">
          {t("publicProfile.back")}
        </Link>
      </header>
      <div className="profile-content">
        <TeacherProfileView
          data={data}
          mode={isStudent ? "student" : "preview"}
          onSubscribe={isStudent ? handleSubscribe : undefined}
          onUnsubscribe={isStudent ? handleUnsubscribe : undefined}
          subscribeStatus={subscribeStatus}
          unsubscribeStatus={unsubscribeStatus}
          isSubscribed={isSubscribed}
        />
      </div>
    </section>
  );
}
