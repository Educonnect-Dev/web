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

const TECHNICAL_ERROR_PATTERNS = [
  /^Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+/i,
  /failed to fetch/i,
  /networkerror/i,
  /unexpected token/i,
];

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
  const [showPassword, setShowPassword] = useState(false);
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
      const studentProfile = await apiGet<{ id?: string; niveau?: string; annee?: string }>(
        "/student-profiles/me",
        buildAuthHeaders(payload),
      );
      const hasStudentLevelData = Boolean(studentProfile.data?.niveau && studentProfile.data?.annee);
      if (!studentProfile.data || !hasStudentLevelData) {
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
          setError({ message: toSoftAuthErrorMessage(response.error.code, response.error.message, t) });
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
          if (response.error.code === "EMAIL_NOT_VERIFIED") {
            navigate(`/verify-email?email=${encodeURIComponent(email)}`);
            return;
          }
          setError({ message: toSoftAuthErrorMessage(response.error.code, response.error.message, t) });
        } else if (response.data) {
          setResult(response.data);
          onAuthenticated?.(response.data);
          window.localStorage.setItem("educonnect_auth", JSON.stringify(response.data));
          await persistLanguage(response.data, lang);
          await redirectAfterAuth(response.data);
        }
      }
    } catch {
      setError({ message: t("auth.softTemporary") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell" dir={isRtl ? "rtl" : "ltr"}>
      <div className="auth-card">
        <div className="auth-back-row">
          <button
            className="btn btn-ghost auth-back-btn"
            type="button"
            onClick={() => navigate("/", { replace: true })}
          >
            {t("auth.back")}
          </button>
        </div>
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
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3L21 21" />
                  <path d="M10.58 10.58A2 2 0 0 0 13.42 13.42" />
                  <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8-0.55 1.55-1.44 2.97-2.6 4.13" />
                  <path d="M6.61 6.61C4.62 8.04 3.05 9.89 2 12c1.73 4.89 6 8 11 8 2.03 0 3.94-.52 5.61-1.39" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12S6 4 12 4s10 8 10 8-4 8-10 8S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
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

function toSoftAuthErrorMessage(
  code: string | undefined,
  message: string | undefined,
  t: (key: string) => string,
): string {
  if (code === "INVALID_CREDENTIALS") return t("auth.softInvalidCredentials");
  if (code === "EMAIL_ALREADY_EXISTS") return t("auth.softEmailExists");
  if (code === "RATE_LIMIT") return t("auth.softRateLimit");
  if (code === "EMAIL_NOT_VERIFIED") return t("auth.softEmailNotVerified");
  if (code === "UNAUTHORIZED") return t("auth.softUnauthorized");

  const input = message ?? "";
  const isTechnical = TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(input));
  if (isTechnical || code?.startsWith("HTTP_")) {
    return t("auth.softTemporary");
  }

  return input || t("auth.softTemporary");
}
