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
 * weekday match. There is no device/external calendar on web, so `external`
 * is always false here. */
export function scheduleForDate(dateStr: string | undefined, scheduleItems: ScheduleItem[]): { date: string | undefined; events: unknown[] } {
  const date = dateStr ? new Date(dateStr) : null;
  if (!date || Number.isNaN(date.getTime())) return { date: dateStr, events: [] };
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const events = scheduleItems
    .filter((e) => {
      const s = new Date(e.startDateTime);
      const en = new Date(e.endDateTime);
      const startDay = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
      const endDay = new Date(en.getFullYear(), en.getMonth(), en.getDate()).getTime();
      const withinSpan = d >= startDay && d <= endDay;
      const repeats = e.weeklyRepeat && s.getDay() === new Date(d).getDay() && d >= startDay;
      return withinSpan || repeats;
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
      external: false,
      calendarId: e.calendarId ?? null,
    }));
  return { date: dateStr, events };
}
