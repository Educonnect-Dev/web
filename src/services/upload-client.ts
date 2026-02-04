type UploadResponse = {
  data: { path: string; signedUrl: string; expiresIn: number } | null;
  error: { message: string } | null;
};

const AUTH_STORAGE_KEY = "educonnect_auth";

const baseUrl = (import.meta as { env: Record<string, string | undefined> }).env
  .VITE_API_BASE_URL ?? "http://localhost:3000";

export async function uploadFile(endpoint: "/uploads/pdf" | "/uploads/videos", file: File): Promise<UploadResponse> {
  const authHeaders = getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: { ...authHeaders },
    credentials: "include",
    body: formData,
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return uploadFile(endpoint, file);
    }
  }

  const json = (await response.json()) as UploadResponse;
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
    return { Authorization: `Bearer ${accessToken}` };
  } catch {
    return {};
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!response.ok) return false;
  const json = (await response.json()) as { data?: { accessToken?: string } };
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
