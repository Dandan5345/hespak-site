// Local-only habit tracker persistence. Habits are NOT part of the shared
// Firestore appState document (the mobile app doesn't cloud-sync habits
// either), so everything here lives in localStorage — same local-first
// approach as the Dart app for this feature.

export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  createdAt: string; // ISO
}

/** date-string (YYYY-MM-DD) -> done */
export type HabitLog = Record<string, boolean>;

const HABITS_KEY = 'sf_habits';
const HABIT_LOG_PREFIX = 'sf_habit_log_';

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function genHabitId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeHabits(habits: Habit[]) {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

function logKey(habitId: string): string {
  return `${HABIT_LOG_PREFIX}${habitId}`;
}

export function readHabitLog(habitId: string): HabitLog {
  try {
    const raw = localStorage.getItem(logKey(habitId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeHabitLog(habitId: string, log: HabitLog) {
  localStorage.setItem(logKey(habitId), JSON.stringify(log));
}

export function deleteHabitLog(habitId: string) {
  localStorage.removeItem(logKey(habitId));
}

export function toggleToday(habitId: string): HabitLog {
  const log = readHabitLog(habitId);
  const key = todayKey();
  const next: HabitLog = { ...log, [key]: !log[key] };
  writeHabitLog(habitId, next);
  return next;
}

/** Current streak (consecutive done days ending today or yesterday, so a
 * not-yet-marked "today" doesn't zero out yesterday's streak) + best streak
 * ever recorded in the log. */
export function computeStreaks(log: HabitLog): { current: number; best: number } {
  const keys = Object.keys(log).filter((k) => log[k]).sort();
  if (keys.length === 0) return { current: 0, best: 0 };

  // Best streak: longest run of consecutive calendar days present (sorted).
  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(`${keys[i - 1]}T00:00:00`);
    const cur = new Date(`${keys[i]}T00:00:00`);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) {
      run += 1;
    } else if (diffDays > 1) {
      run = 1;
    }
    if (run > best) best = run;
  }

  // Current streak: walk backward from today (or yesterday) while marked done.
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!log[dateKey(cursor)]) {
    cursor = addDays(cursor, -1);
    if (!log[dateKey(cursor)]) return { current: 0, best };
  }
  let current = 0;
  while (log[dateKey(cursor)]) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}
