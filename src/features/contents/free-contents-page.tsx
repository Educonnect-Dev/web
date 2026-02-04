import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { apiGet } from "../../services/api-client";

type FreeContent = {
  id: string;
  teacherId: string;
  title: string;
  type: "video" | "pdf";
  fileUrl: string;
  createdAt: string;
};

export function FreeContentsPage() {
  const { t } = useTranslation();
  const [contents, setContents] = useState<FreeContent[]>([]);

  useEffect(() => {
    apiGet<FreeContent[]>("/free-contents").then((response) => {
      if (response.data) {
        setContents(response.data as FreeContent[]);
      }
    });
  }, []);

  return (
    <section className="dashboard-section">
      <h1>{t("teacherPages.freeContentsTitle")}</h1>
      <div className="dashboard-card">
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>{t("teacherPages.title")}</th>
              <th>Type</th>
              <th>Prof</th>
              <th>{t("studentPages.tableDate")}</th>
            </tr>
          </thead>
          <tbody>
            {contents.length ? (
              contents.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.type.toUpperCase()}</td>
                  <td>{item.teacherId}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>{t("teacherPages.noFreeContents")}</td>
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
                  <span className="mobile-card__label">Prof</span>
                  <span>{item.teacherId}</span>
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
    </section>
  );
}
