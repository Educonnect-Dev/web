import { forwardRef } from "react";

import type { NotificationItem } from "../types";

type DashboardNotificationsPopoverProps = {
  ariaLabel: string;
  title: string;
  markAllLabel: string;
  unreadNotifications: number;
  notifications: NotificationItem[];
  dateLocale: string;
  onMarkAllRead: () => void | Promise<void>;
};

export const DashboardNotificationsPopover = forwardRef<HTMLDivElement, DashboardNotificationsPopoverProps>(
  function DashboardNotificationsPopover(
    {
      ariaLabel,
      title,
      markAllLabel,
      unreadNotifications,
      notifications,
      dateLocale,
      onMarkAllRead,
    },
    ref,
  ) {
    return (
      <div className="dashboard-notif-popover" ref={ref} role="dialog" aria-label={ariaLabel}>
        <div className="dashboard-notif-popover__header">
          <strong>{title}</strong>
          {unreadNotifications ? (
            <button className="btn btn-ghost" type="button" onClick={onMarkAllRead}>
              {markAllLabel}
            </button>
          ) : null}
        </div>
        <div className="dashboard-notif-popover__list">
          {notifications.length
            ? notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`dashboard-notif-item${notification.readAt ? "" : " dashboard-notif-item--unread"}`}
                >
                  <strong>{notification.title}</strong>
                  <p>{formatNotificationTeacherLabel(notification.message)}</p>
                  <small>{formatNotificationDate(notification.createdAt, dateLocale)}</small>
                </article>
              ))
            : null}
        </div>
      </div>
    );
  },
);

function formatNotificationTeacherLabel(text: string) {
  return text
    .replace(/^(.+?) a publié\b/u, (_, name: string) => `${withProfessorPrefix(name)} a publié`)
    .replace(/\bavec (.+?) commence bientôt\./u, (_, name: string) => `avec ${withProfessorPrefix(name)} commence bientôt.`);
}

function withProfessorPrefix(name: string) {
  const trimmed = name.trim();
  if (/^(Pr|Prof\.?|Professeur)\b/i.test(trimmed)) return trimmed;
  return `Pr ${trimmed}`;
}

function formatNotificationDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
