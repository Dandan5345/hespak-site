// Ported from AppController._entitiesContext / _scheduleForDate in
// lib/state/app_controller.dart — the system-turn that lists current
// courses/tasks/reminders (with real ids) so the model can act on them, and
// the read-only `get_schedule` tool implementation.
import type { Course, ScheduleItem, SmartReminder, Task } from '../../state/types';

export function buildEntitiesContext(courses: Course[], tasks: Task[], smartReminders: SmartReminder[]): string {
  const courseList = courses.map((c) => ({
    id: c.id,
    name: c.name,
    ...(c.description ? { description: c.description } : {}),
    ...(c.startDate ? { startDate: c.startDate } : {}),
    ...(c.endDate ? { endDate: c.endDate } : {}),
  }));
  const openTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    courseId: t.courseId ?? null,
    description: t.description ?? null,
    dueDateTime: t.dueDateTime ?? null,
    urgency: t.urgency,
    isCompleted: t.isCompleted,
    ...(t.estimatedDurationMinutes != null ? { estimatedDurationMinutes: t.estimatedDurationMinutes } : {}),
  }));
  const reminderList = smartReminders.map((r) => ({
    id: r.id,
    title: r.title,
    dateTime: r.dateTime,
    ...(r.linkedTaskId ? { taskId: r.linkedTaskId } : {}),
    ...(r.linkedScheduleId ? { scheduleId: r.linkedScheduleId } : {}),
  }));
  return (
    `[נתוני אפליקציה] קורסים קיימים (השתמש רק ב-courseId האלה): ${JSON.stringify(courseList)}. ` +
    `משימות קיימות (השתמש רק ב-taskId האלה): ${JSON.stringify(openTasks)}. ` +
    `התראות חכמות קיימות (השתמש רק ב-id האלה לעריכה/מחיקה): ${JSON.stringify(reminderList)}.`
  );
}

/** Answers the `{"tool":"get_schedule","date":"YYYY-MM-DD"}` read-only tool
 * call locally from app scheduleItems — same day-matching semantics as the
 * Dart `_scheduleForDate`: exact date match, multi-day span, or weekly-repeat
 * weekday match. Device-calendar mirror items are marked as external.
 * An optional `endDate` turns the lookup into a range (capped at 31 days) so
 * the model can read a whole week/month in one round-trip; each matching item
 * is returned once (its own start/end + weeklyRepeat tell the story). */
export function scheduleForDate(
  dateStr: string | undefined,
  endDateStr: string | undefined,
  scheduleItems: ScheduleItem[],
): { date: string | undefined; endDate?: string; events: unknown[] } {
  const date = dateStr ? new Date(dateStr) : null;
  if (!date || Number.isNaN(date.getTime())) return { date: dateStr, events: [] };
  const first = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endParsed = endDateStr ? new Date(endDateStr) : null;
  let last = endParsed && !Number.isNaN(endParsed.getTime())
    ? new Date(endParsed.getFullYear(), endParsed.getMonth(), endParsed.getDate())
    : first;
  if (last.getTime() < first.getTime()) last = first;
  const maxLast = new Date(first);
  maxLast.setDate(maxLast.getDate() + 61);
  if (last.getTime() > maxLast.getTime()) last = maxLast;
  const events = scheduleItems
    .filter((e) => {
      const s = new Date(e.startDateTime);
      const en = new Date(e.endDateTime);
      const startDay = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
      const endDay = new Date(en.getFullYear(), en.getMonth(), en.getDate()).getTime();
      for (const d = new Date(first); d.getTime() <= last.getTime(); d.setDate(d.getDate() + 1)) {
        const day = d.getTime();
        const withinSpan = day >= startDay && day <= endDay;
        const repeats = e.weeklyRepeat && s.getDay() === d.getDay() && day >= startDay;
        if (withinSpan || repeats) return true;
      }
      return false;
    })
    .map((e) => ({
      id: e.id,
      title: e.title,
      taskId: e.taskId ?? null,
      type: e.type,
      start: e.startDateTime,
      end: e.endDateTime,
      weeklyRepeat: e.weeklyRepeat,
      allDay: e.allDay,
      external: e.createdBy === 'device',
      calendarId: e.calendarId ?? null,
    }));
  return endDateStr ? { date: dateStr, endDate: endDateStr, events } : { date: dateStr, events };
}
