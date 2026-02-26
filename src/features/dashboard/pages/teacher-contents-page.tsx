import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ContentUploadForm } from "../../contents/content-upload-form";
import { apiDelete, apiGet, apiPatch } from "../../../services/api-client";
import { studentAnneeOptions, studentNiveauOptions } from "../../profile/profile-options";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string } };
};

type Content = {
  id: string;
  title: string;
  type: "video" | "pdf";
  price: number;
  currency: string;
  niveau?: string;
  annee?: string;
  createdAt: string;
};

type FreeContent = {
  id: string;
  teacherId: string;
  title: string;
  type: "video" | "pdf";
  niveau?: string;
  annee?: string;
  fileUrl: string;
  createdAt: string;
};

type ContentEditModalState =
  | { kind: "free"; id: string; title: string; niveau: string; annee: string }
  | { kind: "paid"; id: string; title: string; price: number; niveau: string; annee: string };

export function TeacherContentsPage() {
  const { auth } = useOutletContext<AuthContext>();
  const { t } = useTranslation();
  const [contents, setContents] = useState<Content[]>([]);
  const [freeContents, setFreeContents] = useState<FreeContent[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<ContentEditModalState | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const loadPaidContents = () => {
    apiGet<Content[]>("/contents").then((response) => {
      if (response.data) {
        setContents(response.data as Content[]);
      }
    });
  };

  const loadFreeContents = () => {
    apiGet<FreeContent[]>("/free-contents/mine").then((response) => {
      if (response.data) {
        setFreeContents(response.data as FreeContent[]);
      }
    });
  };

  useEffect(() => {
    loadPaidContents();
    loadFreeContents();
  }, [auth.user.id, auth.user.role]);

  const handleEditFreeContent = (item: FreeContent) => {
    setActionMessage(null);
    setEditModal({ kind: "free", id: item.id, title: item.title, niveau: item.niveau ?? "", annee: item.annee ?? "" });
  };

  const submitEditFreeContent = async (state: Extract<ContentEditModalState, { kind: "free" }>) => {
    setEditSaving(true);
    const response = await apiPatch<FreeContent>(`/free-contents/${state.id}`, {
      title: state.title.trim(),
      niveau: state.niveau || undefined,
      annee: state.annee || undefined,
    });
    setEditSaving(false);
    if (response.error) {
      setActionMessage(response.error.message);
      return;
    }
    setEditModal(null);
    setActionMessage("Publication gratuite mise à jour.");
    loadFreeContents();
  };

  const handleDeleteFreeContent = async (item: FreeContent) => {
    setActionMessage(null);
    if (!window.confirm(`Supprimer "${item.title}" ?`)) return;
    const response = await apiDelete<{ deleted: true }>(`/free-contents/${item.id}`);
    if (response.error) {
      setActionMessage(response.error.message);
      return;
    }
    setActionMessage("Publication gratuite supprimée.");
    loadFreeContents();
  };

  const handleEditPaidContent = (item: Content) => {
    setActionMessage(null);
    setEditModal({ kind: "paid", id: item.id, title: item.title, price: item.price, niveau: item.niveau ?? "", annee: item.annee ?? "" });
  };

  const submitEditPaidContent = async (state: Extract<ContentEditModalState, { kind: "paid" }>) => {
    setEditSaving(true);
    const response = await apiPatch<Content>(`/contents/${state.id}`, {
      title: state.title.trim(),
      price: Number(state.price),
      niveau: state.niveau || undefined,
      annee: state.annee || undefined,
    });
    setEditSaving(false);
    if (response.error) {
      setActionMessage(response.error.message);
      return;
    }
    setEditModal(null);
    setActionMessage("Publication payante mise à jour.");
    loadPaidContents();
  };

  const handleDeletePaidContent = async (item: Content) => {
    setActionMessage(null);
    if (!window.confirm(`Supprimer "${item.title}" ?`)) return;
    const response = await apiDelete<{ deleted: true }>(`/contents/${item.id}`);
    if (response.error) {
      setActionMessage(response.error.message);
      return;
    }
    setActionMessage("Publication payante supprimée.");
    loadPaidContents();
  };

  return (
    <section className="dashboard-section">
      <h1>{t("teacherPages.contentsTitle")}</h1>
      <div className="dashboard-card">
        <ContentUploadForm onCreated={() => {
          loadFreeContents();
          loadPaidContents();
        }} />
        {actionMessage ? <div className="form-success" style={{ marginTop: 12 }}>{actionMessage}</div> : null}
      </div>
      <div className="dashboard-card">
        <h2>{t("teacherPages.freeContentsTitle")}</h2>
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Type</th>
              <th>Niveau</th>
              <th>Année</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {freeContents.length ? (
              freeContents.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.type.toUpperCase()}</td>
                  <td>{item.niveau || "-"}</td>
                  <td>{item.annee || "-"}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost" type="button" onClick={() => handleEditFreeContent(item)}>
                        Modifier
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={() => handleDeleteFreeContent(item)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>{t("teacherPages.noFreeContents")}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mobile-cards mobile-cards--spaced">
          {freeContents.length ? (
            freeContents.map((item) => (
              <article key={item.id} className="mobile-card">
                <div className="mobile-card__header">
                  <strong>{item.title}</strong>
                  <span>{item.type.toUpperCase()}</span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">Niveau</span>
                  <span>{item.niveau || "-"}</span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">Année</span>
                  <span>{item.annee || "-"}</span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">Date</span>
                  <span>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
                <div className="mobile-card__actions">
                  <button className="secondary-button" type="button" onClick={() => handleEditFreeContent(item)}>
                    Modifier
                  </button>
                  <button className="secondary-button" type="button" onClick={() => handleDeleteFreeContent(item)}>
                    Supprimer
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="mobile-card mobile-card--empty">{t("teacherPages.noFreeContents")}</div>
          )}
        </div>
      </div>
      <div className="dashboard-card">
        <h2>{t("teacherPages.paidContentsTitle")}</h2>
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Type</th>
              <th>Prix</th>
              <th>Niveau</th>
              <th>Année</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contents.length ? (
              contents.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.type.toUpperCase()}</td>
                  <td>
                    {item.price} {item.currency}
                  </td>
                  <td>{item.niveau || "-"}</td>
                  <td>{item.annee || "-"}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost" type="button" onClick={() => handleEditPaidContent(item)}>
                        Modifier
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={() => handleDeletePaidContent(item)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>{t("teacherPages.noPaidContents")}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mobile-cards mobile-cards--spaced">
          {contents.length ? (
            contents.map((item) => (
              <article key={item.id} className="mobile-card">
                <div className="mobile-card__header">
                  <strong>{item.title}</strong>
                  <span>{item.type.toUpperCase()}</span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">Prix</span>
                  <span>
                    {item.price} {item.currency}
                  </span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">Niveau</span>
                  <span>{item.niveau || "-"}</span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">Année</span>
                  <span>{item.annee || "-"}</span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">Date</span>
                  <span>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
                <div className="mobile-card__actions">
                  <button className="secondary-button" type="button" onClick={() => handleEditPaidContent(item)}>
                    Modifier
                  </button>
                  <button className="secondary-button" type="button" onClick={() => handleDeletePaidContent(item)}>
                    Supprimer
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="mobile-card mobile-card--empty">{t("teacherPages.noPaidContents")}</div>
          )}
        </div>
      </div>
      {editModal ? (
        <div className="crud-modal" role="dialog" aria-modal="true" aria-label="Modifier la publication">
          <button
            className="crud-modal__overlay"
            type="button"
            onClick={() => (editSaving ? null : setEditModal(null))}
            aria-label="Fermer"
          />
          <div className="crud-modal__content">
            <div className="crud-modal__header">
              <h3>
                {editModal.kind === "free" ? "Modifier la publication gratuite" : "Modifier la publication payante"}
              </h3>
            </div>
            <form
              className="content-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!editModal) return;
                if (editModal.kind === "free") {
                  void submitEditFreeContent(editModal);
                  return;
                }
                void submitEditPaidContent(editModal);
              }}
            >
              <label>
                Titre
                <input
                  value={editModal.title}
                  onChange={(event) =>
                    setEditModal((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                  required
                />
              </label>
              <label>
                Niveau
                <select
                  value={editModal.niveau}
                  onChange={(event) =>
                    setEditModal((prev) => (prev ? { ...prev, niveau: event.target.value } : prev))
                  }
                >
                  <option value="">Sélectionner un niveau</option>
                  {studentNiveauOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Année
                <select
                  value={editModal.annee}
                  onChange={(event) =>
                    setEditModal((prev) => (prev ? { ...prev, annee: event.target.value } : prev))
                  }
                >
                  <option value="">Sélectionner une année</option>
                  {studentAnneeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {editModal.kind === "paid" ? (
                <label>
                  Prix (DZD)
                  <input
                    type="number"
                    min={0}
                    value={editModal.price}
                    onChange={(event) =>
                      setEditModal((prev) =>
                        prev && prev.kind === "paid"
                          ? { ...prev, price: Number(event.target.value) }
                          : prev,
                      )
                    }
                    required
                  />
                </label>
              ) : null}
              <div className="crud-modal__actions">
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setEditModal(null)}
                  disabled={editSaving}
                >
                  Annuler
                </button>
                <button className="btn btn-primary" type="submit" disabled={editSaving}>
                  {editSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
