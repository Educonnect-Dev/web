import type { AuthResponse } from "../features/auth/auth-page";

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message?: string } | null;
  meta: Record<string, unknown>;
};

const AUTH_STORAGE_KEY = "educonnect_auth";
const baseUrl = (import.meta as { env: Record<string, string | undefined> }).env
  .VITE_API_BASE_URL ?? "http://localhost:3000";

export async function restoreSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const existing = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!existing) return false;

  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    return keepExistingSession(existing);
  }

  const json = (await response.json()) as ApiResponse<{ accessToken: string }>;
  if (!json.data?.accessToken) {
    return keepExistingSession(existing);
  }

  try {
    const parsed = JSON.parse(existing) as AuthResponse;
    if (!parsed?.user?.role || !parsed?.user?.id || !parsed?.user?.email) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return false;
    }
    const next: AuthResponse = { ...parsed, accessToken: json.data.accessToken };
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return false;
  }

  return true;
}

function keepExistingSession(existing: string): boolean {
  try {
    const parsed = JSON.parse(existing) as AuthResponse;
    if (!parsed?.user?.role || !parsed?.user?.id || !parsed?.user?.email) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return false;
    }
    if (!parsed.accessToken || !isJwtStillValid(parsed.accessToken)) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return false;
  }
}

function isJwtStillValid(token: string): boolean {
  try {
    const payload = decodeJwtPayload<{ exp?: number }>(token);
    if (!payload?.exp) return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function decodeJwtPayload<T>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const json = atob(padded);
  return JSON.parse(json) as T;
}
