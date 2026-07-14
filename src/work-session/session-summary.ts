import type { WorkSession } from "./session-state.js";

export const SESSION_SUMMARY_SCHEMA = "m2-session-summary/0.1.0" as const;

export interface SessionSummary {
  readonly schemaVersion: typeof SESSION_SUMMARY_SCHEMA;
  readonly sessionId: string;
  readonly modeId: WorkSession["modeId"];
  readonly durationActiveMs: number;
  readonly dataSources: readonly ["TIMER"];
  readonly timerOutcome: "COMPLETED" | "CANCELLED";
  readonly interventions: readonly { readonly nudgeId: string; readonly response: string }[];
  readonly missingData: readonly ["CAMERA_NOT_MEASURED"];
  readonly limitations: readonly string[];
  readonly policyVersion: string;
  readonly nextAction: "START_ANOTHER_SESSION" | "REVIEW_SESSION";
}

export function createSessionSummary(session: WorkSession, policyVersion: string, interventions: readonly SessionSummary["interventions"][number][] = []): SessionSummary {
  if (!/^[a-z0-9-]{8,64}$/i.test(session.id) || !Number.isSafeInteger(session.elapsedActiveMs) || session.elapsedActiveMs < 0 || session.state !== "COMPLETED" && session.state !== "CANCELLED") throw new Error("INVALID_SESSION_SUMMARY_SOURCE");
  if (policyVersion.length === 0) throw new Error("INVALID_SESSION_SUMMARY_POLICY");
  return { schemaVersion: SESSION_SUMMARY_SCHEMA, sessionId: session.id, modeId: session.modeId, durationActiveMs: session.elapsedActiveMs, dataSources: ["TIMER"], timerOutcome: session.state, interventions: [...interventions], missingData: ["CAMERA_NOT_MEASURED"], limitations: ["CAMERA_RUNTIME_NOT_USED", "NON_CLINICAL_TIMER_SUMMARY"], policyVersion, nextAction: "START_ANOTHER_SESSION" };
}
