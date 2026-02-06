type AuthResponse = {
  user: { id: string; email: string; role: "student" | "teacher" };
  accessToken?: string;
  refreshToken?: string;
  verificationRequired?: boolean;
};

export function getStoredAuth(): AuthResponse | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("educonnect_auth");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    return null;
  }
}
