import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPatch, apiPost } from "../../../services/api-client";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string } };
};

type Subscriber = {
  id: string;
  studentId: string;
  status: "active" | "canceled";
  studentName?: string;
  studentEmail?: string;
  studentNiveau?: string;
  studentAnnee?: string;
  moderationStatus?: ModerationStatus;
  blockedReason?: string;
  reportReason?: string;
};

type ModerationStatus = "none" | "blocked" | "reported";

export function TeacherSubscribersPage() {
  const { auth } = useOutletContext<AuthContext>();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const copy = {
    search: isAr ? "بحث" : "Recherche",
    searchPlaceholder: isAr ? "الاسم، البريد، المستوى..." : "Nom, email, niveau...",
    level: isAr ? "المستوى" : "Niveau",
    levelYear: isAr ? "المستوى / السنة" : "Niveau / Année",
    moderationStatus: isAr ? "حالة الإشراف" : "Statut modération",
    all: isAr ? "الكل" : "Tous",
    allF: isAr ? "الكل" : "Toutes",
    active: isAr ? "نشط" : "Actif",
    blocked: isAr ? "محظور" : "Bloqué",
    reported: isAr ? "مبلّغ عنه" : "Signalé",
    canceled: isAr ? "ملغى" : "Annulé",
    displayed: isAr ? "المعروض" : "Affichés",
    total: isAr ? "الإجمالي" : "Total",
    student: isAr ? "التلميذ" : "Élève",
    email: "Email",
    status: isAr ? "الحالة" : "Statut",
    actions: isAr ? "إجراءات" : "Actions",
    remove: isAr ? "حذف" : "Supprimer",
    block: isAr ? "حظر" : "Bloquer",
    unblock: isAr ? "إلغاء الحظر" : "Débloquer",
    report: isAr ? "تبليغ" : "Reporter",
    filtersTitle: isAr ? "إدارة المشتركين" : "Éditeur de modération",
    selectedSubscriber: isAr ? "المشترك المحدد" : "Abonné sélectionné",
    chooseSubscriber: isAr ? "اختر مشتركًا" : "Choisir un abonné",
    reason: isAr ? "السبب / ملاحظة داخلية" : "Motif / note interne",
    reasonPlaceholder: isAr ? "مثال: سبام، إساءة..." : "Ex: spam, harcèlement, tests...",
    removeError: isAr ? "تعذر الحذف." : "Suppression impossible.",
    moderationError: isAr ? "تعذر إجراء التعديل." : "Action de modération impossible.",
    removedOk: isAr ? "تم الحذف (إلغاء الاشتراك)." : "supprimé (abonnement annulé).",
  };
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string>("");
  const [actionReason, setActionReason] = useState("");
  const [search, setSearch] = useState("");
  const [niveauFilter, setNiveauFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked" | "reported">("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Subscriber[]>("/subscriptions").then((response) => {
      if (response.data) {
        setSubscribers(response.data as Subscriber[]);
      }
    });
  }, [auth.user.id, auth.user.role]);

  const niveauOptions = useMemo(
    () =>
      Array.from(new Set(subscribers.map((item) => item.studentNiveau).filter(Boolean) as string[])).sort(
        (a, b) => a.localeCompare(b),
      ),
    [subscribers],
  );

  const filteredSubscribers = subscribers.filter((item) => {
    const moderationStatus = item.moderationStatus ?? "none";
    const query = search.trim().toLowerCase();
    const searchable = [item.studentName, item.studentEmail, item.studentId, item.studentNiveau, item.studentAnnee]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (query && !searchable.includes(query)) return false;
    if (niveauFilter && item.studentNiveau !== niveauFilter) return false;
    if (statusFilter === "active" && moderationStatus !== "none") return false;
    if (statusFilter === "blocked" && moderationStatus !== "blocked") return false;
    if (statusFilter === "reported" && moderationStatus !== "reported") return false;
    return true;
  });

  const selectedSubscriber =
    subscribers.find((item) => item.studentId === selectedSubscriberId) ??
    filteredSubscribers.find((item) => item.studentId === selectedSubscriberId) ??
    null;

  const totalCount = subscribers.length;
  const blockedCount = subscribers.filter((item) => (item.moderationStatus ?? "none") === "blocked").length;
  const reportedCount = subscribers.filter((item) => (item.moderationStatus ?? "none") === "reported").length;

  const getModerationStatus = (subscriber: Subscriber): ModerationStatus => subscriber.moderationStatus ?? "none";

  const getDisplayStatus = (item: Subscriber): string => {
    const moderationStatus = getModerationStatus(item);
    if (moderationStatus === "blocked") return copy.blocked;
    if (moderationStatus === "reported") return copy.reported;
    return item.status === "active" ? copy.active : copy.canceled;
  };

  const selectSubscriber = (studentId: string) => {
    setSelectedSubscriberId(studentId);
    setStatusMessage(null);
  };

  const runAction = async (subscriber: Subscriber | null, action: "block" | "report" | "remove" | "unblock") => {
    if (!subscriber) return;
    const targetLabel = subscriber.studentName || subscriber.studentEmail || subscriber.studentId;
    const reason = actionReason.trim();

    if (action === "remove") {
      const response = await apiPost<{ removed: boolean; studentId: string }>(
        `/subscriptions/${encodeURIComponent(subscriber.studentId)}/remove`,
        {},
      );
      if (response.error || !response.data?.removed) {
        setStatusMessage(copy.removeError);
        return;
      }
      setSubscribers((current) => current.filter((item) => item.studentId !== subscriber.studentId));
      if (selectedSubscriberId === subscriber.studentId) {
        setSelectedSubscriberId("");
      }
      setStatusMessage(`${targetLabel} ${copy.removedOk}`);
      return;
    }

    const moderationAction = action === "unblock" ? "unblock" : action;
    const response = await apiPatch<Subscriber>(
      `/subscriptions/${encodeURIComponent(subscriber.studentId)}/moderation`,
      { action: moderationAction, reason: reason || undefined },
    );
    if (response.error || !response.data) {
      setStatusMessage(copy.moderationError);
      return;
    }

    setSubscribers((current) =>
      current.map((item) => (item.studentId === subscriber.studentId ? { ...item, ...(response.data as Subscriber) } : item)),
    );
    setStatusMessage(
      `${targetLabel} ${action === "block" ? copy.blocked.toLowerCase() : action === "unblock" ? copy.unblock.toLowerCase() : copy.reported.toLowerCase()}${
        reason ? ` (${reason})` : ""
      }.`,
    );
  };

  return (
    <section className="dashboard-section">
      <h1>{t("teacherPages.subscribersTitle")}</h1>

      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            alignItems: "end",
          }}
        >
          <label>
            <span>{copy.search}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
            />
          </label>
          <label>
            <span>{copy.level}</span>
            <select value={niveauFilter} onChange={(event) => setNiveauFilter(event.target.value)}>
              <option value="">{copy.all}</option>
              {niveauOptions.map((niveau) => (
                <option key={niveau} value={niveau}>
                  {niveau}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{copy.moderationStatus}</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "blocked" | "reported")}
            >
              <option value="all">{copy.all}</option>
              <option value="active">{isAr ? "النشطون" : "Actifs"}</option>
              <option value="blocked">{isAr ? "المحظورون" : "Bloqués"}</option>
              <option value="reported">{isAr ? "المبلّغ عنهم" : "Signalés"}</option>
            </select>
          </label>
          <div className="form-hint" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span>{copy.total}: {totalCount}</span>
            <span>{isAr ? "المحظورون" : "Bloqués"}: {blockedCount}</span>
            <span>{isAr ? "المبلّغ عنهم" : "Signalés"}: {reportedCount}</span>
            <span>{copy.displayed}: {filteredSubscribers.length}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <table className="dashboard-table dashboard-table--mobile-hide">
          <thead>
            <tr>
              <th>{copy.student}</th>
              <th>{copy.email}</th>
              <th>{copy.levelYear}</th>
              <th>{copy.status}</th>
              <th>{copy.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubscribers.length ? (
              filteredSubscribers.map((item) => {
                const isSelected = item.studentId === selectedSubscriberId;
                const moderationStatus = getModerationStatus(item);
                const displayStatus = getDisplayStatus(item);
                return (
                  <tr key={item.id} style={isSelected ? { background: "rgba(58,117,255,0.08)" } : undefined}>
                    <td>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "6px 10px", minHeight: "auto" }}
                        onClick={() => selectSubscriber(item.studentId)}
                      >
                        {item.studentName || item.studentId}
                      </button>
                    </td>
                    <td>{item.studentEmail || "-"}</td>
                    <td>{[item.studentNiveau, item.studentAnnee].filter(Boolean).join(" • ") || "-"}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontWeight: 700,
                          fontSize: 12,
                          background:
                            moderationStatus === "blocked"
                              ? "rgba(255, 99, 99, 0.12)"
                              : moderationStatus === "reported"
                                ? "rgba(255, 184, 77, 0.14)"
                                : "rgba(84, 216, 117, 0.12)",
                          color:
                            moderationStatus === "blocked"
                              ? "#ff8c8c"
                              : moderationStatus === "reported"
                                ? "#ffca7a"
                                : "#89e69d",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {displayStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {moderationStatus === "blocked" ? (
                          <button type="button" className="btn" onClick={() => runAction(item, "unblock")}>
                            {copy.unblock}
                          </button>
                        ) : (
                          <button type="button" className="btn" onClick={() => runAction(item, "block")}>
                            {copy.block}
                          </button>
                        )}
                        <button type="button" className="btn" onClick={() => runAction(item, "report")}>
                          {copy.report}
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => runAction(item, "remove")}>
                          {copy.remove}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5}>{t("teacherPages.noSubscribersActive")}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mobile-cards mobile-cards--spaced">
          {filteredSubscribers.length ? (
            filteredSubscribers.map((item) => {
              const moderationStatus = getModerationStatus(item);
              return (
                <article
                  key={item.id}
                  className="mobile-card"
                  style={
                    selectedSubscriberId === item.studentId
                      ? { borderColor: "rgba(58,117,255,0.45)", boxShadow: "0 0 0 1px rgba(58,117,255,0.15) inset" }
                      : undefined
                  }
                >
                  <div className="mobile-card__header">
                    <strong>{item.studentName || item.studentId}</strong>
                    <span className="status">{getDisplayStatus(item)}</span>
                  </div>
                  <div className="mobile-card__meta">{item.studentEmail || "-"}</div>
                  <div className="mobile-card__meta">
                    {[item.studentNiveau, item.studentAnnee].filter(Boolean).join(" • ") || "-"}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <button type="button" className="btn" onClick={() => selectSubscriber(item.studentId)}>
                      Détails
                    </button>
                    {moderationStatus === "blocked" ? (
                        <button type="button" className="btn" onClick={() => runAction(item, "unblock")}>
                          {copy.unblock}
                        </button>
                      ) : (
                      <button type="button" className="btn" onClick={() => runAction(item, "block")}>
                        {copy.block}
                      </button>
                    )}
                    <button type="button" className="btn" onClick={() => runAction(item, "report")}>
                      {copy.report}
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => runAction(item, "remove")}>
                      {copy.remove}
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="mobile-card mobile-card--empty">{t("teacherPages.noSubscribersActive")}</div>
          )}
        </div>
      </div>

      <div className="dashboard-card" style={{ marginTop: 16 }}>
        <h3>{copy.filtersTitle}</h3>
        <div className="settings-grid">
          <label>
            <span>{copy.selectedSubscriber}</span>
            <select
              value={selectedSubscriberId}
              onChange={(event) => {
                setSelectedSubscriberId(event.target.value);
                setStatusMessage(null);
              }}
            >
              <option value="">{copy.chooseSubscriber}</option>
              {filteredSubscribers.map((item) => (
                <option key={item.id} value={item.studentId}>
                  {item.studentName || item.studentEmail || item.studentId}
                </option>
              ))}
            </select>
          </label>

          {selectedSubscriber ? (
            <div className="form-hint" style={{ marginTop: -6 }}>
              {selectedSubscriber.studentEmail || "-"} •{" "}
              {[selectedSubscriber.studentNiveau, selectedSubscriber.studentAnnee].filter(Boolean).join(" • ") || "-"} •{" "}
              {copy.status}: {getDisplayStatus(selectedSubscriber)}
            </div>
          ) : null}

          <label>
            <span>{copy.reason}</span>
            <input
              value={actionReason}
              onChange={(event) => setActionReason(event.target.value)}
              placeholder={copy.reasonPlaceholder}
            />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn"
              type="button"
              disabled={!selectedSubscriber}
              onClick={() => runAction(selectedSubscriber, "block")}
            >
              {copy.block}
            </button>
            <button
              className="btn"
              type="button"
              disabled={!selectedSubscriber}
              onClick={() => runAction(selectedSubscriber, "unblock")}
            >
              {copy.unblock}
            </button>
            <button
              className="btn"
              type="button"
              disabled={!selectedSubscriber}
              onClick={() => runAction(selectedSubscriber, "report")}
            >
              {copy.report}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!selectedSubscriber}
              onClick={() => runAction(selectedSubscriber, "remove")}
            >
              {copy.remove}
            </button>
          </div>

          {statusMessage ? <div className="form-success">{statusMessage}</div> : null}
        </div>
      </div>
    </section>
  );
}
