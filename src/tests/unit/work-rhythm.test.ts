import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkRhythm } from "../../personal-intelligence/work-rhythm.js";

const now = new Date("2026-07-18T12:00:00+07:00");

test("nhịp làm việc chỉ dùng phiên hoàn tất trong khoảng được chọn", () => {
  const result = buildWorkRhythm([
    { status: "COMPLETED", elapsedActiveMs: 60 * 60_000, createdAt: "2026-07-18T10:00:00+07:00" },
    { status: "CANCELLED", elapsedActiveMs: 90 * 60_000, createdAt: "2026-07-18T11:00:00+07:00" },
    { status: "COMPLETED", elapsedActiveMs: 30 * 60_000, createdAt: "2026-07-10T10:00:00+07:00" }
  ], 7, now);
  assert.equal(result.completedSessions, 1);
  assert.equal(result.totalMinutes, 60);
  assert.equal(result.activeDays, 1);
  assert.equal(result.loadSignal, "INSUFFICIENT_DATA");
});

test("nhịp làm việc phát hiện phiên dài và khoảng bắt đầu thường gặp", () => {
  const sessions = [16, 17, 18].map((day, index) => ({ status: "COMPLETED", elapsedActiveMs: (index === 0 ? 100 : 45) * 60_000, createdAt: `2026-07-${day}T10:30:00+07:00` }));
  const result = buildWorkRhythm(sessions, 7, now);
  assert.equal(result.loadSignal, "LONG_SESSIONS");
  assert.equal(result.longestSessionMinutes, 100);
  assert.equal(result.preferredPeriod, "SÁNG");
});

test("khối lượng được ghi nhận cao dùng ngưỡng minh bạch và không tính ngày trống vào trung bình", () => {
  const sessions = [15, 16, 17].map((day) => ({ status: "COMPLETED", elapsedActiveMs: 250 * 60_000, createdAt: `2026-07-${day}T16:00:00+07:00` }));
  const result = buildWorkRhythm(sessions, 30, now);
  assert.equal(result.averageActiveDayMinutes, 250);
  assert.equal(result.loadSignal, "HIGH_TRACKED_LOAD");
  assert.equal(result.days.length, 30);
});
