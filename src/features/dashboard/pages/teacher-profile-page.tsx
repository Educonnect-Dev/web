import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
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
  headline?: string;
  teachingApproach?: string;
  subject: string;
  level?: string;
  isVerified: boolean;
  teachingLevel?: "lycee" | "cem";
  currentPosition?: string;
  experienceYears?: number;
  city?: string;
  languages?: string[];
  specialtyTags?: string[];
  contactWhatsapp?: string;
  contactTelegram?: string;
  websiteUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  bookingUrl?: string;
  coverPath?: string | null;
  coverImageUrl?: string;
  accentColor?: string;
  avatarUrl?: string;
  avatarPath?: string | null;
};

type PublicProfileView = {
  profile: Profile;
  contents: Array<{ id: string; title: string; type: "video" | "pdf"; price: number; currency: string; isPaid: boolean }>;
  offers: Array<{ id: string; title: string; price: number; currency: string; description: string }>;
};

export function TeacherProfilePage() {
  const { auth } = useOutletContext<AuthContext>();
  const { t } = useTranslation();
  const [privateProfile, setPrivateProfile] = useState<Profile | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfileView | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverStatus, setCoverStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [coverError, setCoverError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Profile>("/profiles/me").then((response) => {
      if (response.data) {
        const profile = response.data as Profile;
        setPrivateProfile(profile);
        setAvatarUrl(profile.avatarUrl ?? null);
        setAvatarPath(profile.avatarPath ?? null);
        setCoverUrl(profile.coverImageUrl ?? null);
        setCoverPath(profile.coverPath ?? null);
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
  }, [auth.user.id]);

  const splitCsv = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const buildPayload = (
    profile: Profile,
    avatarPathValue: string | null | undefined,
    coverPathValue: string | null | undefined,
  ) => ({
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    bio: profile.bio || undefined,
    headline: profile.headline || undefined,
    teachingApproach: profile.teachingApproach || undefined,
    subject: profile.subject,
    level: profile.level || undefined,
    teachingLevel: profile.teachingLevel ?? "lycee",
    currentPosition: profile.currentPosition || undefined,
    experienceYears: profile.experienceYears,
    city: profile.city || undefined,
    languages: profile.languages ?? [],
    specialtyTags: profile.specialtyTags ?? [],
    contactWhatsapp: profile.contactWhatsapp || undefined,
    contactTelegram: profile.contactTelegram || undefined,
    websiteUrl: profile.websiteUrl || undefined,
    youtubeUrl: profile.youtubeUrl || undefined,
    linkedinUrl: profile.linkedinUrl || undefined,
    instagramUrl: profile.instagramUrl || undefined,
    facebookUrl: profile.facebookUrl || undefined,
    tiktokUrl: profile.tiktokUrl || undefined,
    bookingUrl: profile.bookingUrl || undefined,
    coverPath: coverPathValue,
    coverImageUrl: profile.coverImageUrl || undefined,
    accentColor: profile.accentColor || undefined,
    avatarPath: avatarPathValue,
  });

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
        buildPayload(privateProfile, data.path, coverPath ?? undefined),
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
        buildPayload(privateProfile, null, coverPath ?? undefined),
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

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth.accessToken || !privateProfile) return;
    setCoverStatus("uploading");
    setCoverError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API_BASE_URL}/uploads/cover`, {
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
        buildPayload(privateProfile, avatarPath ?? undefined, data.path),
      );
      if (updateResponse.error) {
        throw new Error(updateResponse.error.message ?? "Enregistrement impossible.");
      }
      setCoverPath(data.path);
      setCoverUrl(data.signedUrl);
      setCoverStatus("success");
      setPrivateProfile((prev) => (prev ? { ...prev, coverPath: data.path, coverImageUrl: data.signedUrl } : prev));
      setPublicProfile((prev) =>
        prev
          ? { ...prev, profile: { ...prev.profile, coverImageUrl: data.signedUrl } }
          : prev,
      );
    } catch (err) {
      setCoverStatus("error");
      setCoverError(err instanceof Error ? err.message : "Upload impossible.");
    }
  };

  const handleCoverRemove = async () => {
    if (!privateProfile) return;
    setCoverStatus("uploading");
    setCoverError(null);
    try {
      if (coverPath) {
        const deleteResponse = await apiPost<{ ok: boolean }>("/uploads/cover/delete", { path: coverPath });
        if (deleteResponse.error) {
          throw new Error(deleteResponse.error.message ?? "Suppression impossible.");
        }
      }
      const updateResponse = await apiPost<Profile>(
        "/profiles",
        buildPayload({ ...privateProfile, coverImageUrl: undefined }, avatarPath ?? undefined, null),
      );
      if (updateResponse.error) {
        throw new Error(updateResponse.error.message ?? "Enregistrement impossible.");
      }
      setCoverPath(null);
      setCoverUrl(null);
      setCoverStatus("success");
      setPrivateProfile((prev) => (prev ? { ...prev, coverPath: null, coverImageUrl: undefined } : prev));
      setPublicProfile((prev) =>
        prev
          ? { ...prev, profile: { ...prev.profile, coverImageUrl: undefined } }
          : prev,
      );
    } catch (err) {
      setCoverStatus("error");
      setCoverError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  };

  const handleSaveProfile = async () => {
    if (!privateProfile) return;
    setSaveStatus(null);
    setSaveError(null);
    const response = await apiPost<Profile>(
      "/profiles",
      buildPayload(privateProfile, avatarPath ?? undefined, coverPath ?? undefined),
    );
    if (response.error) {
      setSaveError(response.error.message);
      return;
    }
    if (response.data) {
      const next = response.data as Profile;
      setPrivateProfile(next);
      setAvatarPath(next.avatarPath ?? null);
      setAvatarUrl(next.avatarUrl ?? null);
      setCoverPath(next.coverPath ?? null);
      setCoverUrl(next.coverImageUrl ?? null);
      setPublicProfile((prev) => (prev ? { ...prev, profile: { ...prev.profile, ...next } } : prev));
    }
    setSaveStatus("Profil enregistré.");
  };

  const coverPreviewUrl = coverUrl ?? privateProfile?.coverImageUrl ?? null;

  return (
    <section className="dashboard-section">
      <div className="dashboard-header">
        <div>
          <h1>{t("teacherPages.teacherProfileTitle")}</h1>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-ghost" to="/onboarding/teacher-profile">
            {t("teacherPages.updateProfile")}
          </Link>
          <Link className="btn btn-ghost" to={`/public-profiles/${auth.user.id}`} target="_blank" rel="noreferrer">
            Voir le profil public
          </Link>
          <Link className="btn btn-ghost" to="/dashboard/teacher/contents">
            Gérer les contenus
          </Link>
          <Link className="btn btn-ghost" to="/dashboard/teacher/settings">
            Gérer les offres
          </Link>
        </div>
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-card dashboard-card--public-preview">
          <h3>{t("teacherPages.publicProfileTitle")}</h3>
          {publicProfile ? <TeacherProfileView data={publicProfile} mode="preview" /> : <p>{t("teacherPages.loading")}</p>}
        </div>
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
          <div className="avatar-uploader" style={{ marginBottom: 16 }}>
            <label htmlFor="cover">Image de couverture (jpg, png, webp)</label>
            <div className="cover-preview">
              {coverPreviewUrl ? (
                <img src={coverPreviewUrl} alt="Image de couverture" />
              ) : (
                <span>Aperçu couverture</span>
              )}
            </div>
            <input
              id="cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverChange}
            />
            {coverUrl || coverPath ? (
              <button className="btn btn-ghost" type="button" onClick={handleCoverRemove}>
                Retirer la couverture
              </button>
            ) : null}
            {coverStatus === "uploading" ? <div className="auth-helper">Upload en cours…</div> : null}
            {coverStatus === "error" && coverError ? <div className="auth-error">{coverError}</div> : null}
          </div>
          {privateProfile ? (
            <div className="profile-block">
              <label>Prénom</label>
              <input
                value={privateProfile.firstName ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, firstName: event.target.value } : prev))}
              />
              <label>Nom</label>
              <input
                value={privateProfile.lastName ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, lastName: event.target.value } : prev))}
              />
              <label>Accroche</label>
              <input
                value={privateProfile.headline ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, headline: event.target.value } : prev))}
              />
              <label>Bio</label>
              <textarea
                value={privateProfile.bio ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, bio: event.target.value } : prev))}
              />
              <label>Méthode pédagogique</label>
              <textarea
                value={privateProfile.teachingApproach ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, teachingApproach: event.target.value } : prev))}
              />
              <label>Matière</label>
              <input
                value={privateProfile.subject}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, subject: event.target.value } : prev))}
              />
              <label>Niveau</label>
              <input
                value={privateProfile.level ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, level: event.target.value } : prev))}
              />
              <label>Niveau enseigné</label>
              <select
                value={privateProfile.teachingLevel ?? "lycee"}
                onChange={(event) =>
                  setPrivateProfile((prev) =>
                    prev ? { ...prev, teachingLevel: event.target.value as "lycee" | "cem" } : prev,
                  )
                }
              >
                <option value="lycee">Lycée</option>
                <option value="cem">CEM</option>
              </select>
              <label>Poste</label>
              <input
                value={privateProfile.currentPosition ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, currentPosition: event.target.value } : prev))}
              />
              <label>Expérience (années)</label>
              <input
                type="number"
                min={0}
                max={60}
                value={privateProfile.experienceYears ?? ""}
                onChange={(event) =>
                  setPrivateProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          experienceYears: event.target.value === "" ? undefined : Number(event.target.value),
                        }
                      : prev,
                  )
                }
              />
              <label>Ville</label>
              <input
                value={privateProfile.city ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, city: event.target.value } : prev))}
              />
              <label>Langues (virgule)</label>
              <input
                value={(privateProfile.languages ?? []).join(", ")}
                onChange={(event) =>
                  setPrivateProfile((prev) =>
                    prev ? { ...prev, languages: splitCsv(event.target.value) } : prev,
                  )
                }
              />
              <label>Spécialités (virgule)</label>
              <input
                value={(privateProfile.specialtyTags ?? []).join(", ")}
                onChange={(event) =>
                  setPrivateProfile((prev) =>
                    prev ? { ...prev, specialtyTags: splitCsv(event.target.value) } : prev,
                  )
                }
              />
              <label>WhatsApp</label>
              <input
                value={privateProfile.contactWhatsapp ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, contactWhatsapp: event.target.value } : prev))}
              />
              <label>Telegram</label>
              <input
                value={privateProfile.contactTelegram ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, contactTelegram: event.target.value } : prev))}
              />
              <label>Site web</label>
              <input
                value={privateProfile.websiteUrl ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, websiteUrl: event.target.value } : prev))}
              />
              <label>YouTube</label>
              <input
                value={privateProfile.youtubeUrl ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, youtubeUrl: event.target.value } : prev))}
              />
              <label>LinkedIn</label>
              <input
                value={privateProfile.linkedinUrl ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, linkedinUrl: event.target.value } : prev))}
              />
              <label>Instagram</label>
              <input
                value={privateProfile.instagramUrl ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, instagramUrl: event.target.value } : prev))}
              />
              <label>Facebook</label>
              <input
                value={privateProfile.facebookUrl ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, facebookUrl: event.target.value } : prev))}
              />
              <label>TikTok</label>
              <input
                value={privateProfile.tiktokUrl ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, tiktokUrl: event.target.value } : prev))}
              />
              <label>Lien de réservation</label>
              <input
                value={privateProfile.bookingUrl ?? ""}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, bookingUrl: event.target.value } : prev))}
              />
              <label>Image de couverture (URL)</label>
              <input
                value={privateProfile.coverImageUrl ?? ""}
                onChange={(event) => {
                  setCoverPath(null);
                  setCoverUrl(event.target.value || null);
                  setPrivateProfile((prev) =>
                    prev ? { ...prev, coverPath: null, coverImageUrl: event.target.value } : prev,
                  );
                }}
              />
              <label>Couleur d'accent</label>
              <input
                type="color"
                value={privateProfile.accentColor ?? "#f38b1e"}
                onChange={(event) => setPrivateProfile((prev) => (prev ? { ...prev, accentColor: event.target.value } : prev))}
              />
              <div className="auth-actions">
                <button className="btn btn-primary" type="button" onClick={handleSaveProfile}>
                  Enregistrer les personnalisations
                </button>
              </div>
              {saveError ? <div className="auth-error">{saveError}</div> : null}
              {saveStatus ? <div className="auth-success">{saveStatus}</div> : null}
            </div>
          ) : (
            <p>{t("teacherPages.loading")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
