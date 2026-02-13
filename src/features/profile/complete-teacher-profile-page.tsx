import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const [subject, setSubject] = useState(subjectOptions[0]?.value ?? "");
  const [level, setLevel] = useState("");
  const [teachingLevel, setTeachingLevel] = useState<"lycee" | "cem">("lycee");
  const [currentPosition, setCurrentPosition] = useState("");
  const [experienceYears, setExperienceYears] = useState<number | "">("");
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
          subject?: string;
          level?: string;
          teachingLevel?: "lycee" | "cem";
          currentPosition?: string;
          experienceYears?: number;
          avatarUrl?: string;
          avatarPath?: string | null;
        };
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
        setBio(data.bio ?? "");
        setSubject(data.subject ?? subjectOptions[0]?.value ?? "");
        setLevel(data.level ?? "");
        setTeachingLevel(data.teachingLevel ?? "lycee");
        setCurrentPosition(data.currentPosition ?? "");
        setExperienceYears(
          typeof data.experienceYears === "number" ? data.experienceYears : "",
        );
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
          <a className="btn btn-primary" href="/login">
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const response = await apiPost(
      "/profiles",
      {
        firstName,
        lastName,
        bio: bio || undefined,
        subject,
        level: level || undefined,
        teachingLevel,
        currentPosition: currentPosition || undefined,
        experienceYears: experienceYears === "" ? undefined : Number(experienceYears),
        avatarPath: avatarPath === null ? null : avatarPath ?? undefined,
      },
    );
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
        {
          firstName,
          lastName,
          bio: bio || undefined,
          subject,
          level: level || undefined,
          teachingLevel,
          currentPosition: currentPosition || undefined,
          experienceYears: experienceYears === "" ? undefined : Number(experienceYears),
          avatarPath: null,
        },
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

          <label htmlFor="currentPosition">Poste actuel (optionnel)</label>
          <input
            id="currentPosition"
            value={currentPosition}
            onChange={(event) => setCurrentPosition(event.target.value)}
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

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="btn btn-primary" type="submit">
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  );
}
