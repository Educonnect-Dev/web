import { useEffect, useState } from "react";

import { apiGet, apiPost } from "../../../services/api-client";
import type { NotificationItem } from "../types";

type UseDashboardNotificationsOptions = {
  enabled: boolean;
  limit?: number;
  pollMs?: number;
};

export function useDashboardNotifications({
  enabled,
  limit = 8,
  pollMs = 60_000,
}: UseDashboardNotificationsOptions) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const loadNotifications = async () => {
      const response = await apiGet<NotificationItem[]>(`/notifications/me?limit=${limit}`);
      if (!active || !response.data) return;
      setNotifications(response.data);
      setUnreadNotifications(response.data.filter((item) => !item.readAt).length);
    };

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, pollMs);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [enabled, limit, pollMs]);

  const markAllRead = async () => {
    const response = await apiPost<{ modified: number }>("/notifications/read-all", {});
    if (!response.data) return;
    const nowIso = new Date().toISOString();
    setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? nowIso })));
    setUnreadNotifications(0);
  };

  return {
    notifications,
    unreadNotifications,
    markAllRead,
  };
}

