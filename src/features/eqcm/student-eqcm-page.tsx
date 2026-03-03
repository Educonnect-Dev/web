import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { StudentDashboardLayout } from "../dashboard/student-dashboard-layout";

const STORAGE_KEY = "educonnect_auth";

type AuthUser = {
  id: string;
  email: string;
  role: "student" | "teacher";
};

type AuthState = {
  user: AuthUser;
  accessToken: string;
};

export function StudentEqcmPage() {
  const { t } = useTranslation();
  const [auth, setAuth] = useState<AuthState | null>(null);

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

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">{t("studentPages.eqcmTitle")}</h1>
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
        <h1>{t("studentPages.eqcmTitle")}</h1>
        <div className="dashboard-card">
          <p>{t("studentPages.eqcmSubtitle")}</p>
          <div className="dashboard-list">
            <div className="dashboard-row">
              <div>
                <strong>{t("studentPages.eqcmItem1Title")}</strong>
                <p>{t("studentPages.eqcmItem1Desc")}</p>
              </div>
              <span className="status status-coming">{t("common.comingSoon")}</span>
            </div>
            <div className="dashboard-row">
              <div>
                <strong>{t("studentPages.eqcmItem2Title")}</strong>
                <p>{t("studentPages.eqcmItem2Desc")}</p>
              </div>
              <span className="status status-coming">{t("common.comingSoon")}</span>
            </div>
          </div>
        </div>
      </section>
    </StudentDashboardLayout>
  );
}
