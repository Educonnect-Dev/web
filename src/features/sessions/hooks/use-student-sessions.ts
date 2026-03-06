import { useEffect, useMemo, useState } from "react";

import { apiGet, apiPost } from "../../../services/api-client";
import {
  getStudentSessionAccessState,
  getStudentSessionId,
  getStudentSessionTiming,
  openStudentJoinUrlPreferApp,
  type StudentSessionRecord,
} from "../utils/session-ui";

type UseStudentSessionsOptions = {
  studentId: string | null | undefined;
  includeCalendar?: boolean;
};

type JoinActionState = {
  loadingSessionId: string | null;
};

export function useStudentSessions({ studentId, includeCalendar = false }: UseStudentSessionsOptions) {
  const [calendarSessions, setCalendarSessions] = useState<StudentSessionRecord[]>([]);
  const [mySessions, setMySessions] = useState<StudentSessionRecord[]>([]);
  const [enrolledSessionIds, setEnrolledSessionIds] = useState<Set<string>>(new Set());
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingMine, setIsLoadingMine] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinState, setJoinState] = useState<JoinActionState>({ loadingSessionId: null });

  useEffect(() => {
    if (!studentId) return;
    let active = true;

    const loadMine = async () => {
      setIsLoadingMine(true);
      const response = await apiGet<StudentSessionRecord[]>(`/sessions/students/${studentId}/sessions`);
      if (!active) return;
      if (response.error) {
        setError(response.error.message);
      }
      if (response.data) {
        const list = response.data as StudentSessionRecord[];
        setMySessions(list);
        const ids = list.map(getStudentSessionId).filter(Boolean);
        setEnrolledSessionIds(new Set(ids));
      }
      setIsLoadingMine(false);
    };

    const loadCalendar = async () => {
      if (!includeCalendar) return;
      setIsLoadingCalendar(true);
      const response = await apiGet<StudentSessionRecord[]>("/sessions/calendar");
      if (!active) return;
      if (response.error) {
        setError(response.error.message);
      }
      if (response.data) {
        setCalendarSessions(response.data as StudentSessionRecord[]);
      }
      setIsLoadingCalendar(false);
    };

    setError(null);
    void loadMine();
    void loadCalendar();

    return () => {
      active = false;
    };
  }, [studentId, includeCalendar]);

  const reload = async () => {
    if (!studentId) return;
    setError(null);

    const minePromise = apiGet<StudentSessionRecord[]>(`/sessions/students/${studentId}/sessions`);
    const calendarPromise = includeCalendar ? apiGet<StudentSessionRecord[]>("/sessions/calendar") : null;

    setIsLoadingMine(true);
    if (includeCalendar) setIsLoadingCalendar(true);

    const [mineResponse, calendarResponse] = await Promise.all([minePromise, calendarPromise]);

    if (mineResponse.error) {
      setError(mineResponse.error.message);
    } else if (mineResponse.data) {
      const list = mineResponse.data as StudentSessionRecord[];
      setMySessions(list);
      setEnrolledSessionIds(new Set(list.map(getStudentSessionId).filter(Boolean)));
    }

    if (calendarResponse) {
      if (calendarResponse.error) {
        setError((prev) => prev ?? calendarResponse.error!.message);
      } else if (calendarResponse.data) {
        setCalendarSessions(calendarResponse.data as StudentSessionRecord[]);
      }
    }

    setIsLoadingMine(false);
    if (includeCalendar) setIsLoadingCalendar(false);
  };

  const enroll = async (sessionId: string, options?: { sessionFullMessage?: string }) => {
    const response = await apiPost<StudentSessionRecord>(`/sessions/${sessionId}/enroll`, {});
    if (response.error) {
      setError(response.error.code === "SESSION_FULL" && options?.sessionFullMessage ? options.sessionFullMessage : response.error.message);
      return { ok: false as const, error: response.error.message };
    }

    if (response.data) {
      const updated = response.data as StudentSessionRecord;
      setCalendarSessions((prev) => prev.map((item) => (getStudentSessionId(item) === sessionId ? updated : item)));
      setMySessions((prev) => {
        const exists = prev.some((item) => getStudentSessionId(item) === sessionId);
        if (exists) return prev.map((item) => (getStudentSessionId(item) === sessionId ? updated : item));
        return [updated, ...prev];
      });
      setEnrolledSessionIds((prev) => new Set(prev).add(sessionId));
    }

    return { ok: true as const };
  };

  const unenroll = async (sessionId: string) => {
    const response = await apiPost(`/sessions/${sessionId}/unenroll`, {});
    if (response.error) {
      setError(response.error.message);
      return { ok: false as const, error: response.error.message };
    }

    setMySessions((prev) => prev.filter((session) => getStudentSessionId(session) !== sessionId));
    setEnrolledSessionIds((prev) => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
    return { ok: true as const };
  };

  const join = async (sessionId: string) => {
    setJoinState({ loadingSessionId: sessionId });
    setError(null);

    const response = await apiGet<{ zoomJoinUrl: string }>(`/sessions/${sessionId}/join`);
    if (response.error) {
      setJoinState({ loadingSessionId: null });
      setError(response.error.message);
      return { ok: false as const, error: response.error.message };
    }

    const joinUrl = response.data?.zoomJoinUrl;
    if (!joinUrl) {
      setJoinState({ loadingSessionId: null });
      setError("Lien de salle indisponible.");
      return { ok: false as const, error: "Lien de salle indisponible." };
    }

    setJoinState({ loadingSessionId: null });
    await openStudentJoinUrlPreferApp(joinUrl);
    return { ok: true as const };
  };

  const indexedMine = useMemo(
    () =>
      mySessions.map((session) => {
        const sessionId = getStudentSessionId(session);
        const isEnrolled = enrolledSessionIds.has(sessionId);
        return {
          session,
          sessionId,
          isEnrolled,
          timing: getStudentSessionTiming(session),
          accessState: getStudentSessionAccessState(session, { isEnrolled }),
        };
      }),
    [mySessions, enrolledSessionIds],
  );

  const indexedCalendar = useMemo(
    () =>
      calendarSessions.map((session) => {
        const sessionId = getStudentSessionId(session);
        const isEnrolled = enrolledSessionIds.has(sessionId);
        return {
          session,
          sessionId,
          isEnrolled,
          timing: getStudentSessionTiming(session),
          accessState: getStudentSessionAccessState(session, { isEnrolled }),
        };
      }),
    [calendarSessions, enrolledSessionIds],
  );

  return {
    calendarSessions,
    mySessions,
    indexedCalendar,
    indexedMine,
    enrolledSessionIds,
    isLoadingCalendar,
    isLoadingMine,
    isJoiningSessionId: joinState.loadingSessionId,
    error,
    setError,
    reload,
    enroll,
    join,
    unenroll,
  };
}
