import assert from "node:assert/strict";
import test from "node:test";
import { aggregateDaily, aggregateWeekly, buildBaseline, calculateVli, evaluateNearWorkPattern, localDateFor, validateAnalyticsInput } from "../../personal-intelligence/analytics.js";

const valid = { sourceId: "work-0001", sourceType: "WORK_SESSION" as const, occurredAtUtc: "2026-07-14T10:00:00.000Z", timezone: "Asia/Bangkok", schemaVersion: "m2-session-summary/0.1.0", algorithmVersion: "m2-companion-policy/0.1.0", quality: "VALID" as const, contextKey: "timer-only", sessionDurationMinutes: 30, breakCompliance: 40, symptomBurden: null, nearLoad: 80, distanceDeviation: null, blinkDeviation: null };
test("canonical input rejects invalid numeric and preserves unknown", () => { assert.equal(validateAnalyticsInput(valid).symptomBurden, null); assert.throws(() => validateAnalyticsInput({ ...valid, nearLoad: Number.NaN }), /INVALID_ANALYTICS_INPUT/); });
test("baseline uses sample coverage and supports reset/stale", () => { const inputs = [valid, { ...valid, sourceId: "work-0002" }, { ...valid, sourceId: "work-0003" }]; assert.equal(buildBaseline(inputs, "timer-only", { version: "base/1", minimumSamples: 3, staleAfterDays: 7 }, "2026-07-15T00:00:00.000Z").state, "READY"); assert.equal(buildBaseline(inputs, "timer-only", { version: "base/1", minimumSamples: 3, staleAfterDays: 1 }, "2026-07-20T00:00:00.000Z").state, "STALE"); assert.equal(buildBaseline(inputs, "timer-only", { version: "base/1", minimumSamples: 3, staleAfterDays: 1 }, "2026-07-20T00:00:00.000Z", true).state, "RESET"); });
test("VLI excludes missing values rather than treating them as zero", () => { const partial = calculateVli(valid); assert.equal(partial.status, "AVAILABLE"); assert.deepEqual([...partial.missingComponents].sort(), ["blinkDeviation", "distanceDeviation", "symptomBurden"].sort()); assert.equal(calculateVli({ ...valid, nearLoad: null, breakCompliance: null }).status, "INSUFFICIENT_DATA"); });
test("pattern abstains when required evidence is missing", () => { assert.equal(evaluateNearWorkPattern(valid, "2026-07-14T12:00:00.000Z").status, "PRESENT"); assert.equal(evaluateNearWorkPattern({ ...valid, nearLoad: null }, "2026-07-14T12:00:00.000Z").status, "INSUFFICIENT_DATA"); });
test("daily and weekly keep missing coverage explicit", () => { const daily = aggregateDaily([valid], "2026-07-14", "Asia/Bangkok"); assert.equal(daily.status, "AVAILABLE"); assert.equal(aggregateWeekly([daily], "2026-07-14", "Asia/Bangkok").status, "INSUFFICIENT_DATA"); });
test("daily grouping uses recorded IANA timezone rather than UTC date", () => assert.equal(localDateFor("2026-07-13T18:00:00.000Z", "Asia/Bangkok"), "2026-07-14"));
test("VLI preserves real zero, clamps boundaries and excludes low-quality camera components", () => {
  assert.equal(calculateVli({ ...valid, nearLoad: 0, breakCompliance: 100, distanceDeviation: 0, blinkDeviation: 0, symptomBurden: 0 }).score, 0);
  assert.equal(calculateVli({ ...valid, nearLoad: 100, breakCompliance: 0, distanceDeviation: 100, blinkDeviation: 100, symptomBurden: 100 }).score, 100);
  const low = calculateVli({ ...valid, quality: "LOW" });
  assert.ok(low.missingComponents.includes("distanceDeviation"));
  assert.ok(low.missingComponents.includes("blinkDeviation"));
});
test("daily summary aggregates all same-day sources and keeps a DST local date", () => {
  const later = { ...valid, sourceId: "work-0004", sessionDurationMinutes: 20, nearLoad: 60, breakCompliance: 60 };
  const daily = aggregateDaily([valid, later], "2026-07-14", "Asia/Bangkok");
  assert.equal(daily.totalSessionMinutes, 50);
  assert.equal(daily.breakCompliance, 50);
  assert.equal(daily.actionKey, "TAKE_SHORT_BREAK");
  assert.equal(localDateFor("2026-03-08T07:30:00.000Z", "America/New_York"), "2026-03-08");
});
test("weekly digest is deterministic and requires three observed days", () => {
  const days = ["2026-07-14", "2026-07-15", "2026-07-16"].map((date, index) => aggregateDaily([{ ...valid, sourceId: `work-week-${index}`, occurredAtUtc: `${date}T10:00:00.000Z` }], date, "Asia/Bangkok"));
  const first = aggregateWeekly(days, "2026-07-14", "Asia/Bangkok");
  assert.equal(first.status, "AVAILABLE");
  assert.equal(first.missingDays, 4);
  assert.deepEqual(aggregateWeekly(days, "2026-07-14", "Asia/Bangkok"), first);
});
test("baseline keeps low-quality and different contexts out of a ready reference", () => {
  const config = { version: "base/1", minimumSamples: 3, staleAfterDays: 7 };
  const inputs = [valid, { ...valid, sourceId: "work-low-1", quality: "LOW" as const }, { ...valid, sourceId: "work-other-1", contextKey: "different-device" }];
  const snapshot = buildBaseline(inputs, "timer-only", config, "2026-07-15T00:00:00.000Z");
  assert.equal(snapshot.state, "LEARNING");
  assert.equal(snapshot.sampleCount, 1);
  assert.equal(snapshot.sourceIds.includes("work-low-1"), false);
  assert.equal(snapshot.sourceIds.includes("work-other-1"), false);
});
