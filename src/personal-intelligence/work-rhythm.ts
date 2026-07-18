export interface RecordedWorkSession {
  readonly status: string;
  readonly elapsedActiveMs: number;
  readonly createdAt: string;
}

export interface WorkRhythmDay {
  readonly date: string;
  readonly label: string;
  readonly minutes: number;
  readonly sessionCount: number;
}

export type TrackedLoadSignal = "INSUFFICIENT_DATA" | "STEADY" | "LONG_SESSIONS" | "HIGH_TRACKED_LOAD";
export type WorkTrend = "NO_COMPARISON" | "STABLE" | "UP" | "DOWN";

export interface WorkRhythmSummary {
  readonly dayCount: 7 | 30;
  readonly days: readonly WorkRhythmDay[];
  readonly activeDays: number;
  readonly completedSessions: number;
  readonly totalMinutes: number;
  readonly averageActiveDayMinutes: number;
  readonly averageSessionMinutes: number;
  readonly longestSessionMinutes: number;
  readonly longSessionCount: number;
  readonly preferredPeriod: "SÁNG" | "CHIỀU" | "TỐI" | "KHUYA" | null;
  readonly mostActiveWeekday: string | null;
  readonly loadSignal: TrackedLoadSignal;
  readonly trend: WorkTrend;
  readonly trendPercent: number | null;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function completedSessions(sessions: readonly RecordedWorkSession[]): readonly { readonly end: Date; readonly elapsedMs: number }[] {
  return sessions.flatMap((session) => {
    const end = new Date(session.createdAt);
    if (session.status !== "COMPLETED" || !Number.isSafeInteger(session.elapsedActiveMs) || session.elapsedActiveMs <= 0 || Number.isNaN(end.valueOf())) return [];
    return [{ end, elapsedMs: session.elapsedActiveMs }];
  });
}

function totalInWindow(sessions: readonly { readonly end: Date; readonly elapsedMs: number }[], start: Date, end: Date): number {
  return sessions.filter((session) => session.end >= start && session.end < end).reduce((sum, session) => sum + session.elapsedMs / 60_000, 0);
}

export function buildWorkRhythm(sessions: readonly RecordedWorkSession[], dayCount: 7 | 30, now = new Date()): WorkRhythmSummary {
  if (![7, 30].includes(dayCount) || Number.isNaN(now.valueOf())) throw new Error("INVALID_WORK_RHYTHM_RANGE");
  const today = startOfLocalDay(now);
  const rangeStart = new Date(today); rangeStart.setDate(rangeStart.getDate() - dayCount + 1);
  const rangeEnd = new Date(today); rangeEnd.setDate(rangeEnd.getDate() + 1);
  const valid = completedSessions(sessions);
  const selected = valid.filter((session) => session.end >= rangeStart && session.end < rangeEnd);
  const days = Array.from({ length: dayCount }, (_, index): WorkRhythmDay => {
    const date = new Date(rangeStart); date.setDate(date.getDate() + index);
    const key = localDateKey(date);
    const matching = selected.filter((session) => localDateKey(session.end) === key);
    return { date: key, label: new Intl.DateTimeFormat("vi-VN", { weekday: dayCount === 7 ? "short" : undefined, day: "2-digit", month: "2-digit" }).format(date), minutes: Math.round(matching.reduce((sum, session) => sum + session.elapsedMs / 60_000, 0)), sessionCount: matching.length };
  });
  const active = days.filter((day) => day.sessionCount > 0);
  const totalMinutes = Math.round(selected.reduce((sum, session) => sum + session.elapsedMs / 60_000, 0));
  const durations = selected.map((session) => session.elapsedMs / 60_000);
  const periods = new Map<"SÁNG" | "CHIỀU" | "TỐI" | "KHUYA", number>([["SÁNG", 0], ["CHIỀU", 0], ["TỐI", 0], ["KHUYA", 0]]);
  for (const session of selected) {
    const startHour = new Date(session.end.valueOf() - session.elapsedMs).getHours();
    const period = startHour >= 5 && startHour < 12 ? "SÁNG" : startHour >= 12 && startHour < 17 ? "CHIỀU" : startHour >= 17 && startHour < 22 ? "TỐI" : "KHUYA";
    periods.set(period, (periods.get(period) ?? 0) + 1);
  }
  const preferredPeriod = selected.length ? [...periods.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null : null;
  const weekdayTotals = new Map<string, number>();
  for (const day of active) {
    const label = new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(new Date(`${day.date}T12:00:00`));
    weekdayTotals.set(label, (weekdayTotals.get(label) ?? 0) + day.minutes);
  }
  const mostActiveWeekday = active.length ? [...weekdayTotals.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null : null;
  const averageActiveDayMinutes = active.length ? Math.round(totalMinutes / active.length) : 0;
  const longestSessionMinutes = durations.length ? Math.round(Math.max(...durations)) : 0;
  const longSessionCount = durations.filter((minutes) => minutes >= 90).length;
  const loadSignal: TrackedLoadSignal = active.length < 3 ? "INSUFFICIENT_DATA" : averageActiveDayMinutes >= 240 || Math.max(0, ...days.map((day) => day.minutes)) >= 360 ? "HIGH_TRACKED_LOAD" : longestSessionMinutes >= 90 || longSessionCount >= 2 ? "LONG_SESSIONS" : "STEADY";
  const currentSevenStart = new Date(today); currentSevenStart.setDate(currentSevenStart.getDate() - 6);
  const previousSevenStart = new Date(currentSevenStart); previousSevenStart.setDate(previousSevenStart.getDate() - 7);
  const currentSeven = totalInWindow(valid, currentSevenStart, rangeEnd);
  const previousSeven = totalInWindow(valid, previousSevenStart, currentSevenStart);
  const trendPercent = previousSeven > 0 ? Math.round((currentSeven - previousSeven) / previousSeven * 100) : null;
  const trend: WorkTrend = trendPercent === null ? "NO_COMPARISON" : Math.abs(trendPercent) < 10 ? "STABLE" : trendPercent > 0 ? "UP" : "DOWN";
  return { dayCount, days, activeDays: active.length, completedSessions: selected.length, totalMinutes, averageActiveDayMinutes, averageSessionMinutes: durations.length ? Math.round(totalMinutes / durations.length) : 0, longestSessionMinutes, longSessionCount, preferredPeriod, mostActiveWeekday, loadSignal, trend, trendPercent };
}
