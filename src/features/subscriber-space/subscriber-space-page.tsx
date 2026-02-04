import { useMemo, useState } from "react";

import { apiGet, apiPost } from "../../services/api-client";

type Language = "fr" | "ar";
type Role = "student" | "teacher";

type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

type SubscriberSpace = {
  id: string;
  teacherId: string;
  isActive: boolean;
  createdAt: string;
};

const translations = {
  fr: {
    title: "Espace abonné",
    activate: "Activer l'espace",
    access: "Tester l'accès",
    active: "Espace activé.",
    blocked: "Accès bloqué (non abonné).",
    ok: "Accès autorisé.",
  },
  ar: {
    title: "مساحة المشتركين",
    activate: "تفعيل المساحة",
    access: "اختبار الوصول",
    active: "تم تفعيل المساحة.",
    blocked: "الوصول مرفوض لغير المشتركين.",
    ok: "تم السماح بالوصول.",
  },
};

type SubscriberSpacePageProps = {
  user: AuthUser | null;
  language: Language;
};

export function SubscriberSpacePage({ user, language }: SubscriberSpacePageProps) {
  const copy = useMemo(() => translations[language], [language]);
  const isRtl = language === "ar";
  const [status, setStatus] = useState<"idle" | "active">("idle");
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  if (!user || user.role !== "teacher") {
    return null;
  }

  const handleActivate = async () => {
    const response = await apiPost<SubscriberSpace>("/subscriber-spaces", { isActive: true });
    if (response.data?.isActive) {
      setStatus("active");
    }
  };

  const handleAccessTest = async () => {
    const response = await apiGet<SubscriberSpace>(`/subscriber-spaces/${user.id}`);
    if (response.error) {
      setAccessMessage(copy.blocked);
      return;
    }
    setAccessMessage(copy.ok);
  };

  return (
    <div className="auth-card" dir={isRtl ? "rtl" : "ltr"}>
      <h2 className="auth-title">{copy.title}</h2>
      <div className="auth-form">
        {status === "active" ? <div className="auth-success">{copy.active}</div> : null}
        <button className="auth-submit" type="button" onClick={handleActivate}>
          {copy.activate}
        </button>

        <button className="secondary-button" type="button" onClick={handleAccessTest}>
          {copy.access}
        </button>
        {accessMessage ? <div className="auth-helper">{accessMessage}</div> : null}
      </div>
    </div>
  );
}
