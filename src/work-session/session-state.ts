export type SessionState = "IDLE" | "STARTING" | "ACTIVE" | "PAUSED" | "ENDING" | "COMPLETED" | "CANCELLED" | "RECOVERY_REQUIRED" | "FAILED";
export type SessionEvent = "START" | "STARTED" | "PAUSE" | "RESUME" | "FINISH" | "CANCEL" | "CRASH_RECOVER" | "FAIL";

export interface WorkSession {
  readonly id: string;
  readonly state: SessionState;
  readonly modeId: "BALANCED" | "DEEP_FOCUS" | "HIGH_SUPPORT" | "TIMER_ONLY" | "CUSTOM";
  readonly startedMonotonicMs: number | null;
  readonly lastMonotonicMs: number | null;
  readonly elapsedActiveMs: number;
}

const transitions: Readonly<Record<SessionState, Readonly<Partial<Record<SessionEvent, SessionState>>>>> = {
  IDLE: { START: "STARTING" }, STARTING: { STARTED: "ACTIVE", CANCEL: "CANCELLED", FAIL: "FAILED" }, ACTIVE: { PAUSE: "PAUSED", FINISH: "ENDING", CANCEL: "CANCELLED", CRASH_RECOVER: "RECOVERY_REQUIRED", FAIL: "FAILED" }, PAUSED: { RESUME: "ACTIVE", FINISH: "ENDING", CANCEL: "CANCELLED", CRASH_RECOVER: "RECOVERY_REQUIRED" }, ENDING: { FINISH: "COMPLETED", FAIL: "FAILED" }, COMPLETED: {}, CANCELLED: {}, RECOVERY_REQUIRED: { RESUME: "ACTIVE", CANCEL: "CANCELLED" }, FAILED: {}
};

export function createSession(id: string, modeId: WorkSession["modeId"]): WorkSession {
  if (!/^[a-z0-9-]{8,64}$/i.test(id)) throw new Error("INVALID_SESSION_ID");
  return { id, state: "IDLE", modeId, startedMonotonicMs: null, lastMonotonicMs: null, elapsedActiveMs: 0 };
}

export function recoverSession(id: string, modeId: WorkSession["modeId"], elapsedActiveMs: number): WorkSession {
  if (!/^[a-z0-9-]{8,64}$/i.test(id) || !Number.isSafeInteger(elapsedActiveMs) || elapsedActiveMs < 0) throw new Error("INVALID_RECOVERY_SESSION");
  return { id, modeId, state: "RECOVERY_REQUIRED", startedMonotonicMs: null, lastMonotonicMs: null, elapsedActiveMs };
}

export function applySessionEvent(session: WorkSession, event: SessionEvent, monotonicNowMs: number): WorkSession {
  if (!Number.isFinite(monotonicNowMs) || monotonicNowMs < 0) throw new Error("INVALID_MONOTONIC_TIME");
  const idempotent: Partial<Record<SessionEvent, SessionState>> = { START: "STARTING", STARTED: "ACTIVE", PAUSE: "PAUSED", RESUME: "ACTIVE", FINISH: "COMPLETED", CANCEL: "CANCELLED" };
  if (idempotent[event] === session.state) return session;
  const next = transitions[session.state][event];
  if (next === undefined) throw new Error(`INVALID_SESSION_TRANSITION_${session.state}_${event}`);
  const elapsed = session.state === "ACTIVE" && session.lastMonotonicMs !== null ? session.elapsedActiveMs + Math.max(0, monotonicNowMs - session.lastMonotonicMs) : session.elapsedActiveMs;
  const active = next === "ACTIVE";
  return { ...session, state: next, elapsedActiveMs: elapsed, startedMonotonicMs: session.startedMonotonicMs ?? (active ? monotonicNowMs : null), lastMonotonicMs: active ? monotonicNowMs : null };
}

export function tickSession(session: WorkSession, monotonicNowMs: number): WorkSession {
  if (session.state !== "ACTIVE") return session;
  if (session.lastMonotonicMs === null || monotonicNowMs < session.lastMonotonicMs) throw new Error("MONOTONIC_CLOCK_REGRESSION");
  return { ...session, elapsedActiveMs: session.elapsedActiveMs + monotonicNowMs - session.lastMonotonicMs, lastMonotonicMs: monotonicNowMs };
}
