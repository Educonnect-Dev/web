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
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return false;
  }

  const json = (await response.json()) as ApiResponse<{ accessToken: string }>;
  if (!json.data?.accessToken) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return false;
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
