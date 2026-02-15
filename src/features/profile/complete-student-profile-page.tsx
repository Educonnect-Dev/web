import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiGet, apiPost } from "../../services/api-client";
import { useLanguage } from "../../shared/hooks/use-language";

type AuthState = {
  user: { id: string; role: "student" | "teacher"; email: string };
  accessToken: string;
};

type StudentProfile = {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  lyceeName: string;
  className: string;
  updatedAt: string;
};

const STORAGE_KEY = "educonnect_auth";

export function CompleteStudentProfilePage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [lyceeName, setLyceeName] = useState("");
  const [className, setClassName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setAuth(null);
      return;
    }
    try {
      setAuth(JSON.parse(raw) as AuthState);
    } catch {
      setAuth(null);
    }
  }, []);

  useEffect(() => {
    if (!auth || auth.user.role !== "student") return;
    apiGet<StudentProfile>("/student-profiles/me").then((response) => {
      if (response.data) {
        setFirstName(response.data.firstName ?? "");
        setLastName(response.data.lastName ?? "");
        setLyceeName(response.data.lyceeName ?? "");
        setClassName(response.data.className ?? "");
      }
    });
  }, [auth]);

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">Compléter le profil élève</h1>
          <Link className="btn btn-primary" to="/login">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(null);
    const response = await apiPost<StudentProfile>(
      "/student-profiles",
      { firstName, lastName, lyceeName, className },
    );
    if (response.error) {
      setError("Impossible d'enregistrer le profil.");
      return;
    }
    setStatus("Profil élève enregistré.");
    navigate("/dashboard/student");
  };

  return (
    <div className="auth-shell" dir={isRtl ? "rtl" : "ltr"}>
      <div className="auth-card">
        <h1 className="auth-title">Complète ton profil élève</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="firstName">Prénom</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />

          <label htmlFor="lastName">Nom</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />

          <label htmlFor="lyceeName">Lycée</label>
          <input
            id="lyceeName"
            type="text"
            value={lyceeName}
            onChange={(event) => setLyceeName(event.target.value)}
            required
          />

          <label htmlFor="className">Classe</label>
          <input
            id="className"
            type="text"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
            required
          />

          {error ? <div className="auth-error">{error}</div> : null}
          {status ? <div className="auth-success">{status}</div> : null}

          <button className="btn btn-primary" type="submit">
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  );
}
