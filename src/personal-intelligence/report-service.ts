import { aggregateDaily, aggregateWeekly, buildBaseline, evaluateNearWorkPattern, type AnalyticsInput, type BaselineSnapshot, type DailySummary, type WeeklyDigest } from "./analytics.js";

export const PERSONAL_REPORT_SCHEMA = "m3-personal-report/0.1.0" as const;
export interface PersonalReport { readonly schemaVersion: typeof PERSONAL_REPORT_SCHEMA; readonly generatedAt: string; readonly timezone: string; readonly dataSource: "TIMER_ONLY" | "SURVEY_ONLY" | "MIXED" | "NO_DATA"; readonly baseline: BaselineSnapshot; readonly daily: DailySummary; readonly weekly: WeeklyDigest; readonly evidenceSourceIds: readonly string[]; readonly missingData: readonly string[]; readonly limitations: readonly string[]; readonly disclaimer: "NOT_A_DIAGNOSIS"; }

export function buildPersonalReport(inputs: readonly AnalyticsInput[], localDate: string, timezone: string, generatedAt: string): PersonalReport {
  if (Number.isNaN(Date.parse(generatedAt))) throw new Error("INVALID_REPORT_TIME");
  const daily = aggregateDaily(inputs, localDate, timezone);
  const weekly = aggregateWeekly([daily], localDate, timezone);
  const baseline = buildBaseline(inputs, "timer-only", { version: "m3-baseline/0.1.0", minimumSamples: 3, staleAfterDays: 14 }, generatedAt);
  const hasWork = inputs.some((input) => input.sourceType === "WORK_SESSION");
  const hasSurvey = inputs.some((input) => input.sourceType === "SURVEY_ONLY_CHECKUP");
  const dataSource = hasWork && hasSurvey ? "MIXED" : hasWork ? "TIMER_ONLY" : hasSurvey ? "SURVEY_ONLY" : "NO_DATA";
  const patternMissing = inputs.filter((input) => input.sourceType === "WORK_SESSION").flatMap((input) => evaluateNearWorkPattern(input, generatedAt).missingData);
  return { schemaVersion: PERSONAL_REPORT_SCHEMA, generatedAt, timezone, dataSource, baseline, daily, weekly, evidenceSourceIds: inputs.map((input) => input.sourceId).sort(), missingData: [...new Set([...daily.missingData, ...patternMissing])].sort(), limitations: ["PRODUCT_BEHAVIOUR_ANALYTICS", "CAMERA_METRICS_NOT_USED_UNLESS_VALID"], disclaimer: "NOT_A_DIAGNOSIS" };
}

export function renderProfessionalSummary(report: PersonalReport): string {
  return ["# EyeMate Personal Summary", `Schema: ${report.schemaVersion}`, `Generated: ${report.generatedAt}`, `Data source: ${report.dataSource}`, `Baseline: ${report.baseline.state}`, `Daily tracked minutes: ${report.daily.totalSessionMinutes}`, `VLI: ${report.daily.vli.score ?? "INSUFFICIENT_DATA"}`, `Confidence: ${report.daily.vli.dataConfidence}`, `Missing data: ${report.missingData.join(", ") || "none"}`, "Disclaimer: This is not a diagnosis or medical record."].join("\n");
}
