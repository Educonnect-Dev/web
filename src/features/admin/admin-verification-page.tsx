import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiGet, apiPatch } from "../../services/api-client";
import { clearAdminAuth, getStoredAdminAuth } from "./admin-auth-storage";

type AdminUserItem = {
  id: string;
  email: string;
  role: "student" | "teacher";
  teacherVerification?: {
    status: "pending" | "verified";
    verifiedAt?: string;
  };
};

type AdminUsersResponse = {
  total: number;
  page: number;
  limit: number;
  items: AdminUserItem[];
};

export function AdminVerificationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"pending" | "verified">("pending");
  const [users, setUsers] = useState<AdminUsersResponse | null>(null);
  const adminAuth = getStoredAdminAuth();

  const authHeader = useMemo(
    () => (adminAuth ? { Authorization: `Bearer ${adminAuth.accessToken}` } : undefined),
    [adminAuth],
  );

  const loadTeachers = async () => {
    if (!authHeader) {
      navigate("/admin/login", { replace: true });
      return;
    }
    setLoading(true);
    setError(null);
    const search = query.trim();
    const params = new URLSearchParams({
      role: "teacher",
      teacherVerification: filter,
      page: "1",
      limit: "50",
    });
    if (search) params.set("search", search);
    const response = await apiGet<AdminUsersResponse>(`/admin/users?${params.toString()}`, authHeader);
    setLoading(false);
    if (response.error || !response.data) {
      setError(response.error?.message ?? "Chargement impossible.");
      return;
    }
    setUsers(response.data);
  };

  const setVerification = async (teacherId: string, status: "pending" | "verified") => {
    if (!authHeader) {
      navigate("/admin/login", { replace: true });
      return;
    }
    setWorkingId(teacherId);
    setError(null);
    const response = await apiPatch<{ teacherId: string; status: "pending" | "verified" }>(
      `/admin/users/${teacherId}/teacher-verification`,
      { status },
      authHeader,
    );
    setWorkingId(null);
    if (response.error) {
      setError(response.error.message ?? "Mise à jour impossible.");
      return;
    }
    await loadTeachers();
  };

  return (
    <section className="dashboard-section">
      <div className="dashboard-header">
        <div>
          <h1>Admin · Vérification prof</h1>
          <p>Validation des comptes professeurs via le module /admin.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-ghost" to="/admin/subscriber-moderation">
            Modération abonnés
          </Link>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              clearAdminAuth();
              navigate("/admin/login", { replace: true });
            }}
          >
            Déconnexion admin
          </button>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div className="settings-grid">
          <label>
            <span>Recherche</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="email ou id prof"
            />
          </label>
          <label>
            <span>Filtre statut</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value as "pending" | "verified")}>
              <option value="pending">En attente</option>
              <option value="verified">Vérifiés</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn-primary" type="button" onClick={loadTeachers} disabled={loading}>
              {loading ? "Chargement..." : "Charger"}
            </button>
          </div>
          {error ? <div className="auth-error">{error}</div> : null}
        </div>
      </div>

      <div className="dashboard-card">
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>Email</th>
              <th>ID</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users?.items?.length ? (
              users.items.map((item) => {
                const status = item.teacherVerification?.status ?? "pending";
                return (
                  <tr key={item.id}>
                    <td>{item.email}</td>
                    <td>{item.id}</td>
                    <td>{status === "verified" ? "Vérifié" : "En attente"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={workingId === item.id || status === "verified"}
                          onClick={() => setVerification(item.id, "verified")}
                        >
                          Vérifier
                        </button>
                        <button
                          className="btn btn-ghost"
                          type="button"
                          disabled={workingId === item.id || status === "pending"}
                          onClick={() => setVerification(item.id, "pending")}
                        >
                          Remettre en attente
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4}>Aucun prof trouvé.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

