import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { apiPost } from "../../services/api-client";
import { storeAdminAuth, type AdminAuthState } from "./admin-auth-storage";

type AdminLoginResponse = {
  admin: AdminAuthState["admin"];
  accessToken: string;
};

export function AdminAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const nextPath = new URLSearchParams(location.search).get("next") || "/admin/verification";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await apiPost<AdminLoginResponse>("/admin-auth/login", { email, password });
    setLoading(false);
    if (response.error || !response.data?.accessToken || !response.data.admin) {
      setError(response.error?.message ?? "Connexion admin impossible.");
      return;
    }
    storeAdminAuth({
      admin: response.data.admin,
      accessToken: response.data.accessToken,
    });
    navigate(nextPath, { replace: true });
  };

  return (
    <section className="dashboard-section" style={{ maxWidth: 520, margin: "40px auto" }}>
      <div className="dashboard-card">
        <h1>Connexion admin</h1>
        <p className="form-hint">Espace réservé à l’administration.</p>
        <form className="settings-grid" onSubmit={handleSubmit}>
          <label>
            <span>Email admin</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Mot de passe</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <div className="auth-error">{error}</div> : null}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => navigate("/")}>
              Retour accueil
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

