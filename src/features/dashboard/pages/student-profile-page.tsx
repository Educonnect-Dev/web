import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../../services/api-client";
import { StudentDashboardLayout } from "../student-dashboard-layout";
import { studentAnneeOptions, studentNiveauOptions } from "../../profile/profile-options";

type AuthUser = {
  id: string;
  email: string;
  role: "student" | "teacher";
};

type AuthState = {
  user: AuthUser;
  accessToken: string;
};

type StudentProfile = {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  lyceeName: string;
  className: string;
  niveau: string;
  annee: string;
  bio?: string;
  city?: string;
  accentColor?: string;
  updatedAt: string;
};

const STORAGE_KEY = "educonnect_auth";

export function StudentProfilePage() {
  const { t } = useTranslation();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNext, setPwdNext] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdStatus, setPwdStatus] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

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
    apiGet<StudentProfile>("/student-profiles/me").then((response) => {
      if (response.data) {
        setProfile(response.data);
      } else {
        setProfile({
          id: "",
          userId: auth.user.id,
          firstName: "",
          lastName: "",
          lyceeName: "",
          className: "",
          niveau: "",
          annee: "",
          bio: "",
          city: "",
          accentColor: "#f38b1e",
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }, [auth]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaveStatus(null);
    setSaveError(null);
    const response = await apiPost<StudentProfile>("/student-profiles", {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      lyceeName: profile.lyceeName,
      className: profile.className,
      niveau: profile.niveau,
      annee: profile.annee,
      bio: profile.bio || undefined,
      city: profile.city || undefined,
      accentColor: profile.accentColor || undefined,
    });
    if (response.error) {
      setSaveError(response.error.message ?? t("studentProfile.saveError"));
      return;
    }
    if (response.data) {
      setProfile(response.data);
      if (typeof window !== "undefined") {
        const nextAccent = response.data.accentColor ?? "#f38b1e";
        window.localStorage.setItem("student_accent_color", nextAccent);
        window.dispatchEvent(
          new CustomEvent("student-accent-updated", {
            detail: { accentColor: nextAccent },
          }),
        );
      }
    }
    setSaveStatus(t("studentProfile.saveSuccess"));
  };

  const handleAccentColorChange = (nextColor: string) => {
    setProfile((prev) => (prev ? { ...prev, accentColor: nextColor } : prev));
    if (typeof window === "undefined") return;
    window.localStorage.setItem("student_accent_color", nextColor);
    window.dispatchEvent(
      new CustomEvent("student-accent-updated", {
        detail: { accentColor: nextColor },
      }),
    );
  };

  const handleChangePassword = async () => {
    setPwdStatus(null);
    setPwdError(null);
    if (pwdNext !== pwdConfirm) {
      setPwdError(t("studentProfile.passwordMismatch"));
      return;
    }
    const response = await apiPost<{ success: boolean }>("/auth/password", {
      currentPassword: pwdCurrent,
      newPassword: pwdNext,
    });
    if (response.error) {
      setPwdError(response.error.message ?? t("studentProfile.passwordError"));
      return;
    }
    setPwdCurrent("");
    setPwdNext("");
    setPwdConfirm("");
    setPwdStatus(t("studentProfile.passwordSuccess"));
  };

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h2>{t("auth.reserved")}</h2>
          <p>{t("auth.loginAsStudent")}</p>
          <Link className="btn btn-primary" to="/login">
            {t("auth.loginCta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <StudentDashboardLayout auth={auth}>
      <section className="dashboard-section">
        <div className="dashboard-header">
          <div>
            <h1>{t("studentProfile.title")}</h1>
          </div>
          <div className="dashboard-actions">
            <Link className="btn btn-ghost" to="/onboarding/student-profile">
              {t("studentProfile.onboarding")}
            </Link>
          </div>
        </div>

        <div className="dashboard-columns">
          <div className="dashboard-card">
            <h3>{t("studentProfile.personalInfo")}</h3>
            {profile ? (
              <div className="profile-block">
                <label>{t("studentProfile.firstName")}</label>
                <input
                  value={profile.firstName ?? ""}
                  onChange={(event) => setProfile((prev) => (prev ? { ...prev, firstName: event.target.value } : prev))}
                />
                <label>{t("studentProfile.lastName")}</label>
                <input
                  value={profile.lastName ?? ""}
                  onChange={(event) => setProfile((prev) => (prev ? { ...prev, lastName: event.target.value } : prev))}
                />
                <label>{t("studentProfile.lycee")}</label>
                <input
                  value={profile.lyceeName ?? ""}
                  onChange={(event) => setProfile((prev) => (prev ? { ...prev, lyceeName: event.target.value } : prev))}
                />
                <label>{t("studentProfile.className")}</label>
                <input
                  value={profile.className ?? ""}
                  onChange={(event) => setProfile((prev) => (prev ? { ...prev, className: event.target.value } : prev))}
                />
                <label>Niveau</label>
                <select
                  value={profile.niveau ?? ""}
                  onChange={(event) => setProfile((prev) => (prev ? { ...prev, niveau: event.target.value } : prev))}
                  required
                >
                  <option value="">Sélectionner un niveau</option>
                  {studentNiveauOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label>Année</label>
                <select
                  value={profile.annee ?? ""}
                  onChange={(event) => setProfile((prev) => (prev ? { ...prev, annee: event.target.value } : prev))}
                  required
                >
                  <option value="">Sélectionner une année</option>
                  {studentAnneeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label>{t("studentProfile.city")}</label>
                <input
                  value={profile.city ?? ""}
                  onChange={(event) => setProfile((prev) => (prev ? { ...prev, city: event.target.value } : prev))}
                />
                <label>{t("studentProfile.bio")}</label>
                <textarea
                  value={profile.bio ?? ""}
                  onChange={(event) => setProfile((prev) => (prev ? { ...prev, bio: event.target.value } : prev))}
                />
                <label>{t("studentProfile.color")}</label>
                <input
                  type="color"
                  value={profile.accentColor ?? "#f38b1e"}
                  onChange={(event) => handleAccentColorChange(event.target.value)}
                />
                <div className="auth-actions">
                  <button className="btn btn-primary" type="button" onClick={handleSaveProfile}>
                    {t("studentProfile.save")}
                  </button>
                </div>
                {saveError ? <div className="auth-error">{saveError}</div> : null}
                {saveStatus ? <div className="auth-success">{saveStatus}</div> : null}
              </div>
            ) : (
              <p>{t("teacherPages.loading")}</p>
            )}
          </div>

          <div className="dashboard-card">
            <h3>{t("studentProfile.passwordTitle")}</h3>
            <div className="profile-block">
              <label>{t("studentProfile.currentPassword")}</label>
              <input type="password" value={pwdCurrent} onChange={(event) => setPwdCurrent(event.target.value)} />
              <label>{t("studentProfile.newPassword")}</label>
              <input type="password" value={pwdNext} onChange={(event) => setPwdNext(event.target.value)} />
              <label>{t("studentProfile.confirmPassword")}</label>
              <input type="password" value={pwdConfirm} onChange={(event) => setPwdConfirm(event.target.value)} />
              <div className="auth-actions">
                <button className="btn btn-primary" type="button" onClick={handleChangePassword}>
                  {t("studentProfile.changePassword")}
                </button>
              </div>
              {pwdError ? <div className="auth-error">{pwdError}</div> : null}
              {pwdStatus ? <div className="auth-success">{pwdStatus}</div> : null}
            </div>
          </div>
        </div>
      </section>
    </StudentDashboardLayout>
  );
}
