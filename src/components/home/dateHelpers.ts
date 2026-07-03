// Small date/schedule helpers ported from lib/state/app_controller.dart
// (_isDueToday, eventsOn, colorForScheduleItem, freeHoursToday, todaysOpenTasks)
// so Home.tsx can compute the same "today" summary the mobile app shows.

import { argbToCss, URGENCY_VALUES, type Course, type ScheduleItem, type Task } from '../../state/types';

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isDueToday(t: Task, now: Date): boolean {
  return !!t.dueDateTime && sameDay(new Date(t.dueDateTime), now);
}

export function completedOnDay(t: Task, day: Date): boolean {
  return !!t.completedAt && sameDay(new Date(t.completedAt), day);
}

/** Tasks due today, not completed, sorted urgent-first then by due time —
 * mirrors AppController.todaysOpenTasks. */
export function todaysOpenTasks(tasks: Task[], now: Date): Task[] {
  return [...tasks]
    .filter((t) => !t.isCompleted && isDueToday(t, now))
    .sort((a, b) => {
      const byUrgency = URGENCY_VALUES.indexOf(b.urgency) - URGENCY_VALUES.indexOf(a.urgency);
      if (byUrgency !== 0) return byUrgency;
      if (!a.dueDateTime || !b.dueDateTime) return 0;
      return a.dueDateTime.localeCompare(b.dueDateTime);
    });
}

/** Schedule items visible on [day]: same-day items, weekly-repeating items on
 * a matching weekday (on/after their first occurrence), and multi-day spans
 * that cover the day — mirrors AppController.eventsOn. Sorted by time of day. */
export function eventsOn(items: ScheduleItem[], day: Date): ScheduleItem[] {
  const d = startOfDay(day);
  return items
    .filter((e) => {
      const s = new Date(e.startDateTime);
      const en = new Date(e.endDateTime);
      const startDay = startOfDay(s);
      const endDay = startOfDay(en);
      const withinSpan = d >= startDay && d <= endDay;
      const sd = sameDay(s, d);
      const repeats = e.weeklyRepeat && s.getDay() === d.getDay() && d >= startDay;
      return sd || repeats || withinSpan;
    })
    .sort((a, b) => {
      const at = new Date(a.startDateTime);
      const bt = new Date(b.startDateTime);
      return at.getHours() * 60 + at.getMinutes() - (bt.getHours() * 60 + bt.getMinutes());
    });
}

/** Rough free-hours estimate within an 08:00–22:00 window, after subtracting
 * today's scheduled events — mirrors AppController.freeHoursToday. */
export function freeHoursToday(todayEvents: ScheduleItem[]): number {
  const startH = 8;
  const endH = 22;
  let busy = 0;
  for (const e of todayEvents) {
    const s = new Date(e.startDateTime);
    const en = new Date(e.endDateTime);
    const sH = s.getHours() + s.getMinutes() / 60;
    const enH = en.getHours() + en.getMinutes() / 60;
    const lo = Math.min(Math.max(sH, startH), endH);
    const hi = Math.min(Math.max(enH, startH), endH);
    if (hi > lo) busy += hi - lo;
  }
  return Math.min(14, Math.max(0, Math.round(endH - startH - busy)));
}

/** Color for a schedule item: its linked task's course color, else a
 * per-event-type fallback — mirrors AppController.colorForScheduleItem. */
export function colorForScheduleItem(
  item: ScheduleItem,
  courseById: (id?: string | null) => Course | undefined,
  taskById: (id?: string | null) => Task | undefined,
): string {
  const task = taskById(item.taskId);
  const course = courseById(task?.courseId);
  if (course) return argbToCss(course.color);
  switch (item.type) {
    case 'exam':
      return '#EF4444';
    case 'submission':
      return '#F59E0B';
    case 'class':
      return '#6366F1';
    default:
      return '#10B981';
  }
}

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const eventTypeKey = (type: ScheduleItem['type']): string => {
  switch (type) {
    case 'exam':
      return 'event_type_exam';
    case 'submission':
      return 'event_type_submission';
    case 'class':
      return 'event_type_class';
    default:
      return 'event_type_personal';
  }
};
