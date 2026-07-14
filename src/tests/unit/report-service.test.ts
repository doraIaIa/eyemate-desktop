import assert from "node:assert/strict";
import test from "node:test";
import { buildPersonalReport, renderProfessionalSummary } from "../../personal-intelligence/report-service.js";

const source = { sourceId: "work-1000", sourceType: "WORK_SESSION" as const, occurredAtUtc: "2026-07-14T10:00:00.000Z", timezone: "Asia/Bangkok", schemaVersion: "m3-analytics/0.1.0", algorithmVersion: "m2", quality: "VALID" as const, contextKey: "timer-only", sessionDurationMinutes: 20, breakCompliance: null, symptomBurden: null, nearLoad: null, distanceDeviation: null, blinkDeviation: null };
test("report is immutable, explicit about source and non-diagnosis", () => { const report = buildPersonalReport([source], "2026-07-14", "Asia/Bangkok", "2026-07-14T12:00:00.000Z"); assert.equal(report.dataSource, "TIMER_ONLY"); assert.equal(report.disclaimer, "NOT_A_DIAGNOSIS"); assert.match(renderProfessionalSummary(report), /not a diagnosis/i); });
