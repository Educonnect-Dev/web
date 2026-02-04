import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ContentUploadForm } from "../../contents/content-upload-form";
import { apiGet } from "../../../services/api-client";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string } };
};

type Content = {
  id: string;
  title: string;
  type: "video" | "pdf";
  price: number;
  currency: string;
  createdAt: string;
};

type FreeContent = {
  id: string;
  teacherId: string;
  title: string;
  type: "video" | "pdf";
  fileUrl: string;
  createdAt: string;
};

export function TeacherContentsPage() {
  const { auth } = useOutletContext<AuthContext>();
  const { t } = useTranslation();
  const [contents, setContents] = useState<Content[]>([]);
  const [freeContents, setFreeContents] = useState<FreeContent[]>([]);

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

  return (
    <section className="dashboard-section">
      <h1>{t("teacherPages.contentsTitle")}</h1>
      <div className="dashboard-card">
        <ContentUploadForm onCreated={() => {
          loadFreeContents();
          loadPaidContents();
        }} />
      </div>
      <div className="dashboard-card">
        <h2>{t("teacherPages.freeContentsTitle")}</h2>
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Type</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {freeContents.length ? (
              freeContents.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.type.toUpperCase()}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>{t("teacherPages.noFreeContents")}</td>
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
                  <span className="mobile-card__label">Date</span>
                  <span>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</span>
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
              <th>Date</th>
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
                  <td>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>{t("teacherPages.noPaidContents")}</td>
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
                  <span className="mobile-card__label">Date</span>
                  <span>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="mobile-card mobile-card--empty">{t("teacherPages.noPaidContents")}</div>
          )}
        </div>
      </div>
    </section>
  );
}
