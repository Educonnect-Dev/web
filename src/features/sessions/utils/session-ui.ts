export type StudentSessionStatus = "ouvert" | "complet" | "annulee" | "terminee";

export type StudentSessionRecord = {
  id?: string;
  _id?: string;
  title: string;
  scheduledAt: string;
  status: StudentSessionStatus;
  placesMax?: number;
  enrolledStudentIds?: string[];
  durationMinutes?: number;
  zoomJoinUrl?: string;
  niveau?: string;
  annee?: string;
  teacherName?: string;
  teacherSubject?: string;
};

export type StudentSessionTiming = {
  start: number;
  end: number;
  msToStart: number;
  isLive: boolean;
  isPast: boolean;
  canJoin: boolean;
  isSoon: boolean;
};

export type StudentSessionAccessState =
  | "join_now"
  | "open"
  | "enrolled_wait"
  | "enroll"
  | "full"
  | "ended"
  | "cancelled";

export function getStudentSessionId(session: Pick<StudentSessionRecord, "id" | "_id">) {
  return session.id ?? session._id ?? "";
}

export function getStudentSessionTiming(
  session: Pick<StudentSessionRecord, "scheduledAt" | "durationMinutes">,
  nowMs = Date.now(),
): StudentSessionTiming {
  const start = new Date(session.scheduledAt).getTime();
  const durationMinutes = Math.max(0, session.durationMinutes ?? 60);
  const end = start + durationMinutes * 60 * 1000;
  const msToStart = start - nowMs;
  const isLive = nowMs >= start && nowMs <= end;
  const isPast = nowMs > end;
  const canJoin = isLive || msToStart <= 15 * 60 * 1000;
  const isSoon = msToStart > 0 && msToStart <= 15 * 60 * 1000;

  return { start, end, msToStart, isLive, isPast, canJoin, isSoon };
}

export function isStudentSessionFull(session: Pick<StudentSessionRecord, "status" | "placesMax" | "enrolledStudentIds">) {
  const acceptedCount = session.enrolledStudentIds?.length ?? 0;
  if (session.status === "complet") return true;
  if (typeof session.placesMax !== "number") return false;
  return acceptedCount >= session.placesMax;
}

export function getStudentSessionAccessState(
  session: StudentSessionRecord,
  options: { isEnrolled: boolean; nowMs?: number },
): StudentSessionAccessState {
  const { isEnrolled, nowMs } = options;
  const timing = getStudentSessionTiming(session, nowMs);

  if (session.status === "annulee") return "cancelled";
  if (session.status === "terminee" || timing.isPast) return "ended";
  if (isEnrolled && (timing.canJoin || session.zoomJoinUrl)) return timing.isLive ? "join_now" : "open";
  if (isEnrolled) return "enrolled_wait";
  if (isStudentSessionFull(session)) return "full";
  return "enroll";
}

export async function openStudentJoinUrlPreferApp(joinUrl: string) {
  if (typeof window === "undefined") return;
  window.location.assign(joinUrl);
}
