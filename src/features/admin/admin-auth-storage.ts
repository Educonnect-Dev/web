export const ADMIN_AUTH_STORAGE_KEY = "educonnect_admin_auth";

export type AdminAuthState = {
  admin: {
    id: string;
    email: string;
    name: string;
    role: "admin";
    isActive: boolean;
  };
  accessToken: string;
};

export function getStoredAdminAuth(): AdminAuthState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminAuthState;
    if (!parsed?.accessToken || !parsed?.admin?.id || parsed.admin.role !== "admin") {
      window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
      return null;
    }
    if (!isJwtStillValid(parsed.accessToken)) {
      window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    return null;
  }
}

export function storeAdminAuth(next: AdminAuthState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(next));
}

export function clearAdminAuth(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
}

function isJwtStillValid(token: string): boolean {
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now();
}

function decodeJwtPayload<T>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

