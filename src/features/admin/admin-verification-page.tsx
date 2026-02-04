import { useMemo, useState } from "react";

import { apiPost } from "../../services/api-client";

type Language = "fr" | "ar";
type Role = "student" | "teacher";

type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

type VerificationStatus = {
  teacherId: string;
  status: "pending" | "verified";
  verifiedAt?: string;
};

const translations = {
  fr: {
    title: "Vérification prof (admin)",
    teacherId: "ID prof",
    verify: "Valider l'identité",
    success: "Prof vérifié.",
    error: "Échec de vérification.",
  },
  ar: {
    title: "توثيق الأستاذ (مشرف)",
    teacherId: "معرّف الأستاذ",
    verify: "تأكيد الهوية",
    success: "تم توثيق الأستاذ.",
    error: "فشل التوثيق.",
  },
};

type AdminVerificationPageProps = {
  user: AuthUser | null;
  language: Language;
};

export function AdminVerificationPage({ user, language }: AdminVerificationPageProps) {
  const copy = useMemo(() => translations[language], [language]);
  const isRtl = language === "ar";
  const [teacherId, setTeacherId] = useState(user?.id ?? "");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleVerify = async () => {
    const response = await apiPost<VerificationStatus>(
      `/teacher-verifications/${teacherId}`,
      {},
      { "x-admin-id": "admin-1", "x-admin-role": "admin" },
    );
    if (response.error) {
      setStatus("error");
      return;
    }
    setStatus("success");
  };

  return (
    <div className="auth-card" dir={isRtl ? "rtl" : "ltr"}>
      <h2 className="auth-title">{copy.title}</h2>
      <div className="auth-form">
        <label htmlFor="teacherId">{copy.teacherId}</label>
        <input
          id="teacherId"
          type="text"
          value={teacherId}
          onChange={(event) => setTeacherId(event.target.value)}
        />
        {status === "success" ? <div className="auth-success">{copy.success}</div> : null}
        {status === "error" ? <div className="auth-error">{copy.error}</div> : null}
        <button className="auth-submit" type="button" onClick={handleVerify}>
          {copy.verify}
        </button>
      </div>
    </div>
  );
}
