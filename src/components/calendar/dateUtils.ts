// Date / calendar helpers for the web Calendar page. Mirrors the semantics of
// lib/screens/calendar_screen.dart's private helpers and
// lib/state/app_controller.dart's eventsOn / eventCountInMonth / colorForScheduleItem
// (see CLAUDE.md task brief) — kept local to this feature folder.

import { argbToCss, type Course, type EventType, type ScheduleItem, type Task } from '../../state/types';

const MONTHS: Record<string, string[]> = {
  he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const DAYS_SHORT: Record<string, string[]> = {
  he: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

const WEEKDAY_FULL: Record<string, string[]> = {
  he: ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

/** Column index 0..6 (Sun..Sat) for a date — JS getDay() already matches this. */
export function col(d: Date): number {
  return d.getDay();
}

export function monthName(lang: string, m: number): string {
  return (MONTHS[lang] ?? MONTHS.en)[m - 1];
}

export function dayShort(lang: string, c: number): string {
  return (DAYS_SHORT[lang] ?? DAYS_SHORT.en)[c];
}

export function weekdayFull(lang: string, d: Date): string {
  return (WEEKDAY_FULL[lang] ?? WEEKDAY_FULL.en)[col(d)];
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function hhmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function sundayOf(d: Date): Date {
  return addDays(startOfDay(d), -col(d));
}

/** Days in [month] (1-indexed) of [year]. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Format a Date as a local-time ISO string with NO trailing "Z" — this matches
 * Dart's `DateTime.toIso8601String()` for a local (non-UTC) DateTime, which is
 * what the mobile app writes. Both `new Date(iso)` in JS and `DateTime.parse`
 * in Dart interpret an offset-less date-time string as local time, so this
 * round-trips correctly across the shared Firestore document.
 */
export function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** Value for an `<input type="datetime-local">`. */
export function toDatetimeLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse an `<input type="datetime-local">` value back to a local Date. */
export function fromDatetimeLocalValue(v: string): Date {
  return new Date(v);
}

export function roundToNextHalfHour(d: Date): Date {
  const r = new Date(d);
  r.setSeconds(0, 0);
  const m = r.getMinutes();
  r.setMinutes(m < 30 ? 30 : 0, 0, 0);
  if (m >= 30) r.setHours(r.getHours() + 1);
  return r;
}

/** Fixed semantic colors by event type — intentionally hardcoded (matches the
 * mobile app exactly, see CLAUDE.md "Color logic for events"). */
const TYPE_COLOR: Record<EventType, string> = {
  exam: '#EF4444',
  submission: '#F59E0B',
  classLesson: '#6366F1',
  personal: '#10B981',
};

/** An event's display color: its linked task's course color if any, else a
 * fixed color by type. Mirrors `colorForScheduleItem` in app_controller.dart. */
export function colorForScheduleItem(item: ScheduleItem, tasks: Task[], courses: Course[]): string {
  if (item.createdBy === 'device' && typeof item.calendarColor === 'number') return argbToCss(item.calendarColor);
  const task = item.taskId ? tasks.find((t) => t.id === item.taskId) : undefined;
  const course = task?.courseId ? courses.find((c) => c.id === task.courseId) : undefined;
  if (course) return argbToCss(course.color);
  return TYPE_COLOR[item.type];
}

/**
 * Schedule items visible on [day]: same calendar date, OR a weekly-repeating
 * item whose weekday matches (on/after its first occurrence), OR the day
 * falls within a multi-day/all-day item's [start..end] span. Sorted by time
 * of day. Mirrors `eventsOn` in app_controller.dart.
 */
export function eventsOn(day: Date, items: ScheduleItem[]): ScheduleItem[] {
  const d = startOfDay(day);
  return items
    .filter((e) => {
      const s = new Date(e.startDateTime);
      const en = new Date(e.endDateTime);
      const startDay = startOfDay(s);
      const endDay = startOfDay(en);
      const withinSpan = d.getTime() >= startDay.getTime() && d.getTime() <= endDay.getTime();
      const isSameDay = sameDay(s, d);
      const repeats = e.weeklyRepeat && s.getDay() === d.getDay() && d.getTime() >= startDay.getTime();
      return isSameDay || repeats || withinSpan;
    })
    .sort((a, b) => {
      const sa = new Date(a.startDateTime);
      const sb = new Date(b.startDateTime);
      return (sa.getHours() * 60 + sa.getMinutes()) - (sb.getHours() * 60 + sb.getMinutes());
    });
}

export function eventCountInMonth(year: number, month: number, items: ScheduleItem[]): number {
  const days = daysInMonth(year, month);
  let n = 0;
  for (let d = 1; d <= days; d++) n += eventsOn(new Date(year, month - 1, d), items).length;
  return n;
}

export function durationMinutes(item: ScheduleItem): number {
  const s = new Date(item.startDateTime);
  const e = new Date(item.endDateTime);
  return Math.max(0, (e.getTime() - s.getTime()) / 60000);
}

export function eventTypeKey(t: EventType): string {
  switch (t) {
    case 'exam':
      return 'event_type_exam';
    case 'submission':
      return 'event_type_submission';
    case 'classLesson':
      return 'event_type_class';
    default:
      return 'event_type_personal';
  }
}

export type CalView = 'day' | 'week' | 'month' | 'year';

/** Header title text for the current view, mirroring CalendarScreen._title. */
export function calendarTitle(view: CalView, d: Date, lang: string): string {
  switch (view) {
    case 'day':
      return `${weekdayFull(lang, d)}, ${d.getDate()} ${monthName(lang, d.getMonth() + 1)}`;
    case 'week': {
      const sun = sundayOf(d);
      const sat = addDays(sun, 6);
      if (sun.getMonth() === sat.getMonth()) {
        return `${sun.getDate()}–${sat.getDate()} ${monthName(lang, sun.getMonth() + 1)}`;
      }
      return `${sun.getDate()} ${monthName(lang, sun.getMonth() + 1)} – ${sat.getDate()} ${monthName(lang, sat.getMonth() + 1)}`;
    }
    case 'month':
      return `${monthName(lang, d.getMonth() + 1)} ${d.getFullYear()}`;
    case 'year':
      return `${d.getFullYear()}`;
  }
}
