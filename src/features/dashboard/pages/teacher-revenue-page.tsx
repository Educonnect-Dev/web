import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet } from "../../../services/api-client";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string } };
};

type Transaction = {
  id: string;
  amount: number;
  createdAt: string;
};

export function TeacherRevenuePage() {
  const { auth } = useOutletContext<AuthContext>();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);

  useEffect(() => {
    apiGet<Transaction[]>("/transactions").then((response) => {
      if (response.data) {
        setTransactions(response.data as Transaction[]);
        setTotalAmount(Number(response.meta?.totalAmount ?? 0));
      }
    });
  }, [auth.user.id, auth.user.role]);

  return (
    <section className="dashboard-section">
      <h1>{t("teacherPages.revenueTitle")}</h1>
      <div className="dashboard-card compact">
        <div className="dashboard-value">{totalAmount} DZD</div>
        <p>{t("teacherPages.totalTransactions")}</p>
      </div>
      <div className="dashboard-card">
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>ID</th>
              <th>Montant</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length ? (
              transactions.map((txn) => (
                <tr key={txn.id}>
                  <td>{txn.id}</td>
                  <td>{txn.amount} DZD</td>
                  <td>{new Date(txn.createdAt).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>{t("teacherPages.noTransactions")}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mobile-cards mobile-cards--spaced">
          {transactions.length ? (
            transactions.map((txn) => (
              <article key={txn.id} className="mobile-card">
                <div className="mobile-card__header">
                  <strong>{txn.id}</strong>
                  <span>{txn.amount} DZD</span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">Date</span>
                  <span>{new Date(txn.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="mobile-card mobile-card--empty">{t("teacherPages.noTransactions")}</div>
          )}
        </div>
      </div>
    </section>
  );
}
