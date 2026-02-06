import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../services/api-client";
import { getStoredAuth } from "../../services/auth-storage";
import { useLanguage } from "../../shared/hooks/use-language";
import { getPostAuthRoute } from "./auth-redirect";

type AuthMode = "register" | "login";
type Role = "student" | "teacher";

export type AuthResponse = {
  user: { id: string; email: string; role: Role };
  accessToken?: string;
  refreshToken?: string;
  verificationRequired?: boolean;
};

type PreferencesResponse = {
  userId: string;
  language: "fr" | "ar";
  updatedAt: string;
};

type AuthPageProps = {
  onAuthenticated?: (payload: AuthResponse) => void;
  onLanguageChange?: (language: "fr" | "ar") => void;
  initialLanguage?: "fr" | "ar";
  initialMode?: AuthMode;
};

export function AuthPage({
  onAuthenticated,
  onLanguageChange,
  initialMode = "register",
}: AuthPageProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const { language: lang, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ message: string; details?: unknown } | null>(null);
  const [result, setResult] = useState<AuthResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRtl = lang === "ar";
  const authFromStorage = getStoredAuth();

  useEffect(() => {
    if (!authFromStorage) return;
    apiGet<PreferencesResponse>("/preferences", buildAuthHeaders(authFromStorage)).then(
      (response) => {
        if (response.data?.language) {
          setLanguage(response.data.language);
        }
      },
    );
  }, [authFromStorage, setLanguage]);

  const redirectAfterAuth = async (payload: AuthResponse) => {
    if (payload.user.role === "student") {
      const studentProfile = await apiGet<{ id?: string }>(
        "/student-profiles/me",
        buildAuthHeaders(payload),
      );
      if (!studentProfile.data) {
        navigate("/onboarding/student-profile");
        return;
      }
      navigate(getPostAuthRoute(payload.user.role, false));
      return;
    }
    if (payload.user.role !== "teacher") {
      navigate(getPostAuthRoute(payload.user.role, false));
      return;
    }
    const profileResponse = await apiGet<{
      teachingLevel?: "lycee" | "cem";
    }>(`/profiles/${payload.user.id}`);
    const hasTeachingLevel = Boolean(profileResponse.data?.teachingLevel);
    navigate(getPostAuthRoute(payload.user.role, hasTeachingLevel));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      if (mode === "register") {
        const response = await apiPost<AuthResponse>("/users", { email, password, role });
        if (response.error) {
          setError({ message: response.error.message, details: response.error.details });
        } else if (response.data?.verificationRequired) {
          navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        } else if (response.data?.accessToken) {
          setResult(response.data);
          onAuthenticated?.(response.data);
          window.localStorage.setItem("educonnect_auth", JSON.stringify(response.data));
          await persistLanguage(response.data, lang);
          await redirectAfterAuth(response.data);
        }
      } else {
        const response = await apiPost<AuthResponse>("/auth/sessions", { email, password });
        if (response.error) {
          setError({ message: response.error.message, details: response.error.details });
        } else if (response.data) {
          setResult(response.data);
          onAuthenticated?.(response.data);
          window.localStorage.setItem("educonnect_auth", JSON.stringify(response.data));
          await persistLanguage(response.data, lang);
          await redirectAfterAuth(response.data);
        }
      }
    } catch {
      setError({ message: t("auth.errorTitle") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell" dir={isRtl ? "rtl" : "ltr"}>
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">{t("auth.title")}</h1>
          <div className="lang-switch">
            <button
              type="button"
              className={lang === "fr" ? "active" : ""}
              onClick={() => {
                setLanguage("fr");
                onLanguageChange?.("fr");
                if (authFromStorage) {
                  void persistLanguage(authFromStorage, "fr");
                }
              }}
            >
              FR
            </button>
            <button
              type="button"
              className={lang === "ar" ? "active" : ""}
              onClick={() => {
                setLanguage("ar");
                onLanguageChange?.("ar");
                if (authFromStorage) {
                  void persistLanguage(authFromStorage, "ar");
                }
              }}
            >
              AR
            </button>
          </div>
        </div>

        <div className="mode-toggle">
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            {t("auth.register")}
          </button>
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            {t("auth.login")}
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">{t("auth.emailLabel")}</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">{t("auth.passwordLabel")}</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <p className="auth-helper">{t("auth.helper")}</p>

          {mode === "register" ? (
            <>
              <label htmlFor="role">{t("auth.roleLabel")}</label>
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
              >
                <option value="student">{t("auth.student")}</option>
                <option value="teacher">{t("auth.teacher")}</option>
              </select>
            </>
          ) : null}

          {error ? (
            <div className="auth-error">
              <strong>{t("auth.errorTitle")}</strong>
              <div>{error.message}</div>
              {error.details ? (
                <ul className="auth-details">
                  {Array.isArray(error.details)
                    ? error.details.map((item, index) => (
                        <li key={`${index}-${String(item)}`}>{String(item)}</li>
                      ))
                    : String(error.details)}
                </ul>
              ) : null}
            </div>
          ) : null}

          {result ? (
            <div className="auth-success">
              {t("auth.success")} {result.user.email} ({result.user.role})
            </div>
          ) : null}

          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            {mode === "register" ? t("auth.submitRegister") : t("auth.submitLogin")}
          </button>
        </form>
      </div>
    </div>
  );
}

function buildAuthHeaders(auth: AuthResponse): Record<string, string> {
  if (!auth.accessToken) return {};
  return { Authorization: `Bearer ${auth.accessToken}` };
}

async function persistLanguage(auth: AuthResponse, language: "fr" | "ar") {
  await apiPost<PreferencesResponse>(
    "/preferences/language",
    { language },
    buildAuthHeaders(auth),
  );
}
