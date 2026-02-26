import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiGet, apiPost, API_BASE_URL } from "../../services/api-client";
import { gradeOptions, subjectOptions, teachingLevelOptions } from "./profile-options";

type AuthUser = {
  id: string;
  email: string;
  role: "student" | "teacher";
};

type AuthState = {
  user: AuthUser;
  accessToken: string;
};

const STORAGE_KEY = "educonnect_auth";

export function CompleteTeacherProfilePage() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [headline, setHeadline] = useState("");
  const [teachingApproach, setTeachingApproach] = useState("");
  const [subject, setSubject] = useState(subjectOptions[0]?.value ?? "");
  const [level, setLevel] = useState("");
  const [teachingLevel, setTeachingLevel] = useState<"lycee" | "cem">("lycee");
  const [niveau, setNiveau] = useState("");
  const [annee, setAnnee] = useState("");
  const [currentPosition, setCurrentPosition] = useState("");
  const [experienceYears, setExperienceYears] = useState<number | "">("");
  const [city, setCity] = useState("");
  const [languagesInput, setLanguagesInput] = useState("");
  const [specialtyTagsInput, setSpecialtyTagsInput] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [coverSignedUrl, setCoverSignedUrl] = useState<string | null>(null);
  const [coverStatus, setCoverStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [coverError, setCoverError] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState("#f38b1e");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
    if (!auth || auth.user.role !== "teacher") return;
    apiGet("/profiles/me").then((response) => {
      if (response.data) {
        const data = response.data as {
          firstName?: string;
          lastName?: string;
          bio?: string;
          headline?: string;
          teachingApproach?: string;
          subject?: string;
          level?: string;
          teachingLevel?: "lycee" | "cem";
          niveau?: string;
          annee?: string;
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
          coverImageUrl?: string;
          coverPath?: string | null;
          accentColor?: string;
          avatarUrl?: string;
          avatarPath?: string | null;
        };
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
        setBio(data.bio ?? "");
        setHeadline(data.headline ?? "");
        setTeachingApproach(data.teachingApproach ?? "");
        setSubject(data.subject ?? subjectOptions[0]?.value ?? "");
        setLevel(data.level ?? "");
        setTeachingLevel(data.teachingLevel ?? "lycee");
        setNiveau(data.niveau ?? "");
        setAnnee(data.annee ?? "");
        setCurrentPosition(data.currentPosition ?? "");
        setExperienceYears(
          typeof data.experienceYears === "number" ? data.experienceYears : "",
        );
        setCity(data.city ?? "");
        setLanguagesInput((data.languages ?? []).join(", "));
        setSpecialtyTagsInput((data.specialtyTags ?? []).join(", "));
        setContactWhatsapp(data.contactWhatsapp ?? "");
        setContactTelegram(data.contactTelegram ?? "");
        setWebsiteUrl(data.websiteUrl ?? "");
        setYoutubeUrl(data.youtubeUrl ?? "");
        setLinkedinUrl(data.linkedinUrl ?? "");
        setInstagramUrl(data.instagramUrl ?? "");
        setFacebookUrl(data.facebookUrl ?? "");
        setTiktokUrl(data.tiktokUrl ?? "");
        setBookingUrl(data.bookingUrl ?? "");
        setCoverImageUrl(data.coverImageUrl ?? "");
        setCoverPath(data.coverPath ?? null);
        setCoverSignedUrl(data.coverImageUrl ?? null);
        setAccentColor(data.accentColor ?? "#f38b1e");
        setAvatarUrl(data.avatarUrl ?? null);
        setAvatarPath(data.avatarPath ?? null);
      }
    });
  }, [auth]);

  if (!auth || auth.user.role !== "teacher") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">Compléter le profil</h1>
          <p>Connecte‑toi en tant que prof pour continuer.</p>
          <Link className="btn btn-primary" to="/login">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const splitCsv = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const buildPayload = (avatarPathValue: string | null | undefined) => ({
    firstName,
    lastName,
    bio: bio || undefined,
    headline: headline || undefined,
    teachingApproach: teachingApproach || undefined,
    subject,
    level: level || undefined,
    teachingLevel,
    niveau: niveau || undefined,
    annee: annee || undefined,
    currentPosition: currentPosition || undefined,
    experienceYears: experienceYears === "" ? undefined : Number(experienceYears),
    city: city || undefined,
    languages: splitCsv(languagesInput),
    specialtyTags: splitCsv(specialtyTagsInput),
    contactWhatsapp: contactWhatsapp || undefined,
    contactTelegram: contactTelegram || undefined,
    websiteUrl: websiteUrl || undefined,
    youtubeUrl: youtubeUrl || undefined,
    linkedinUrl: linkedinUrl || undefined,
    instagramUrl: instagramUrl || undefined,
    facebookUrl: facebookUrl || undefined,
    tiktokUrl: tiktokUrl || undefined,
    bookingUrl: bookingUrl || undefined,
    coverPath: coverPath === null ? null : coverPath ?? undefined,
    coverImageUrl: coverImageUrl || undefined,
    accentColor: accentColor || undefined,
    avatarPath: avatarPathValue,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const response = await apiPost("/profiles", buildPayload(avatarPath === null ? null : avatarPath ?? undefined));
    if (response.error) {
      setError(response.error.message);
      return;
    }
    navigate("/dashboard/teacher");
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth?.accessToken) return;
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
      if (!response.ok || json.error || !json.data?.path) {
        throw new Error(json.error?.message ?? "Upload impossible.");
      }
      setAvatarPath(json.data.path);
      setAvatarUrl(json.data.signedUrl);
      setAvatarStatus("success");
    } catch (err) {
      setAvatarStatus("error");
      setAvatarError(err instanceof Error ? err.message : "Upload impossible.");
    }
  };

  const handleAvatarRemove = async () => {
    if (!auth?.accessToken || !avatarPath) return;
    setAvatarStatus("uploading");
    setAvatarError(null);
    try {
      await apiPost("/uploads/avatar/delete", { path: avatarPath });
      const response = await apiPost(
        "/profiles",
        buildPayload(null),
      );
      if (response.error) {
        throw new Error(response.error.message ?? "Suppression impossible.");
      }
      setAvatarPath(null);
      setAvatarUrl(null);
      setAvatarStatus("success");
    } catch (err) {
      setAvatarStatus("error");
      setAvatarError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  };

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth?.accessToken) return;
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
      if (!response.ok || json.error || !json.data?.path) {
        throw new Error(json.error?.message ?? "Upload impossible.");
      }
      setCoverPath(json.data.path);
      setCoverSignedUrl(json.data.signedUrl);
      setCoverImageUrl("");
      setCoverStatus("success");
    } catch (err) {
      setCoverStatus("error");
      setCoverError(err instanceof Error ? err.message : "Upload impossible.");
    }
  };

  const handleCoverRemove = async () => {
    if (!auth?.accessToken) return;
    setCoverStatus("uploading");
    setCoverError(null);
    try {
      if (coverPath) {
        await apiPost("/uploads/cover/delete", { path: coverPath });
      }
      const response = await apiPost(
        "/profiles",
        { ...buildPayload(avatarPath === null ? null : avatarPath ?? undefined), coverPath: null, coverImageUrl: undefined },
      );
      if (response.error) {
        throw new Error(response.error.message ?? "Suppression impossible.");
      }
      setCoverPath(null);
      setCoverSignedUrl(null);
      setCoverImageUrl("");
      setCoverStatus("success");
    } catch (err) {
      setCoverStatus("error");
      setCoverError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Complète ton profil prof</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="avatar">Photo de profil (jpg, png, webp)</label>
          <div className="avatar-uploader">
            <div className="avatar-preview">
              {avatarUrl ? <img src={avatarUrl} alt="Photo de profil" /> : <span>?</span>}
            </div>
            <input id="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} />
            {avatarUrl ? (
              <button className="btn btn-ghost" type="button" onClick={handleAvatarRemove}>
                Retirer la photo
              </button>
            ) : null}
            {avatarStatus === "uploading" ? <div className="auth-helper">Upload en cours…</div> : null}
            {avatarStatus === "error" && avatarError ? <div className="auth-error">{avatarError}</div> : null}
          </div>

          <label htmlFor="cover">Image de couverture (jpg, png, webp)</label>
          <div className="avatar-uploader">
            <div className="cover-preview">
              {coverSignedUrl || coverImageUrl ? (
                <img src={coverSignedUrl ?? coverImageUrl} alt="Image de couverture" />
              ) : (
                <span>Aperçu couverture</span>
              )}
            </div>
            <input id="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverChange} />
            {coverSignedUrl || coverPath || coverImageUrl ? (
              <button className="btn btn-ghost" type="button" onClick={handleCoverRemove}>
                Retirer la couverture
              </button>
            ) : null}
            {coverStatus === "uploading" ? <div className="auth-helper">Upload en cours…</div> : null}
            {coverStatus === "error" && coverError ? <div className="auth-error">{coverError}</div> : null}
          </div>

          <label htmlFor="firstName">Prénom</label>
          <input
            id="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />

          <label htmlFor="lastName">Nom</label>
          <input
            id="lastName"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />

          <label htmlFor="bio">Bio (optionnelle, 500 caractères max)</label>
          <textarea
            id="bio"
            maxLength={500}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />

          <label htmlFor="headline">Accroche publique</label>
          <input
            id="headline"
            maxLength={120}
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
          />

          <label htmlFor="teachingApproach">Méthode pédagogique</label>
          <textarea
            id="teachingApproach"
            maxLength={500}
            value={teachingApproach}
            onChange={(event) => setTeachingApproach(event.target.value)}
          />

          <label htmlFor="subject">Matière (obligatoire)</label>
          <select id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} required>
            {subjectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label htmlFor="level">Niveau (optionnel)</label>
          <select id="level" value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="">Non spécifié</option>
            {gradeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label htmlFor="teachingLevel">Niveau enseigné (obligatoire)</label>
          <select
            id="teachingLevel"
            value={teachingLevel}
            onChange={(event) => setTeachingLevel(event.target.value as "lycee" | "cem")}
          >
            {teachingLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label htmlFor="niveau">Niveau (ex: lycée, CEM)</label>
          <input
            id="niveau"
            value={niveau}
            onChange={(event) => setNiveau(event.target.value)}
            placeholder="Lycée"
          />

          <label htmlFor="annee">Année (ex: 1ère)</label>
          <input
            id="annee"
            value={annee}
            onChange={(event) => setAnnee(event.target.value)}
            placeholder="1ère"
          />

          <label htmlFor="currentPosition">Poste actuel (optionnel)</label>
          <input
            id="currentPosition"
            value={currentPosition}
            onChange={(event) => setCurrentPosition(event.target.value)}
          />

          <label htmlFor="city">Ville</label>
          <input id="city" value={city} onChange={(event) => setCity(event.target.value)} />

          <label htmlFor="languages">Langues (séparées par virgule)</label>
          <input
            id="languages"
            value={languagesInput}
            onChange={(event) => setLanguagesInput(event.target.value)}
            placeholder="Français, Arabe"
          />

          <label htmlFor="specialtyTags">Spécialités (séparées par virgule)</label>
          <input
            id="specialtyTags"
            value={specialtyTagsInput}
            onChange={(event) => setSpecialtyTagsInput(event.target.value)}
            placeholder="Bac, Exercices, Révision"
          />

          <label htmlFor="experienceYears">Ancienneté (années, optionnel)</label>
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

          <label htmlFor="contactWhatsapp">WhatsApp</label>
          <input
            id="contactWhatsapp"
            value={contactWhatsapp}
            onChange={(event) => setContactWhatsapp(event.target.value)}
            placeholder="+213..."
          />

          <label htmlFor="contactTelegram">Telegram (@handle)</label>
          <input
            id="contactTelegram"
            value={contactTelegram}
            onChange={(event) => setContactTelegram(event.target.value)}
            placeholder="@educonnect_teacher"
          />

          <label htmlFor="websiteUrl">Site web</label>
          <input
            id="websiteUrl"
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            placeholder="https://..."
          />

          <label htmlFor="youtubeUrl">YouTube URL</label>
          <input
            id="youtubeUrl"
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            placeholder="https://youtube.com/..."
          />

          <label htmlFor="linkedinUrl">LinkedIn URL</label>
          <input
            id="linkedinUrl"
            value={linkedinUrl}
            onChange={(event) => setLinkedinUrl(event.target.value)}
            placeholder="https://linkedin.com/in/..."
          />

          <label htmlFor="instagramUrl">Instagram URL</label>
          <input
            id="instagramUrl"
            value={instagramUrl}
            onChange={(event) => setInstagramUrl(event.target.value)}
            placeholder="https://instagram.com/..."
          />

          <label htmlFor="facebookUrl">Facebook URL</label>
          <input
            id="facebookUrl"
            value={facebookUrl}
            onChange={(event) => setFacebookUrl(event.target.value)}
            placeholder="https://facebook.com/..."
          />

          <label htmlFor="tiktokUrl">TikTok URL</label>
          <input
            id="tiktokUrl"
            value={tiktokUrl}
            onChange={(event) => setTiktokUrl(event.target.value)}
            placeholder="https://tiktok.com/@..."
          />

          <label htmlFor="bookingUrl">Lien de réservation</label>
          <input
            id="bookingUrl"
            value={bookingUrl}
            onChange={(event) => setBookingUrl(event.target.value)}
            placeholder="https://calendly.com/..."
          />

          <label htmlFor="coverImageUrl">Image de couverture (URL)</label>
          <input
            id="coverImageUrl"
            value={coverImageUrl}
            onChange={(event) => {
              setCoverPath(null);
              setCoverSignedUrl(null);
              setCoverImageUrl(event.target.value);
            }}
            placeholder="https://..."
          />

          <label htmlFor="accentColor">Couleur d'accent du profil public</label>
          <input
            id="accentColor"
            type="color"
            value={accentColor}
            onChange={(event) => setAccentColor(event.target.value)}
          />

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="btn btn-primary" type="submit">
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  );
}
