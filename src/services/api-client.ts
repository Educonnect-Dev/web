export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
  traceId: string;
};

export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
  meta: Record<string, unknown>;
};

const AUTH_STORAGE_KEY = "educonnect_auth";

export const API_BASE_URL = normalizeApiBaseUrl(
  (import.meta as { env: Record<string, string | undefined> }).env.VITE_API_BASE_URL,
);

export async function apiPost<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, "POST", body, headers);
}

export async function apiGet<T>(path: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, "GET", undefined, headers);
}

async function apiRequest<T>(
  path: string,
  method: "POST" | "GET",
  body?: unknown,
  headers?: Record<string, string>,
  options?: { skipRefresh?: boolean },
): Promise<ApiResponse<T>> {
  const authHeaders = getAuthHeaders();
  const response = await fetch(buildApiUrl(path), {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders, ...(headers ?? {}) },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await response.json()) as ApiResponse<T>;
  if (response.status === 401 && !options?.skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, method, body, headers, { skipRefresh: true });
    }
  }
  return json;
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { accessToken?: string };
    const accessToken = parsed?.accessToken;
    if (!accessToken) return {};
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  } catch {
    return {};
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const response = await fetch(buildApiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!response.ok) return false;
  const json = (await response.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
  if (!json.data?.accessToken) return false;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { accessToken?: string };
    const next = { ...parsed, accessToken: json.data.accessToken };
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  return true;
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function normalizeApiBaseUrl(raw: string | undefined): string {
  const fallback = "http://localhost:3000";
  const input = (raw ?? fallback).trim();
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  return withScheme.replace(/\/+$/, "");
}
