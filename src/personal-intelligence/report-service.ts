import { aggregateDaily, aggregateWeekly, buildBaseline, evaluateNearWorkPattern, localDateFor, type AnalyticsInput, type BaselineSnapshot, type DailySummary, type WeeklyDigest } from "./analytics.js";

export const PERSONAL_REPORT_SCHEMA = "m3-personal-report/0.2.0" as const;
export interface PersonalReport { readonly schemaVersion: typeof PERSONAL_REPORT_SCHEMA; readonly generatedAt: string; readonly timezone: string; readonly dataSource: "TIMER_ONLY" | "SURVEY_ONLY" | "MIXED" | "NO_DATA"; readonly baseline: BaselineSnapshot; readonly daily: DailySummary; readonly weekly: WeeklyDigest; readonly evidenceSourceIds: readonly string[]; readonly sourceSchemaVersions: readonly string[]; readonly algorithmVersions: readonly string[]; readonly missingData: readonly string[]; readonly limitations: readonly string[]; readonly disclaimer: "NOT_A_DIAGNOSIS"; }

export function buildPersonalReport(inputs: readonly AnalyticsInput[], localDate: string, timezone: string, generatedAt: string): PersonalReport {
  if (Number.isNaN(Date.parse(generatedAt))) throw new Error("INVALID_REPORT_TIME");
  const daily = aggregateDaily(inputs, localDate, timezone);
  const endTime = Date.parse(`${localDate}T00:00:00.000Z`);
  if (Number.isNaN(endTime)) throw new Error("INVALID_REPORT_LOCAL_DATE");
  const startDate = new Date(endTime - 6 * 86_400_000).toISOString().slice(0, 10);
  const weeklyDays = Array.from({ length: 7 }, (_, index) => new Date(endTime - (6 - index) * 86_400_000).toISOString().slice(0, 10)).map((date) => aggregateDaily(inputs, date, timezone));
  const weekly = aggregateWeekly(weeklyDays, startDate, timezone);
  const baselineInputs = inputs.map((input) => input.sourceType === "WORK_SESSION" ? { ...input, contextKey: "work:all" } : input);
  const baseline = buildBaseline(baselineInputs, "work:all", { version: "m3-baseline/0.2.0", minimumSamples: 3, staleAfterDays: 14 }, generatedAt);
  const hasWork = inputs.some((input) => input.sourceType === "WORK_SESSION");
  const hasSurvey = inputs.some((input) => input.sourceType === "SURVEY_ONLY_CHECKUP");
  const dataSource = hasWork && hasSurvey ? "MIXED" : hasWork ? "TIMER_ONLY" : hasSurvey ? "SURVEY_ONLY" : "NO_DATA";
  const patternMissing = inputs.filter((input) => input.sourceType === "WORK_SESSION").flatMap((input) => evaluateNearWorkPattern(input, generatedAt).missingData);
  return { schemaVersion: PERSONAL_REPORT_SCHEMA, generatedAt, timezone, dataSource, baseline, daily, weekly, evidenceSourceIds: inputs.map((input) => input.sourceId).sort(), sourceSchemaVersions: [...new Set(inputs.map((input) => input.schemaVersion))].sort(), algorithmVersions: [...new Set(inputs.map((input) => input.algorithmVersion))].sort(), missingData: [...new Set([...daily.missingData, ...patternMissing])].sort(), limitations: ["PRODUCT_BEHAVIOUR_ANALYTICS", "CAMERA_METRICS_NOT_USED_UNLESS_VALID"], disclaimer: "NOT_A_DIAGNOSIS" };
}

export function renderProfessionalSummary(report: PersonalReport): string {
  return ["# EyeMate Personal Summary", `Schema: ${report.schemaVersion}`, `Generated: ${report.generatedAt}`, `Data source: ${report.dataSource}`, `Source schemas: ${report.sourceSchemaVersions.join(", ") || "none"}`, `Algorithms: ${report.algorithmVersions.join(", ") || "none"}`, `Baseline: ${report.baseline.state}`, `Daily tracked minutes: ${report.daily.totalSessionMinutes}`, `VLI: ${report.daily.vli.score ?? "INSUFFICIENT_DATA"}`, `Confidence: ${report.daily.vli.dataConfidence}`, `Evidence sources: ${report.evidenceSourceIds.join(", ") || "omitted"}`, `Missing data: ${report.missingData.join(", ") || "none"}`, `Limitations: ${report.limitations.join(", ") || "none"}`, "Disclaimer: This is not a diagnosis or medical record."].join("\n");
}
