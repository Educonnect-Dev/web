import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { API_BASE_URL, apiGet, apiPost } from "../../../services/api-client";
import { useLanguage } from "../../../shared/hooks/use-language";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string } };
};

type Settings = {
  emailNotifications: boolean;
  profileVisible: boolean;
  language: "fr" | "ar";
  available: boolean;
};

type ZoomStatus = {
  connected: boolean;
  expiresAt?: string;
};

export function TeacherSettingsPage() {
  const { auth } = useOutletContext<AuthContext>();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const isRtl = language === "ar";
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [zoomStatus, setZoomStatus] = useState<ZoomStatus | null>(null);

  useEffect(() => {
    apiGet<Settings>("/teacher-settings").then((response) => {
      if (response.data) {
        const data = response.data as Settings & { teacherId?: string; updatedAt?: string };
        setSettings({
          emailNotifications: Boolean(data.emailNotifications),
          profileVisible: Boolean(data.profileVisible),
          language: (data.language ?? "fr") as "fr" | "ar",
          available: Boolean(data.available),
        });
        setLanguage((data.language ?? "fr") as "fr" | "ar");
      }
    });
    apiGet<ZoomStatus>("/zoom/oauth/status").then((response) => {
      if (response.data) {
        setZoomStatus(response.data as ZoomStatus);
      }
    });
  }, [auth.user.id, auth.user.role]);

  const handleSave = async () => {
    if (!settings) return;
    const response = await apiPost<Settings>(
      "/teacher-settings",
      {
        emailNotifications: settings.emailNotifications,
        profileVisible: settings.profileVisible,
        language: settings.language,
        available: settings.available,
      },
    );
    if (response.error) {
      setStatus(t("teacherSettings.error"));
      return;
    }
    setStatus(t("teacherSettings.saved"));
  };

  const handleConnectZoom = async () => {
    const response = await apiGet<{ url: string }>("/zoom/oauth/authorize-url");
    if (response.data?.url) {
      window.location.href = response.data.url;
    }
  };

  const handleDisconnectZoom = async () => {
    await apiPost("/zoom/oauth/disconnect", {});
    setZoomStatus({ connected: false });
  };

  return (
    <section className="dashboard-section" dir={isRtl ? "rtl" : "ltr"}>
      <h1>{t("teacherSettings.title")}</h1>
      <div className="dashboard-card">
        {settings ? (
          <div className="settings-grid">
            <label>
              <span>{t("teacherSettings.emailNotifications")}</span>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(event) =>
                  setSettings({ ...settings, emailNotifications: event.target.checked })
                }
              />
            </label>
            <label>
              <span>{t("teacherSettings.profileVisible")}</span>
              <input
                type="checkbox"
                checked={settings.profileVisible}
                onChange={(event) =>
                  setSettings({ ...settings, profileVisible: event.target.checked })
                }
              />
            </label>
            <label>
              <span>{t("teacherSettings.available")}</span>
              <input
                type="checkbox"
                checked={settings.available}
                onChange={(event) => setSettings({ ...settings, available: event.target.checked })}
              />
            </label>
            <label>
              <span>{t("teacherSettings.language")}</span>
              <select
                value={settings.language}
                onChange={(event) =>
                  (() => {
                    const next = event.target.value as "fr" | "ar";
                    setSettings({ ...settings, language: next });
                    setLanguage(next);
                  })()
                }
              >
                <option value="fr">Français</option>
                <option value="ar">Arabe</option>
              </select>
            </label>
            <button className="btn btn-primary" type="button" onClick={handleSave}>
              {t("teacherSettings.save")}
            </button>
            {status ? <div className="form-success">{status}</div> : null}
          </div>
        ) : (
          <p>{t("teacherSettings.loading")}</p>
        )}
      </div>
      <div className="dashboard-card">
        <h2>{t("teacherSettings.zoomTitle")}</h2>
        {zoomStatus?.connected ? (
          <>
            <p>{t("teacherSettings.zoomConnected")}</p>
            <button className="btn btn-ghost" type="button" onClick={handleDisconnectZoom}>
              {t("teacherSettings.zoomDisconnect")}
            </button>
          </>
        ) : (
          <button className="btn btn-primary" type="button" onClick={handleConnectZoom}>
            {t("teacherSettings.zoomConnect")}
          </button>
        )}
      </div>
    </section>
  );
}
