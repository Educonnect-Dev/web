import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost, API_BASE_URL } from "../../../services/api-client";
import { TeacherProfileView } from "../../profile/teacher-profile-view";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string }; accessToken: string };
};

type Profile = {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  subject: string;
  level?: string;
  isVerified: boolean;
  teachingLevel?: "lycee" | "cem";
  currentPosition?: string;
  experienceYears?: number;
  avatarUrl?: string;
  avatarPath?: string | null;
};

type PublicProfileView = {
  profile: Profile;
  contents: Array<{ id: string; title: string; type: "video" | "pdf"; price: number; currency: string; isPaid: boolean }>;
  offers: Array<{ id: string; title: string; price: number; currency: string; description: string }>;
};

type Subscriber = {
  id: string;
  studentId: string;
  status: "active" | "canceled";
};

export function SubscriberCountCard({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <div className="dashboard-card">
      <h3>{t("teacherPages.subscribersTitle")}</h3>
      <div className="dashboard-value">{count}</div>
      <p>{t("teacherPages.totalSubscribers")}</p>
    </div>
  );
}

export function TeacherProfilePage() {
  const { auth } = useOutletContext<AuthContext>();
  const { t } = useTranslation();
  const [privateProfile, setPrivateProfile] = useState<Profile | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfileView | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Profile>("/profiles/me").then((response) => {
      if (response.data) {
        const profile = response.data as Profile;
        setPrivateProfile(profile);
        setAvatarUrl(profile.avatarUrl ?? null);
        setAvatarPath(profile.avatarPath ?? null);
      }
    });
    apiGet<PublicProfileView>(`/public-profiles/${auth.user.id}`).then((response) => {
      if (response.data) {
        const profile = response.data.profile;
        setPublicProfile({
          ...response.data,
          profile: {
            ...profile,
            isVerified: Boolean(profile.isVerified),
          },
        });
      }
    });

    apiGet<Subscriber[]>("/subscriptions").then((response) => {
      if (response.data) {
        setSubscriberCount(response.data.length);
      } else {
        setSubscriberCount(0);
      }
    });
  }, [auth.user.id]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth.accessToken || !privateProfile) return;
    setAvatarStatus("uploading");
    setAvatarError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API_BASE_URL}/uploads/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
        credentials: "include",
        body: form,
      });
      const json = (await response.json()) as {
        data?: { path: string; signedUrl: string };
        error?: { message?: string };
      };
      const data = json.data;
      if (!response.ok || json.error || !data?.path || !data.signedUrl) {
        throw new Error(json.error?.message ?? "Upload impossible.");
      }
      const updateResponse = await apiPost<Profile>(
        "/profiles",
        {
          firstName: privateProfile.firstName ?? "",
          lastName: privateProfile.lastName ?? "",
          bio: privateProfile.bio,
          subject: privateProfile.subject,
          level: privateProfile.level,
          teachingLevel: privateProfile.teachingLevel ?? "lycee",
          currentPosition: privateProfile.currentPosition,
          experienceYears: privateProfile.experienceYears,
          avatarPath: data.path,
        },
      );
      if (updateResponse.error) {
        throw new Error(updateResponse.error.message ?? "Enregistrement impossible.");
      }
      setAvatarPath(data.path);
      setAvatarUrl(data.signedUrl);
      setAvatarStatus("success");
      setPrivateProfile((prev) => (prev ? { ...prev, avatarUrl: data.signedUrl, avatarPath: data.path } : prev));
      setPublicProfile((prev) =>
        prev
          ? { ...prev, profile: { ...prev.profile, avatarUrl: data.signedUrl } }
          : prev,
      );
    } catch (err) {
      setAvatarStatus("error");
      setAvatarError(err instanceof Error ? err.message : "Upload impossible.");
    }
  };

  const handleAvatarRemove = async () => {
    if (!avatarPath || !privateProfile) return;
    setAvatarStatus("uploading");
    setAvatarError(null);
    try {
      const deleteResponse = await apiPost<{ ok: boolean }>("/uploads/avatar/delete", { path: avatarPath });
      if (deleteResponse.error) {
        throw new Error(deleteResponse.error.message ?? "Suppression impossible.");
      }
      const updateResponse = await apiPost<Profile>(
        "/profiles",
        {
          firstName: privateProfile.firstName ?? "",
          lastName: privateProfile.lastName ?? "",
          bio: privateProfile.bio,
          subject: privateProfile.subject,
          level: privateProfile.level,
          teachingLevel: privateProfile.teachingLevel ?? "lycee",
          currentPosition: privateProfile.currentPosition,
          experienceYears: privateProfile.experienceYears,
          avatarPath: null,
        },
      );
      if (updateResponse.error) {
        throw new Error(updateResponse.error.message ?? "Enregistrement impossible.");
      }
      setAvatarPath(null);
      setAvatarUrl(null);
      setAvatarStatus("success");
      setPrivateProfile((prev) => (prev ? { ...prev, avatarUrl: undefined, avatarPath: null } : prev));
      setPublicProfile((prev) =>
        prev
          ? { ...prev, profile: { ...prev.profile, avatarUrl: undefined } }
          : prev,
      );
    } catch (err) {
      setAvatarStatus("error");
      setAvatarError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  };

  return (
    <section className="dashboard-section">
      <div className="dashboard-header">
        <div>
          <h1>{t("teacherPages.teacherProfileTitle")}</h1>
        </div>
        <div className="dashboard-actions">
          <a className="btn btn-ghost" href="/onboarding/teacher-profile">
            {t("teacherPages.updateProfile")}
          </a>
        </div>
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-card">
          <h3>{t("teacherPages.privateProfileTitle")}</h3>
          <div className="avatar-uploader" style={{ marginBottom: 16 }}>
            <div className="avatar-preview">
              {avatarUrl ? <img src={avatarUrl} alt="Photo de profil" /> : <span>?</span>}
            </div>
            <input
              id="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
            />
            {avatarUrl ? (
              <button className="btn btn-ghost" type="button" onClick={handleAvatarRemove}>
                Retirer la photo
              </button>
            ) : null}
            {avatarStatus === "uploading" ? <div className="auth-helper">Upload en cours…</div> : null}
            {avatarStatus === "error" && avatarError ? <div className="auth-error">{avatarError}</div> : null}
          </div>
          {privateProfile ? (
            <div className="profile-block">
              {privateProfile.firstName || privateProfile.lastName ? (
                <p>
                  <strong>{t("teacherPages.privateLabels.name")}:</strong>{" "}
                  {[privateProfile.firstName, privateProfile.lastName].filter(Boolean).join(" ")}
                </p>
              ) : null}
              <p><strong>{t("teacherPages.privateLabels.subject")}:</strong> {privateProfile.subject}</p>
              {privateProfile.level ? <p><strong>{t("teacherPages.privateLabels.grade")}:</strong> {privateProfile.level}</p> : null}
              {privateProfile.bio ? <p><strong>{t("teacherPages.privateLabels.bio")}:</strong> {privateProfile.bio}</p> : null}
              {privateProfile.teachingLevel ? (
                <p><strong>{t("teacherPages.privateLabels.teachingLevel")}:</strong> {privateProfile.teachingLevel}</p>
              ) : null}
              {privateProfile.currentPosition ? <p><strong>{t("teacherPages.privateLabels.position")}:</strong> {privateProfile.currentPosition}</p> : null}
              {typeof privateProfile.experienceYears === "number" ? (
                <p><strong>{t("teacherPages.privateLabels.experience")}:</strong> {privateProfile.experienceYears} {t("teacherPages.privateLabels.years")}</p>
              ) : null}
            </div>
          ) : (
            <p>{t("teacherPages.loading")}</p>
          )}
        </div>
        <div className="dashboard-card">
          <h3>{t("teacherPages.publicProfileTitle")}</h3>
          {publicProfile ? <TeacherProfileView data={publicProfile} mode="preview" /> : <p>{t("teacherPages.loading")}</p>}
        </div>
        <SubscriberCountCard count={subscriberCount} />
      </div>
    </section>
  );
}
