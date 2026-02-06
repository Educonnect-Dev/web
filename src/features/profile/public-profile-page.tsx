import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { useParams } from "react-router-dom";

import { apiGet, apiPost } from "../../services/api-client";
import { useLanguage } from "../../shared/hooks/use-language";
import { useTranslation } from "react-i18next";
import { StudentDashboardLayout } from "../dashboard/student-dashboard-layout";
import { TeacherProfileView } from "./teacher-profile-view";

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
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const { language } = useLanguage();
  const { t } = useTranslation();
  const isRtl = language === "ar";

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
  }, [isStudent]);

  const handleSubscribe = async () => {
    if (!id) return;
    if (isSubscribed) {
      setSubscribeStatus("success");
      return;
    }
    setSubscribeStatus("idle");
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
          <a className="profile-back" href="/search/teachers">
            {t("publicProfile.back")}
          </a>
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
          <a className="profile-back" href="/search/teachers">
            {t("publicProfile.back")}
          </a>
        </header>
        <div className="profile-content">
          <div className="profile-card profile-card--notice">{t("publicProfile.loading")}</div>
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
        <a className="profile-back" href="/search/teachers">
          {t("publicProfile.back")}
        </a>
      </header>
      <div className="profile-content">
        <TeacherProfileView
          data={data}
          mode={isStudent ? "student" : "preview"}
          onSubscribe={isStudent ? handleSubscribe : undefined}
          subscribeStatus={subscribeStatus}
          isSubscribed={isSubscribed}
        />
      </div>
    </section>
  );
}
