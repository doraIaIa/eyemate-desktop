import type { PersonalReport } from "../personal-intelligence/report-service.js";
import type { StoredCheckupListItem, StoredSessionSummaryListItem } from "../shared/preload-contract.js";

export interface PersonalDemoSnapshot {
  readonly checkups: readonly StoredCheckupListItem[];
  readonly sessionSummaries: readonly StoredSessionSummaryListItem[];
  readonly reports: readonly PersonalReport[];
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function demoDate(now: Date, dayOffset: number, hour: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 30, 0, 0);
}

export function createPersonalDemoSnapshot(now = new Date()): PersonalDemoSnapshot {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok";
  const durations = [38, 32, 44, 36, 48, 31, 26] as const;
  const acceptedBreaks = [1, 1, 1, 1, 1, 1, 0] as const;
  const sessionSummaries = durations.map((minutes, index): StoredSessionSummaryListItem => {
    const id = String(index + 1).padStart(2, "0");
    return {
      summaryId: `demo-summary-${id}`,
      sessionId: `demo-session-${id}`,
      status: "COMPLETED",
      elapsedActiveMs: minutes * 60_000,
      createdAt: demoDate(now, index - 6, index % 2 === 0 ? 10 : 15).toISOString(),
      interventionCount: 1,
      acceptedBreakCount: acceptedBreaks[index] ?? 0
    };
  });
  const sourceIds = sessionSummaries.map((item) => item.summaryId);
  const today = localDateKey(now);
  const weekStart = localDateKey(demoDate(now, -6, 12));
  const report: PersonalReport = {
    schemaVersion: "m3-personal-report/0.2.0",
    generatedAt: now.toISOString(),
    timezone,
    dataSource: "MIXED",
    baseline: {
      state: "READY",
      contextKey: "work:all",
      sampleCount: 7,
      coverage: 1,
      meanSessionDurationMinutes: 36.4,
      configVersion: "personal-demo-baseline/1.0.0",
      sourceIds
    },
    daily: {
      localDate: today,
      timezone,
      status: "AVAILABLE",
      totalSessionMinutes: 26,
      longestSessionMinutes: 26,
      breakCompliance: 86,
      dataCoverage: 1,
      sourceIds: [sourceIds.at(-1) ?? "demo-summary-07"],
      vli: {
        status: "AVAILABLE",
        score: 18,
        dataConfidence: 1,
        missingComponents: [],
        version: "personal-demo-vli/1.0.0",
        limitations: ["SYNTHETIC_DEMO_DATA"]
      },
      patterns: [],
      missingData: [],
      actionKey: "CONTINUE_TRACKING",
      version: "personal-demo-daily/1.0.0"
    },
    weekly: {
      startDate: weekStart,
      endDate: today,
      timezone,
      status: "AVAILABLE",
      daysWithData: 7,
      missingDays: 0,
      validCoverage: 1,
      totalSessionMinutes: 255,
      highestVliDate: today,
      nextGoal: "CONTINUE_TRACKING",
      limitations: ["SYNTHETIC_DEMO_DATA"],
      version: "personal-demo-weekly/1.0.0"
    },
    evidenceSourceIds: sourceIds,
    sourceSchemaVersions: ["personal-demo-session/1.0.0", "personal-demo-checkup/1.0.0"],
    algorithmVersions: ["personal-demo-aggregate/1.0.0"],
    missingData: [],
    limitations: ["SYNTHETIC_DEMO_DATA", "NOT_FOR_PERSONAL_DECISIONS"],
    disclaimer: "NOT_A_DIAGNOSIS"
  };
  return {
    checkups: [{
      status: "COMPLETED",
      action: "MAINTAIN_SUPPORTIVE_ROUTINE",
      createdAt: demoDate(now, 0, 8).toISOString(),
      cameraStatus: "MEASURED",
      source: "SYNTHETIC_DEMO",
      blinkRatePerMinute: 20,
      distanceZone: "COMFORT",
      validSampleRatio: 0.96,
      cameraReasonCodes: []
    }],
    sessionSummaries,
    reports: [report]
  };
}
