import { useMemo, useState } from "react";

import { apiGet, apiPost } from "../../services/api-client";
import { gradeOptions, subjectOptions, teachingLevelOptions } from "./profile-options";

type Language = "fr" | "ar";
type Role = "student" | "teacher";

type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

type Profile = {
  id: string;
  userId: string;
  bio?: string;
  subject: string;
  level?: string;
  isVerified?: boolean;
  teachingLevel?: "lycee" | "cem";
  currentPosition?: string;
  experienceYears?: number;
};

const translations = {
  fr: {
    title: "Profil public du prof",
    bioLabel: "Bio (optionnelle)",
    subjectLabel: "Matière (obligatoire)",
    levelLabel: "Niveau (optionnel)",
    teachingLevelLabel: "Niveau enseigné (obligatoire)",
    currentPositionLabel: "Poste actuel (optionnel)",
    experienceYearsLabel: "Ancienneté (années, optionnel)",
    save: "Enregistrer le profil",
    preview: "Aperçu public",
    success: "Profil enregistré.",
    error: "Impossible d'enregistrer.",
    lycee: "Lycée",
    cem: "CEM",
  },
  ar: {
    title: "الملف العام للأستاذ",
    bioLabel: "نبذة (اختياري)",
    subjectLabel: "المادة (إجباري)",
    levelLabel: "المستوى (اختياري)",
    teachingLevelLabel: "المستوى الدراسي (إجباري)",
    currentPositionLabel: "المنصب الحالي (اختياري)",
    experienceYearsLabel: "سنوات الخبرة (اختياري)",
    save: "حفظ الملف",
    preview: "عرض الملف العام",
    success: "تم حفظ الملف.",
    error: "تعذر الحفظ.",
    lycee: "ثانوي",
    cem: "متوسط",
  },
};

type TeacherProfilePageProps = {
  user: AuthUser | null;
  language: Language;
};

export function TeacherProfilePage({ user, language }: TeacherProfilePageProps) {
  const copy = useMemo(() => translations[language], [language]);
  const isRtl = language === "ar";
  const [bio, setBio] = useState("");
  const [subject, setSubject] = useState(subjectOptions[0]?.value ?? "");
  const [level, setLevel] = useState("");
  const [teachingLevel, setTeachingLevel] = useState<"lycee" | "cem">("lycee");
  const [currentPosition, setCurrentPosition] = useState("");
  const [experienceYears, setExperienceYears] = useState<number | "">("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [preview, setPreview] = useState<Profile | null>(null);

  if (!user || user.role !== "teacher") {
    return null;
  }

  const handleSave = async () => {
    setStatus("idle");
    const response = await apiPost<Profile>(
      "/profiles",
      {
        bio: bio || undefined,
        subject,
        level: level || undefined,
        teachingLevel,
        currentPosition: currentPosition || undefined,
        experienceYears: experienceYears === "" ? undefined : Number(experienceYears),
      },
    );
    if (response.error || !response.data) {
      setStatus("error");
      return;
    }
    setStatus("success");
    setPreview(response.data);
  };

  const handlePreview = async () => {
    if (!user) return;
    const response = await apiGet<Profile>(`/profiles/${user.id}`);
    if (response.data) {
      setPreview(response.data);
    }
  };

  return (
    <div className="auth-card" dir={isRtl ? "rtl" : "ltr"}>
      <h2 className="auth-title">{copy.title}</h2>

      <div className="auth-form">
        <div>
          <label htmlFor="bio">{copy.bioLabel}</label>
          <textarea
            id="bio"
            maxLength={500}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="subject">{copy.subjectLabel}</label>
          <select id="subject" value={subject} onChange={(event) => setSubject(event.target.value)}>
            {subjectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="level">{copy.levelLabel}</label>
          <select id="level" value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="">{language === "ar" ? "غير محدد" : "Non specifie"}</option>
            {gradeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="teachingLevel">{copy.teachingLevelLabel}</label>
          <select
            id="teachingLevel"
            value={teachingLevel}
            onChange={(event) => setTeachingLevel(event.target.value as "lycee" | "cem")}
          >
            {teachingLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === "lycee" ? copy.lycee : copy.cem}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="currentPosition">{copy.currentPositionLabel}</label>
          <input
            id="currentPosition"
            type="text"
            value={currentPosition}
            onChange={(event) => setCurrentPosition(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="experienceYears">{copy.experienceYearsLabel}</label>
          <input
            id="experienceYears"
            type="number"
            min="0"
            max="60"
            value={experienceYears}
            onChange={(event) =>
              setExperienceYears(event.target.value === "" ? "" : Number(event.target.value))
            }
          />
        </div>
        {status === "success" ? <div className="auth-success">{copy.success}</div> : null}
        {status === "error" ? <div className="auth-error">{copy.error}</div> : null}
        <button className="auth-submit" type="button" onClick={handleSave}>
          {copy.save}
        </button>
        <button className="secondary-button" type="button" onClick={handlePreview}>
          {copy.preview}
        </button>
      </div>

      {preview ? (
        <div className="auth-success" style={{ marginTop: 16 }}>
          <strong>{preview.subject}</strong>
          {preview.level ? <span> — {preview.level}</span> : null}{" "}
          {preview.isVerified ? <span>✅</span> : null}
          {preview.bio ? <div>{preview.bio}</div> : null}
          {preview.teachingLevel ? (
            <div>Niveau: {preview.teachingLevel === "lycee" ? copy.lycee : copy.cem}</div>
          ) : null}
          {preview.currentPosition ? <div>{preview.currentPosition}</div> : null}
          {typeof preview.experienceYears === "number" ? (
            <div>{preview.experienceYears} ans d’expérience</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
