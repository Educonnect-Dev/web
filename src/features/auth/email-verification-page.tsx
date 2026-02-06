import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiPost } from "../../services/api-client";
import { useLanguage } from "../../shared/hooks/use-language";

type VerifyResponse = { verified: boolean };
type RequestResponse = { sent: boolean };

export function EmailVerificationPage() {
  const { t } = useTranslation();
  const { language: lang } = useLanguage();
  const isRtl = lang === "ar";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const nextEmail = searchParams.get("email");
    const nextCode = searchParams.get("code");
    if (nextEmail) setEmail(nextEmail);
    if (nextCode) setCode(nextCode);
  }, [searchParams]);

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");
    setMessage("");
    try {
      const response = await apiPost<VerifyResponse>("/auth/verify/confirm", { email, code });
      if (response.error) {
        setStatus("error");
        setMessage(response.error.message ?? t("verification.error"));
      } else if (response.data?.verified) {
        setStatus("success");
        setMessage(t("verification.success"));
      } else {
        setStatus("error");
        setMessage(t("verification.error"));
      }
    } catch {
      setStatus("error");
      setMessage(t("verification.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsSubmitting(true);
    setStatus("idle");
    setMessage("");
    try {
      const response = await apiPost<RequestResponse>("/auth/verify/request", { email });
      if (response.error) {
        setStatus("error");
        setMessage(response.error.message ?? t("verification.error"));
      } else if (response.data?.sent) {
        setStatus("success");
        setMessage(t("verification.resent"));
      }
    } catch {
      setStatus("error");
      setMessage(t("verification.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell" dir={isRtl ? "rtl" : "ltr"}>
      <div className="auth-card">
        <h1 className="auth-title">{t("verification.title")}</h1>
        <p className="auth-helper">{t("verification.helper")}</p>

        <form className="auth-form" onSubmit={handleVerify}>
          <label htmlFor="verify-email">{t("verification.emailLabel")}</label>
          <input
            id="verify-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="verify-code">{t("verification.codeLabel")}</label>
          <input
            id="verify-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />

          {status === "error" ? (
            <div className="auth-error">
              <strong>{t("verification.errorTitle")}</strong>
              <div>{message}</div>
            </div>
          ) : null}

          {status === "success" ? (
            <div className="auth-success">{message}</div>
          ) : null}

          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            {t("verification.submit")}
          </button>
        </form>

        <div className="auth-actions">
          <button className="btn btn-secondary" type="button" onClick={handleResend} disabled={isSubmitting}>
            {t("verification.resend")}
          </button>
          <button className="btn btn-link" type="button" onClick={() => navigate("/login")}>
            {t("verification.login")}
          </button>
        </div>
      </div>
    </div>
  );
}
