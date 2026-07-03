// Wall-clock-based focus timer persistence. State is reconstructed from
// Date.now() vs a stored end timestamp on every mount/tick, never from a
// setInterval's own elapsed count — the same approach the Dart app uses
// (AppController.refreshFocusFromClock), so a page refresh never loses
// progress.

export const MAX_FOCUS_SECONDS = 8 * 60 * 60; // 480 minutes hard cap, mirrors maxFocusSeconds in app_controller.dart
export const MAX_FOCUS_MINUTES = MAX_FOCUS_SECONDS / 60;
export const MIN_FOCUS_MINUTES = 5;
export const DEFAULT_FOCUS_SECONDS = 25 * 60;

const KEY_ENDS_AT = 'sf_focus_ends_at';
const KEY_TOTAL_SECONDS = 'sf_focus_total_seconds';
const KEY_RUNNING = 'sf_focus_running';
// Extra internal key (beyond the three documented ones) needed to persist the
// remaining time while paused — the three documented keys are sufficient to
// reconstruct a *running* countdown, this one covers the paused case.
const KEY_REMAINING_SECONDS = 'sf_focus_remaining_seconds';
const KEY_LINKED_TASK = 'sf_focus_linked_task_id';

export const PENDING_START_MINUTES_KEY = 'sf_focus_start_minutes';
export const FOCUS_START_EVENT = 'sf-focus-start';

export function clampSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_FOCUS_SECONDS;
  return Math.max(MIN_FOCUS_MINUTES * 60, Math.min(MAX_FOCUS_SECONDS, Math.round(seconds)));
}

export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_FOCUS_SECONDS / 60;
  return Math.max(MIN_FOCUS_MINUTES, Math.min(MAX_FOCUS_MINUTES, Math.round(minutes)));
}

export interface FocusState {
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
}

/** Reconstructs timer state from localStorage + the real clock. Call on mount. */
export function loadFocusState(): FocusState {
  const total = clampSeconds(Number(localStorage.getItem(KEY_TOTAL_SECONDS)) || DEFAULT_FOCUS_SECONDS);
  const running = localStorage.getItem(KEY_RUNNING) === '1';
  if (running) {
    const endsAtRaw = localStorage.getItem(KEY_ENDS_AT);
    const endsAt = endsAtRaw ? new Date(endsAtRaw).getTime() : Date.now();
    const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
    return { totalSeconds: total, remainingSeconds: Math.min(remaining, total), running: remaining > 0 };
  }
  const storedRemaining = Number(localStorage.getItem(KEY_REMAINING_SECONDS));
  const remaining = Number.isFinite(storedRemaining) && storedRemaining >= 0 ? Math.min(storedRemaining, total) : total;
  return { totalSeconds: total, remainingSeconds: remaining, running: false };
}

/** Recomputes remaining seconds from the stored end timestamp — used by the
 * ticking interval so drift/throttled tabs stay accurate. */
export function readRemainingWhileRunning(): number {
  const endsAtRaw = localStorage.getItem(KEY_ENDS_AT);
  const endsAt = endsAtRaw ? new Date(endsAtRaw).getTime() : Date.now();
  return Math.max(0, Math.round((endsAt - Date.now()) / 1000));
}

export function persistStart(totalSeconds: number, remainingSeconds: number) {
  const endsAt = new Date(Date.now() + remainingSeconds * 1000);
  localStorage.setItem(KEY_TOTAL_SECONDS, String(totalSeconds));
  localStorage.setItem(KEY_ENDS_AT, endsAt.toISOString());
  localStorage.setItem(KEY_RUNNING, '1');
  localStorage.removeItem(KEY_REMAINING_SECONDS);
}

export function persistPause(remainingSeconds: number) {
  localStorage.setItem(KEY_RUNNING, '0');
  localStorage.setItem(KEY_REMAINING_SECONDS, String(remainingSeconds));
}

export function persistResetOrPreset(totalSeconds: number, remainingSeconds: number) {
  localStorage.setItem(KEY_TOTAL_SECONDS, String(totalSeconds));
  localStorage.setItem(KEY_RUNNING, '0');
  localStorage.setItem(KEY_REMAINING_SECONDS, String(remainingSeconds));
  localStorage.removeItem(KEY_ENDS_AT);
}

export function persistCompleted() {
  localStorage.setItem(KEY_RUNNING, '0');
  localStorage.setItem(KEY_REMAINING_SECONDS, '0');
  localStorage.removeItem(KEY_ENDS_AT);
}

export function readLinkedTaskId(): string | null {
  return localStorage.getItem(KEY_LINKED_TASK);
}

export function persistLinkedTaskId(taskId: string | null) {
  if (taskId) localStorage.setItem(KEY_LINKED_TASK, taskId);
  else localStorage.removeItem(KEY_LINKED_TASK);
}

/** Reads + clears a pending "start N minutes" request left by the Chat page
 * (the AI agent starting a focus session on the user's behalf). */
export function consumePendingStartMinutes(): number | null {
  const raw = localStorage.getItem(PENDING_START_MINUTES_KEY);
  if (!raw) return null;
  localStorage.removeItem(PENDING_START_MINUTES_KEY);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return clampMinutes(n);
}

export function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(clamped / 60);
  const ss = clamped % 60;
  const mmStr = mm >= 100 ? String(mm) : String(mm).padStart(2, '0');
  return `${mmStr}:${String(ss).padStart(2, '0')}`;
}
