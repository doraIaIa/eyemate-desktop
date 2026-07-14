import { ANALYTICS_SCHEMA_VERSION, type AnalyticsInput, validateAnalyticsInput } from "./analytics.js";

export interface WorkSessionAnalyticsSource { readonly summaryId: string; readonly sessionId: string; readonly elapsedActiveMs: number; readonly createdAt: string; readonly timezone: string; readonly schemaVersion: string; }
export interface SurveyAnalyticsSource { readonly reportId: string; readonly createdAt: string; readonly timezone: string; readonly schemaVersion: string; readonly symptomBurden: number | null; }

export function fromWorkSession(source: WorkSessionAnalyticsSource): AnalyticsInput {
  if (!Number.isSafeInteger(source.elapsedActiveMs) || source.elapsedActiveMs <= 0) throw new Error("INVALID_WORK_SESSION_ANALYTICS_SOURCE");
  return validateAnalyticsInput({ sourceId: source.summaryId, sourceType: "WORK_SESSION", occurredAtUtc: source.createdAt, timezone: source.timezone, schemaVersion: ANALYTICS_SCHEMA_VERSION, algorithmVersion: source.schemaVersion, quality: "VALID", contextKey: "timer-only", sessionDurationMinutes: Math.ceil(source.elapsedActiveMs / 60_000), breakCompliance: null, symptomBurden: null, nearLoad: null, distanceDeviation: null, blinkDeviation: null });
}

export function fromSurveyOnly(source: SurveyAnalyticsSource): AnalyticsInput {
  return validateAnalyticsInput({ sourceId: source.reportId, sourceType: "SURVEY_ONLY_CHECKUP", occurredAtUtc: source.createdAt, timezone: source.timezone, schemaVersion: ANALYTICS_SCHEMA_VERSION, algorithmVersion: source.schemaVersion, quality: source.symptomBurden === null ? "UNKNOWN" : "VALID", contextKey: "survey-only", sessionDurationMinutes: null, breakCompliance: null, symptomBurden: source.symptomBurden, nearLoad: null, distanceDeviation: null, blinkDeviation: null });
}
