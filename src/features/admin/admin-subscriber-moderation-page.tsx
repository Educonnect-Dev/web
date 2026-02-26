import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { apiGet } from "../../services/api-client";

type AdminSubscriberModerationItem = {
  id: string;
  teacherId: string;
  teacherEmail?: string;
  studentId: string;
  studentEmail?: string;
  studentName?: string;
  studentNiveau?: string;
  studentAnnee?: string;
  isBlocked: boolean;
  blockedReason?: string;
  blockedAt?: string;
  isReported: boolean;
  reportReason?: string;
  reportedAt?: string;
  updatedAt?: string;
};

type AdminSubscriberModerationResponse = {
  total: number;
  items: AdminSubscriberModerationItem[];
};

export function AdminSubscriberModerationPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [adminToken, setAdminToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminSubscriberModerationResponse | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "blocked" | "reported" | "both">("all");

  const load = async () => {
    if (!adminToken.trim()) {
      setError("Token admin requis.");
      return;
    }
    setLoading(true);
    setError(null);
    const response = await apiGet<AdminSubscriberModerationResponse>("/admin/subscriber-moderation", {
      Authorization: `Bearer ${adminToken.trim()}`,
    });
    setLoading(false);
    if (response.error || !response.data) {
      setError(response.error?.message ?? "Chargement impossible.");
      return;
    }
    setData(response.data);
  };

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "blocked" && !item.isBlocked) return false;
      if (filter === "reported" && !item.isReported) return false;
      if (filter === "both" && !(item.isBlocked && item.isReported)) return false;
      if (!q) return true;
      const haystack = [
        item.teacherEmail,
        item.teacherId,
        item.studentName,
        item.studentEmail,
        item.studentId,
        item.studentNiveau,
        item.studentAnnee,
        item.blockedReason,
        item.reportReason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search, filter]);

  return (
    <section className="dashboard-section">
      <h1>Admin · Modération abonnés</h1>

      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div className="settings-grid">
          <label>
            <span>Token admin (JWT)</span>
            <input
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="Bearer token admin_access..."
            />
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn-primary" type="button" onClick={load} disabled={loading}>
              {loading ? "Chargement..." : "Charger"}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setData(null);
                setError(null);
              }}
            >
              Vider
            </button>
          </div>
          {error ? <div className="auth-error">{error}</div> : null}
        </div>
      </div>

      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <label>
            <span>Recherche</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="email, nom, id, motif..."
            />
          </label>
          <label>
            <span>Filtre</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
              <option value="all">Tous</option>
              <option value="blocked">Bloqués</option>
              <option value="reported">Signalés</option>
              <option value="both">Bloqués + Signalés</option>
            </select>
          </label>
          <div className="form-hint" style={{ display: "flex", alignItems: "center" }}>
            Total API: {data?.total ?? 0} • Affichés: {filtered.length}
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>Prof</th>
              <th>Élève</th>
              <th>Niveau / Année</th>
              <th>Bloqué</th>
              <th>Signalé</th>
              <th>MAJ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div>{item.teacherEmail || item.teacherId}</div>
                    <small style={{ opacity: 0.7 }}>{item.teacherId}</small>
                  </td>
                  <td>
                    <div>{item.studentName || item.studentEmail || item.studentId}</div>
                    <small style={{ opacity: 0.7 }}>{item.studentEmail || item.studentId}</small>
                  </td>
                  <td>{[item.studentNiveau, item.studentAnnee].filter(Boolean).join(" • ") || "-"}</td>
                  <td>
                    {item.isBlocked ? (
                      <div>
                        <strong style={{ color: "#ff8c8c" }}>Oui</strong>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{item.blockedReason || "-"}</div>
                      </div>
                    ) : (
                      "Non"
                    )}
                  </td>
                  <td>
                    {item.isReported ? (
                      <div>
                        <strong style={{ color: "#ffca7a" }}>Oui</strong>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{item.reportReason || "-"}</div>
                      </div>
                    ) : (
                      "Non"
                    )}
                  </td>
                  <td>{formatDateTime(item.updatedAt, isAr ? "ar-DZ" : "fr-FR")}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>Aucune donnée de modération.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mobile-cards mobile-cards--spaced">
          {filtered.length ? (
            filtered.map((item) => (
              <article key={item.id} className="mobile-card">
                <div className="mobile-card__header">
                  <strong>{item.studentName || item.studentEmail || item.studentId}</strong>
                  <span className="status">
                    {item.isBlocked && item.isReported ? "Bloqué + Signalé" : item.isBlocked ? "Bloqué" : item.isReported ? "Signalé" : "RAS"}
                  </span>
                </div>
                <div className="mobile-card__meta">Prof: {item.teacherEmail || item.teacherId}</div>
                <div className="mobile-card__meta">
                  {[item.studentNiveau, item.studentAnnee].filter(Boolean).join(" • ") || "-"}
                </div>
                {item.isBlocked ? <div className="mobile-card__meta">Blocage: {item.blockedReason || "-"}</div> : null}
                {item.isReported ? <div className="mobile-card__meta">Signalement: {item.reportReason || "-"}</div> : null}
                <div className="mobile-card__meta">MAJ: {formatDateTime(item.updatedAt, isAr ? "ar-DZ" : "fr-FR")}</div>
              </article>
            ))
          ) : (
            <div className="mobile-card mobile-card--empty">Aucune donnée de modération.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function formatDateTime(value?: string, locale: string = "fr-FR"): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
