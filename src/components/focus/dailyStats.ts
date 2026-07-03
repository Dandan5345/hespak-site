// Shared local-storage-backed daily stats log. Written by Focus.tsx whenever
// a focus session completes, read by Stats.tsx to chart focus minutes and
// derive an "active days" streak. Mirrors the shape (loosely) of the Dart
// app's `_dailyStats` map in app_controller.dart, but this web build is
// local-only — no cloud sync, same local-first approach the mobile app uses
// for this particular feature.

export interface DailyStat {
  focusMinutes: number;
  tasksCompleted: number;
}

export type DailyStatsMap = Record<string, DailyStat>;

const DAILY_STATS_KEY = 'sf_daily_stats';
export const FOCUS_SESSIONS_COUNT_KEY = 'sf_focus_sessions_count';

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Local-calendar-day key (YYYY-MM-DD), not UTC — matches how a user perceives "today". */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function readDailyStats(): DailyStatsMap {
  try {
    const raw = localStorage.getItem(DAILY_STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DailyStatsMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeDailyStats(map: DailyStatsMap) {
  localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(map));
}

/** Appends focus minutes to today's entry. Called once per completed session. */
export function addFocusMinutesToday(minutes: number) {
  if (minutes <= 0) return;
  const map = readDailyStats();
  const key = todayKey();
  const cur = map[key] ?? { focusMinutes: 0, tasksCompleted: 0 };
  map[key] = { ...cur, focusMinutes: cur.focusMinutes + minutes };
  writeDailyStats(map);
}

export function readFocusSessionsCount(): number {
  const n = Number(localStorage.getItem(FOCUS_SESSIONS_COUNT_KEY));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function bumpFocusSessionsCount(): number {
  const next = readFocusSessionsCount() + 1;
  localStorage.setItem(FOCUS_SESSIONS_COUNT_KEY, String(next));
  return next;
}

/** Consecutive days (ending today or yesterday, so a not-yet-active today
 * doesn't zero it out) that have any recorded activity in sf_daily_stats. */
export function computeActiveDayStreak(map: DailyStatsMap): number {
  const hasActivity = (k: string) => {
    const d = map[k];
    return !!d && (d.focusMinutes > 0 || d.tasksCompleted > 0);
  };
  let cursor = startOfDay(new Date());
  if (!hasActivity(dateKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!hasActivity(dateKey(cursor))) return 0;
  }
  let streak = 0;
  while (hasActivity(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
