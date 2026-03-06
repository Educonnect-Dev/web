import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet } from "../../services/api-client";
import { StudentDashboardLayout } from "../dashboard/student-dashboard-layout";
import { buildPublishedEqcmPath } from "./student-eqcm-utils";

const STORAGE_KEY = "educonnect_auth";

type AuthUser = {
  id: string;
  email: string;
  role: "student" | "teacher";
};

type AuthState = {
  user: AuthUser;
  accessToken: string;
};

type Matiere = "Math" | "Physique" | "Sciences";

const NIVEAU_OPTIONS = ["1AM", "2AM", "3AM", "4AM", "1AS", "2AS", "3AS"] as const;
const MATIERE_OPTIONS_BY_NIVEAU: Record<(typeof NIVEAU_OPTIONS)[number], Matiere[]> = {
  "1AM": ["Math", "Sciences"],
  "2AM": ["Math", "Sciences"],
  "3AM": ["Math", "Physique", "Sciences"],
  "4AM": ["Math", "Physique", "Sciences"],
  "1AS": ["Math", "Physique", "Sciences"],
  "2AS": ["Math", "Physique", "Sciences"],
  "3AS": ["Math", "Physique", "Sciences"],
};

type EqcmPublishedItem = {
  id: string;
  title: string;
  niveau: string;
  matiere: Matiere;
  chapitre: string;
  difficulte: "facile" | "moyen" | "difficile";
  correctionMode: "immediate";
  questionCount: number;
  startsAt?: string;
  publishedAt?: string;
};

export function StudentEqcmPage() {
  const { t } = useTranslation();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [items, setItems] = useState<EqcmPublishedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [niveauFilter, setNiveauFilter] = useState("all");
  const [matiereFilter, setMatiereFilter] = useState<"all" | Matiere>("all");

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
    if (!auth || auth.user.role !== "student") return;
    setLoading(true);
    setError(null);
    apiGet<EqcmPublishedItem[]>(
      buildPublishedEqcmPath({ niveau: niveauFilter, matiere: matiereFilter }),
    )
      .then((response) => {
        if (response.error || !response.data) {
          setError(response.error?.message ?? "Chargement des QCM impossible.");
          return;
        }
        setItems(response.data);
      })
      .finally(() => setLoading(false));
  }, [auth?.user.id, auth?.user.role, niveauFilter, matiereFilter]);

  const niveaux = useMemo(() => [...NIVEAU_OPTIONS], []);
  const availableMatieres = useMemo(() => {
    if (niveauFilter === "all") {
      return ["Math", "Physique", "Sciences"] as Matiere[];
    }
    if (Object.prototype.hasOwnProperty.call(MATIERE_OPTIONS_BY_NIVEAU, niveauFilter)) {
      return MATIERE_OPTIONS_BY_NIVEAU[niveauFilter as (typeof NIVEAU_OPTIONS)[number]];
    }
    return ["Math", "Physique", "Sciences"] as Matiere[];
  }, [niveauFilter]);

  useEffect(() => {
    if (matiereFilter === "all") return;
    if (!availableMatieres.includes(matiereFilter)) {
      setMatiereFilter("all");
    }
  }, [availableMatieres, matiereFilter]);

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">{t("studentPages.eqcmTitle")}</h1>
          <p>{t("auth.loginAsStudent")}</p>
          <Link className="btn btn-primary" to="/login">
            {t("auth.loginCta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <StudentDashboardLayout auth={auth}>
      <section className="dashboard-section">
        <h1>{t("studentPages.eqcmTitle")}</h1>
        <div className="dashboard-card">
          <p>{t("studentPages.eqcmSubtitle")}</p>
          {error ? <div className="auth-error">{error}</div> : null}
          <div className="eqcm-filters">
            <label className="eqcm-filter-control">
              <span>Année/Niveau</span>
              <select value={niveauFilter} onChange={(event) => setNiveauFilter(event.target.value)}>
                <option value="all">Tous</option>
                {niveaux.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="eqcm-filter-control">
              <span>Matière</span>
              <select
                value={matiereFilter}
                onChange={(event) => setMatiereFilter(event.target.value as "all" | "Math" | "Physique" | "Sciences")}
              >
                <option value="all">Toutes</option>
                {availableMatieres.map((matiere) => (
                  <option key={matiere} value={matiere}>
                    {matiere}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {loading ? <p>Chargement...</p> : null}
          <div className="dashboard-list">
            {!loading && items.length === 0 ? (
              <div className="dashboard-row">
                <div>
                  <strong>Aucun QCM publié</strong>
                  <p>Change les filtres ou attends une nouvelle publication.</p>
                </div>
              </div>
            ) : (
              items.map((item) => (
                <div className="dashboard-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      {item.niveau} • {item.matiere} • {item.chapitre}
                    </p>
                  </div>
                  <div className="row-actions">
                    <span className="status">{item.questionCount} questions</span>
                    <Link className="btn btn-ghost" to={`/dashboard/student/eqcm/${item.id}`}>
                      Lancer
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </StudentDashboardLayout>
  );
}
