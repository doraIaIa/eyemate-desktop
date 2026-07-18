import assert from "node:assert/strict";
import test from "node:test";
import { buildPersonalReport, renderProfessionalSummary } from "../../personal-intelligence/report-service.js";

const source = { sourceId: "work-1000", sourceType: "WORK_SESSION" as const, occurredAtUtc: "2026-07-14T10:00:00.000Z", timezone: "Asia/Bangkok", schemaVersion: "m3-analytics/0.1.0", algorithmVersion: "m2", quality: "VALID" as const, contextKey: "timer-only", sessionDurationMinutes: 20, breakCompliance: null, symptomBurden: null, nearLoad: null, distanceDeviation: null, blinkDeviation: null };
test("report is immutable, explicit about source and non-diagnosis", () => { const report = buildPersonalReport([source], "2026-07-14", "Asia/Bangkok", "2026-07-14T12:00:00.000Z"); assert.equal(report.dataSource, "TIMER_ONLY"); assert.equal(report.disclaimer, "NOT_A_DIAGNOSIS"); assert.match(renderProfessionalSummary(report), /not a diagnosis/i); });
test("report snapshot rendering remains deterministic after later input exists", () => { const report = buildPersonalReport([source], "2026-07-14", "Asia/Bangkok", "2026-07-14T12:00:00.000Z"); const rendered = renderProfessionalSummary(report); const later = buildPersonalReport([{ ...source, sourceId: "work-1001", occurredAtUtc: "2026-07-15T10:00:00.000Z", sessionDurationMinutes: 60 }], "2026-07-15", "Asia/Bangkok", "2026-07-15T12:00:00.000Z"); assert.equal(renderProfessionalSummary(report), rendered); assert.notEqual(renderProfessionalSummary(later), rendered); });

test("report tuần chỉ gồm bảy ngày kết thúc ở ngày báo cáo", () => {
  const inputs = Array.from({ length: 10 }, (_, index) => ({ ...source, sourceId: `work-${String(index).padStart(4, "0")}`, occurredAtUtc: new Date(Date.parse("2026-07-18T10:00:00.000Z") - index * 86_400_000).toISOString() }));
  const report = buildPersonalReport(inputs, "2026-07-18", "Asia/Bangkok", "2026-07-18T12:00:00.000Z");
  assert.equal(report.weekly.startDate, "2026-07-12");
  assert.equal(report.weekly.endDate, "2026-07-18");
  assert.equal(report.weekly.daysWithData, 7);
  assert.equal(report.weekly.totalSessionMinutes, 140);
});

test("baseline cá nhân gộp các mode làm việc thay vì bỏ mất context mới", () => {
  const inputs = ["work:timer_only", "work:custom", "work:deep_focus"].map((contextKey, index) => ({ ...source, sourceId: `mode-${index + 1000}`, contextKey, occurredAtUtc: `2026-07-${14 + index}T10:00:00.000Z` }));
  const report = buildPersonalReport(inputs, "2026-07-16", "Asia/Bangkok", "2026-07-16T12:00:00.000Z");
  assert.equal(report.baseline.state, "READY");
  assert.equal(report.baseline.contextKey, "work:all");
  assert.equal(report.baseline.sampleCount, 3);
});
