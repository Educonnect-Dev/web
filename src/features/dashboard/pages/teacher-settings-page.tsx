import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../../services/api-client";
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

export function TeacherSettingsPage() {
  const { auth } = useOutletContext<AuthContext>();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const isRtl = language === "ar";
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<string | null>(null);

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
    </section>
  );
}
