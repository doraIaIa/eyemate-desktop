export const ANALYTICS_SCHEMA_VERSION = "m3-analytics/0.1.0" as const;
export const ANALYTICS_RULE_VERSION = "m3-rules/0.1.0" as const;

export type DataQuality = "VALID" | "LOW" | "UNKNOWN" | "NOT_MEASURED";
export type AnalyticsSourceType = "SURVEY_ONLY_CHECKUP" | "WORK_SESSION" | "MEASUREMENT_AGGREGATE" | "INTERVENTION";
export interface AnalyticsInput {
  readonly sourceId: string; readonly sourceType: AnalyticsSourceType; readonly occurredAtUtc: string; readonly timezone: string;
  readonly schemaVersion: string; readonly algorithmVersion: string; readonly quality: DataQuality;
  readonly contextKey: string; readonly sessionDurationMinutes: number | null; readonly breakCompliance: number | null;
  readonly symptomBurden: number | null; readonly nearLoad: number | null; readonly distanceDeviation: number | null; readonly blinkDeviation: number | null;
}

export interface BaselineConfig { readonly version: string; readonly minimumSamples: number; readonly staleAfterDays: number; }
export type BaselineState = "EMPTY" | "LEARNING" | "READY" | "STALE" | "RESET";
export interface BaselineSnapshot { readonly state: BaselineState; readonly contextKey: string; readonly sampleCount: number; readonly coverage: number; readonly meanSessionDurationMinutes: number | null; readonly configVersion: string; readonly sourceIds: readonly string[]; }

function validId(value: string): boolean { return /^[a-z0-9-]{4,80}$/i.test(value); }
function finiteOrNull(value: number | null): boolean { return value === null || (Number.isFinite(value) && value >= 0 && value <= 100); }

export function validateAnalyticsInput(input: AnalyticsInput): AnalyticsInput {
  if (!validId(input.sourceId) || !Object.values<string>(["SURVEY_ONLY_CHECKUP", "WORK_SESSION", "MEASUREMENT_AGGREGATE", "INTERVENTION"]).includes(input.sourceType) || Number.isNaN(Date.parse(input.occurredAtUtc)) || input.timezone.length === 0 || input.schemaVersion.length === 0 || input.algorithmVersion.length === 0 || input.contextKey.length === 0 || ![input.sessionDurationMinutes, input.breakCompliance, input.symptomBurden, input.nearLoad, input.distanceDeviation, input.blinkDeviation].every(finiteOrNull)) throw new Error("INVALID_ANALYTICS_INPUT");
  return Object.freeze({ ...input });
}

export function buildBaseline(inputs: readonly AnalyticsInput[], contextKey: string, config: BaselineConfig, nowUtc: string, reset = false): BaselineSnapshot {
  if (reset) return { state: "RESET", contextKey, sampleCount: 0, coverage: 0, meanSessionDurationMinutes: null, configVersion: config.version, sourceIds: [] };
  if (!Number.isInteger(config.minimumSamples) || config.minimumSamples < 1 || !Number.isInteger(config.staleAfterDays) || config.staleAfterDays < 1 || Number.isNaN(Date.parse(nowUtc))) throw new Error("INVALID_BASELINE_CONFIG");
  const candidates = inputs.filter((input) => input.contextKey === contextKey && input.quality === "VALID" && input.sessionDurationMinutes !== null);
  if (candidates.length === 0) return { state: "EMPTY", contextKey, sampleCount: 0, coverage: 0, meanSessionDurationMinutes: null, configVersion: config.version, sourceIds: [] };
  const latest = Math.max(...candidates.map((input) => Date.parse(input.occurredAtUtc)));
  const stale = Date.parse(nowUtc) - latest > config.staleAfterDays * 86_400_000;
  const coverage = candidates.length / Math.max(inputs.filter((input) => input.contextKey === contextKey).length, 1);
  const mean = candidates.reduce((sum, input) => sum + (input.sessionDurationMinutes ?? 0), 0) / candidates.length;
  return { state: stale ? "STALE" : candidates.length >= config.minimumSamples && coverage >= 0.6 ? "READY" : "LEARNING", contextKey, sampleCount: candidates.length, coverage, meanSessionDurationMinutes: mean, configVersion: config.version, sourceIds: candidates.map((input) => input.sourceId).sort() };
}

export interface VliResult { readonly status: "AVAILABLE" | "INSUFFICIENT_DATA"; readonly score: number | null; readonly dataConfidence: number; readonly missingComponents: readonly string[]; readonly version: string; readonly limitations: readonly string[]; }
const weights = { nearLoad: 0.3, breakCompliance: 0.25, distanceDeviation: 0.2, blinkDeviation: 0.15, symptomBurden: 0.1 } as const;
export function calculateVli(input: Pick<AnalyticsInput, "nearLoad" | "breakCompliance" | "distanceDeviation" | "blinkDeviation" | "symptomBurden" | "quality">): VliResult {
  const values = { nearLoad: input.nearLoad, breakCompliance: input.breakCompliance === null ? null : 100 - input.breakCompliance, distanceDeviation: input.quality === "VALID" ? input.distanceDeviation : null, blinkDeviation: input.quality === "VALID" ? input.blinkDeviation : null, symptomBurden: input.symptomBurden };
  const available = (Object.entries(values) as readonly [keyof typeof weights, number | null][]).filter(([, value]) => value !== null);
  const missing = (Object.entries(values) as readonly [string, number | null][]).filter(([, value]) => value === null).map(([key]) => key);
  if (available.length < 2) return { status: "INSUFFICIENT_DATA", score: null, dataConfidence: available.length / 5, missingComponents: missing, version: ANALYTICS_RULE_VERSION, limitations: ["INSUFFICIENT_COMPONENT_COVERAGE"] };
  const weightTotal = available.reduce((sum, [key]) => sum + weights[key], 0);
  const score = available.reduce((sum, [key, value]) => sum + (value ?? 0) * weights[key] / weightTotal, 0);
  return { status: "AVAILABLE", score: Math.round(Math.max(0, Math.min(100, score))), dataConfidence: available.length / 5, missingComponents: missing, version: ANALYTICS_RULE_VERSION, limitations: missing.length ? ["PARTIAL_COMPONENT_COVERAGE"] : [] };
}

