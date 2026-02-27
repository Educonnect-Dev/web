export type AuthUser = {
  id: string;
  email: string;
  role: "student" | "teacher";
};

export type AuthState = {
  user: AuthUser;
  accessToken: string;
};

export type SessionStatus = "ouvert" | "complet" | "annulee" | "terminee";

export type NotificationItem = {
  id: string;
  type: "session_reminder" | "new_content";
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
};
