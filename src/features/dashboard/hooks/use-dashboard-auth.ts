import { useEffect, useState } from "react";

import type { AuthState } from "../types";

export const DASHBOARD_AUTH_STORAGE_KEY = "educonnect_auth";

export function useDashboardAuth() {
  const [auth, setAuth] = useState<AuthState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(DASHBOARD_AUTH_STORAGE_KEY);
    if (!raw) return;
    try {
      setAuth(JSON.parse(raw) as AuthState);
    } catch {
      setAuth(null);
    }
  }, []);

  return auth;
}