export interface PatternResult { readonly patternId: "NEAR_WORK_OVERLOAD"; readonly status: "PRESENT" | "NOT_PRESENT" | "INSUFFICIENT_DATA"; readonly evidence: readonly string[]; readonly missingData: readonly string[]; readonly dataConfidence: number; readonly ruleVersion: string; readonly generatedAt: string; readonly expiresAt: string; readonly actionKey: "TAKE_SHORT_BREAK" | null; }
export function evaluateNearWorkPattern(input: AnalyticsInput, generatedAt: string): PatternResult {
  if (Number.isNaN(Date.parse(generatedAt))) throw new Error("INVALID_PATTERN_TIME");
  const missing = [input.nearLoad === null ? "nearLoad" : null, input.breakCompliance === null ? "breakCompliance" : null].filter((value): value is string => value !== null);
  if (missing.length > 0 || input.quality !== "VALID") return { patternId: "NEAR_WORK_OVERLOAD", status: "INSUFFICIENT_DATA", evidence: [], missingData: input.quality === "VALID" ? missing : [...missing, "quality"], dataConfidence: 0, ruleVersion: ANALYTICS_RULE_VERSION, generatedAt, expiresAt: new Date(Date.parse(generatedAt) + 86_400_000).toISOString(), actionKey: null };
  const present = (input.nearLoad ?? 0) >= 70 && (input.breakCompliance ?? 100) < 50;
  return { patternId: "NEAR_WORK_OVERLOAD", status: present ? "PRESENT" : "NOT_PRESENT", evidence: ["nearLoad", "breakCompliance"], missingData: [], dataConfidence: 1, ruleVersion: ANALYTICS_RULE_VERSION, generatedAt, expiresAt: new Date(Date.parse(generatedAt) + 86_400_000).toISOString(), actionKey: present ? "TAKE_SHORT_BREAK" : null };
}

export interface DailySummary { readonly localDate: string; readonly timezone: string; readonly status: "AVAILABLE" | "INSUFFICIENT_DATA"; readonly totalSessionMinutes: number; readonly longestSessionMinutes: number; readonly sourceIds: readonly string[]; readonly vli: VliResult; readonly patterns: readonly PatternResult[]; readonly missingData: readonly string[]; readonly version: string; }
export function aggregateDaily(inputs: readonly AnalyticsInput[], localDate: string, timezone: string): DailySummary {
  const dayInputs = inputs.filter((input) => input.occurredAtUtc.slice(0, 10) === localDate && input.timezone === timezone && input.sourceType === "WORK_SESSION");
  const durations = dayInputs.map((input) => input.sessionDurationMinutes).filter((value): value is number => value !== null);
  const representative = dayInputs[0];
  const vli = representative ? calculateVli(representative) : { status: "INSUFFICIENT_DATA" as const, score: null, dataConfidence: 0, missingComponents: ["all"], version: ANALYTICS_RULE_VERSION, limitations: ["NO_DATA"] };
  const patterns = representative ? [evaluateNearWorkPattern(representative, `${localDate}T23:59:59.000Z`)] : [];
  return { localDate, timezone, status: durations.length ? "AVAILABLE" : "INSUFFICIENT_DATA", totalSessionMinutes: durations.reduce((sum, value) => sum + value, 0), longestSessionMinutes: durations.length ? Math.max(...durations) : 0, sourceIds: dayInputs.map((input) => input.sourceId).sort(), vli, patterns, missingData: durations.length ? vli.missingComponents : ["workSession"], version: ANALYTICS_SCHEMA_VERSION };
}

export interface WeeklyDigest { readonly startDate: string; readonly timezone: string; readonly status: "AVAILABLE" | "INSUFFICIENT_DATA"; readonly daysWithData: number; readonly missingDays: number; readonly totalSessionMinutes: number; readonly version: string; }
export function aggregateWeekly(days: readonly DailySummary[], startDate: string, timezone: string): WeeklyDigest {
  const available = days.filter((day) => day.timezone === timezone && day.status === "AVAILABLE");
  return { startDate, timezone, status: available.length >= 3 ? "AVAILABLE" : "INSUFFICIENT_DATA", daysWithData: available.length, missingDays: Math.max(0, 7 - available.length), totalSessionMinutes: available.reduce((sum, day) => sum + day.totalSessionMinutes, 0), version: ANALYTICS_SCHEMA_VERSION };
}
