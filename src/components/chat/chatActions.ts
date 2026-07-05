// Applies the AI's data-mutating action JSON (already approved by the user)
// against useData(). Field names mirror the JSON shapes documented in
// src/services/chatPrompts.ts (ported 1:1 from lib/services/chat_prompts.dart),
// and the created/updated/deleted summary line mirrors
// AppController._applyActions in lib/state/app_controller.dart.
import type { useData } from '../../state/DataContext';
import type { EventType, Urgency } from '../../state/types';
import { PENDING_START_MINUTES_KEY, FOCUS_START_EVENT, clampMinutes } from '../focus/focusStore';

type Data = ReturnType<typeof useData>;
type Json = Record<string, unknown>;

/** Actions that mutate app data and therefore require the user's approval
 * before being applied (matches AppController._mutationActions minus the
 * device-only / immediate ones, which the chat engine handles separately). */
export const MUTATION_ACTIONS = new Set([
  'create_course',
  'update_course',
  'delete_course',
  'create_task',
  'update_task',
  'delete_task',
  'create_schedule_item',
  'update_schedule_item',
  'delete_schedule_item',
  'start_focus',
  'set_smart_notifications',
  'create_smart_reminder',
  'update_smart_reminder',
  'delete_smart_reminder',
  'set_agent_calendar_access',
  'create_calendar',
]);

/** Mirrors AppController._mutationListFromJson: a reply is either a single
 * `{action:...}` envelope or a `{actions:[...]}` batch. */
export function mutationActionsFromJson(json: Json): Json[] {
  if (Array.isArray(json.actions)) {
    return (json.actions as unknown[]).filter(
      (item): item is Json => !!item && typeof item === 'object' && MUTATION_ACTIONS.has((item as Json).action as string),
    );
  }
  if (typeof json.action === 'string' && MUTATION_ACTIONS.has(json.action)) return [json];
  return [];
}

/** Builds the exact, ground-truth breakdown of a staged action batch that is
 * appended under the model's own "message" in the approval bubble — so the
 * user always sees precisely what will happen, even if the model's free-text
 * explanation is vague. One markdown list line per action. */
export function describeActions(actions: Json[], data: Data, t: (key: string) => string, lang: string): string {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const fmtDay = (iso: string | undefined): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'numeric' }).format(d);
  };
  const fmtTime = (iso: string | undefined): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  };
  const fmtRange = (startIso?: string, endIso?: string, allDay?: boolean): string => {
    if (!startIso) return '';
    const day = fmtDay(startIso);
    if (allDay) return `${day} (${t('chat_detail_all_day')})`;
    const sameDay = endIso && startIso.slice(0, 10) === endIso.slice(0, 10);
    if (endIso && !sameDay) return `${day} ${fmtTime(startIso)} → ${fmtDay(endIso)} ${fmtTime(endIso)}`;
    return `${day} ${fmtTime(startIso)}${endIso ? `–${fmtTime(endIso)}` : ''}`;
  };
  const line = (verb: string, noun: string, title: string, extra?: string): string =>
    `- ${t(verb)} ${t(noun)}: "${title}"${extra ? ` — ${extra}` : ''}`;

  const lines: string[] = [];
  for (const a of actions) {
    if (!a || typeof a !== 'object') continue;
    const id = str(a.id);
    switch (a.action) {
      case 'create_course':
        lines.push(line('chat_detail_create', 'chat_noun_course', str(a.title) ?? str(a.name) ?? '', [str(a.startDate), str(a.endDate)].filter(Boolean).join(' → ')));
        break;
      case 'update_course': {
        const current = id ? data.courseById(id) : undefined;
        lines.push(line('chat_detail_update', 'chat_noun_course', current?.name ?? id ?? '', changedFields(a, ['title', 'name', 'description', 'startDate', 'endDate'], t)));
        break;
      }
      case 'delete_course': {
        const current = id ? data.courseById(id) : undefined;
        lines.push(line('chat_detail_delete', 'chat_noun_course', current?.name ?? id ?? ''));
        break;
      }
      case 'create_task': {
        const due = str(a.dueDateTime);
        lines.push(line('chat_detail_create', 'chat_noun_task', str(a.title) ?? '', due ? `${t('chat_detail_due')} ${fmtDay(due)} ${fmtTime(due)}` : undefined));
        break;
      }
      case 'update_task': {
        const current = id ? data.taskById(id) : undefined;
        lines.push(line('chat_detail_update', 'chat_noun_task', current?.title ?? id ?? '', changedFields(a, ['title', 'description', 'courseId', 'dueDateTime', 'urgency', 'estimatedDurationMinutes', 'isCompleted'], t)));
        break;
      }
      case 'delete_task': {
        const current = id ? data.taskById(id) : undefined;
        lines.push(line('chat_detail_delete', 'chat_noun_task', current?.title ?? id ?? '', t('chat_detail_task_slots_too')));
        break;
      }
      case 'create_schedule_item': {
        const linkedTask = str(a.taskId) ? data.taskById(str(a.taskId)!) : undefined;
        const title = str(a.title) ?? linkedTask?.title ?? '';
        let extra = fmtRange(str(a.startDateTime) ?? str(a.start), str(a.endDateTime) ?? str(a.end), bool(a.allDay));
        if (bool(a.weeklyRepeat)) extra += ` (${t('chat_detail_weekly')})`;
        lines.push(line('chat_detail_create', 'chat_noun_schedule', title, extra));
        break;
      }
      case 'update_schedule_item': {
        const current = id ? data.scheduleById(id) : undefined;
        const parts: string[] = [];
        if (current) parts.push(fmtRange(current.startDateTime, current.endDateTime, current.allDay));
        const newRange = fmtRange(str(a.startDateTime), str(a.endDateTime), bool(a.allDay) ?? current?.allDay);
        if (newRange && str(a.startDateTime)) parts.push(`→ ${newRange}`);
        const fields = changedFields(a, ['title', 'description', 'taskId', 'type', 'weeklyRepeat', 'allDay'], t);
        lines.push(line('chat_detail_update', 'chat_noun_schedule', current?.title ?? id ?? '', [parts.join(' '), fields].filter(Boolean).join(' · ')));
        break;
      }
      case 'delete_schedule_item': {
        const current = id ? data.scheduleById(id) : undefined;
        lines.push(line('chat_detail_delete', 'chat_noun_schedule', current?.title ?? id ?? '', current ? fmtRange(current.startDateTime, current.endDateTime, current.allDay) : undefined));
        break;
      }
      case 'start_focus':
        lines.push(`- ${t('chat_detail_focus').replace('{min}', String(num(a.minutes) ?? (Number.isFinite(Number(a.minutes)) ? Number(a.minutes) : 0)))}`);
        break;
      case 'set_smart_notifications':
        lines.push(`- ${t(a.enabled === false ? 'chat_smart_notif_off' : 'chat_smart_notif_on')}`);
        break;
      case 'create_smart_reminder': {
        const when = str(a.dateTime);
        lines.push(line('chat_detail_create', 'chat_noun_reminder', str(a.title) ?? '', when ? `${fmtDay(when)} ${fmtTime(when)}` : undefined));
        break;
      }
      case 'update_smart_reminder': {
        const current = id ? data.smartReminders.find((r) => r.id === id) : undefined;
        lines.push(line('chat_detail_update', 'chat_noun_reminder', current?.title ?? id ?? '', changedFields(a, ['title', 'description', 'dateTime'], t)));
        break;
      }
      case 'delete_smart_reminder': {
        const current = id ? data.smartReminders.find((r) => r.id === id) : undefined;
        lines.push(line('chat_detail_delete', 'chat_noun_reminder', current?.title ?? id ?? ''));
        break;
      }
      default:
        break;
    }
  }
  if (lines.length === 0) return '';
  const header = t('chat_details_header').replace('{count}', String(lines.length));
  return `${header}\n${lines.join('\n')}`;
}

/** "field: value" fragments for the fields an update action actually sends. */
function changedFields(a: Json, keys: string[], t: (key: string) => string): string {
  const parts: string[] = [];
  for (const key of keys) {
    if (!(key in a)) continue;
    const v = a[key];
    if (v === undefined) continue;
    const label = t(`chat_field_${key}`);
    parts.push(`${label}: ${typeof v === 'boolean' ? t(v ? 'chat_detail_yes' : 'chat_detail_no') : String(v ?? '—')}`);
  }
  return parts.join(' · ');
}

const COLOR_PALETTE = [0xff6366f1, 0xff22c55e, 0xfff59e0b, 0xffec4899, 0xff06b6d4, 0xff8b5cf6, 0xffef4444, 0xff14b8a6];
function colorFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[h % COLOR_PALETTE.length];
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);

/** Add minutes to a local `YYYY-MM-DDTHH:mm` datetime, returning the same
 * format. Used to fill in a missing end time so a schedule action the model got
 * *almost* right still creates something instead of silently doing nothing. */
function addMinutesIso(iso: string, minutes: number): string | undefined {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setMinutes(d.getMinutes() + minutes);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Applies every action in order (so a `create_course` with a proposed
 * `c_ai_...` id can be immediately referenced by a following `create_task`
 * in the same batch), then returns the localized "✅ Done! created N ·
 * updated N · deleted N" summary line — same phrasing/keys as the Dart app. */
export function applyMutationActions(actions: Json[], data: Data, t: (key: string) => string): string {
  let created = 0;
  let updated = 0;
  let deleted = 0;
  const extraParts: string[] = [];

  for (const a of actions) {
    if (!a || typeof a !== 'object') continue;
    switch (a.action) {
      case 'create_course': {
        const title = (str(a.title) ?? str(a.name) ?? '').trim();
        if (!title) break;
        data.addCourse({
          id: str(a.id),
          name: title,
          color: colorFor(title),
          description: str(a.description) ?? null,
          startDate: str(a.startDate) ?? null,
          endDate: str(a.endDate) ?? null,
          createdBy: 'ai',
        });
        created++;
        break;
      }
      case 'update_course': {
        const id = str(a.id) ?? str(a.courseId);
        if (!id || !data.courseById(id)) break;
        const patch: Record<string, unknown> = {};
        if ('title' in a || 'name' in a) {
          const title = (str(a.title) ?? str(a.name) ?? '').trim();
          if (!title) break;
          patch.name = title;
        }
        if ('description' in a) patch.description = str(a.description) ?? null;
        if ('startDate' in a) patch.startDate = str(a.startDate) ?? null;
        if ('endDate' in a) patch.endDate = str(a.endDate) ?? null;
        data.updateCourse(id, patch);
        updated++;
        break;
      }
      case 'delete_course': {
        const id = str(a.id) ?? str(a.courseId);
        if (!id || !data.courseById(id)) break;
        data.deleteCourse(id);
        deleted++;
        break;
      }
      case 'create_task': {
        const title = (str(a.title) ?? '').trim();
        if (!title) break;
        data.addTask({
          id: str(a.id),
          title,
          description: str(a.description) ?? null,
          courseId: str(a.courseId) || null,
          dueDateTime: str(a.dueDateTime) ?? null,
          urgency: (str(a.urgency) as Urgency | undefined) ?? 'notUrgent',
          estimatedDurationMinutes: num(a.estimatedDurationMinutes) ?? null,
          createdBy: 'ai',
        });
        created++;
        break;
      }
      case 'update_task': {
        const id = str(a.id);
        if (!id || !data.taskById(id)) break;
        const patch: Record<string, unknown> = {};
        if ('title' in a && str(a.title)) patch.title = str(a.title);
        if ('description' in a) patch.description = str(a.description) ?? null;
        if ('courseId' in a) patch.courseId = str(a.courseId) || null;
        if ('dueDateTime' in a) patch.dueDateTime = str(a.dueDateTime) ?? null;
        if ('urgency' in a && str(a.urgency)) patch.urgency = str(a.urgency);
        if ('estimatedDurationMinutes' in a) patch.estimatedDurationMinutes = num(a.estimatedDurationMinutes) ?? null;
        if ('isCompleted' in a) patch.isCompleted = bool(a.isCompleted) ?? false;
        data.updateTask(id, patch);
        updated++;
        break;
      }
      case 'delete_task': {
        const id = str(a.id);
        if (!id || !data.taskById(id)) break;
        data.deleteTask(id);
        deleted++;
        break;
      }
      case 'create_schedule_item': {
        const taskId = str(a.taskId) || undefined;
        const linkedTask = taskId ? data.taskById(taskId) : undefined;
        const title = (str(a.title) ?? linkedTask?.title ?? '').trim();
        const allDay = bool(a.allDay) ?? false;
        // Accept a couple of alias field names, and fill a missing end time
        // (default 1h, or same-as-start for all-day) so the item still gets
        // created instead of silently vanishing.
        const start = str(a.startDateTime) ?? str(a.start);
        if (!start || !title) break;
        const end = str(a.endDateTime) ?? str(a.end) ?? addMinutesIso(start, allDay ? 0 : 60) ?? start;
        data.addScheduleItem({
          id: str(a.id),
          taskId: taskId ?? null,
          title,
          description: str(a.description) ?? null,
          startDateTime: start,
          endDateTime: end,
          type: (str(a.type) as EventType | undefined) ?? 'personal',
          weeklyRepeat: bool(a.weeklyRepeat) ?? false,
          allDay,
          calendarId: str(a.calendarId) ?? null,
          createdBy: 'ai',
        });
        created++;
        break;
      }
      case 'update_schedule_item': {
        const id = str(a.id);
        if (!id || !data.scheduleById(id)) break;
        const patch: Record<string, unknown> = {};
        if ('taskId' in a) patch.taskId = str(a.taskId) || null;
        if ('title' in a && str(a.title)) patch.title = str(a.title);
        if ('description' in a) patch.description = str(a.description) ?? null;
        if ('startDateTime' in a && str(a.startDateTime)) patch.startDateTime = str(a.startDateTime);
        if ('endDateTime' in a && str(a.endDateTime)) patch.endDateTime = str(a.endDateTime);
        if ('type' in a && str(a.type)) patch.type = str(a.type);
        if ('weeklyRepeat' in a) patch.weeklyRepeat = bool(a.weeklyRepeat) ?? false;
        if ('allDay' in a) patch.allDay = bool(a.allDay) ?? false;
        data.updateScheduleItem(id, patch);
        updated++;
        break;
      }
      case 'delete_schedule_item': {
        const id = str(a.id);
        if (!id || !data.scheduleById(id)) break;
        data.deleteScheduleItem(id);
        deleted++;
        break;
      }
      case 'start_focus': {
        const minutesRaw = num(a.minutes) ?? Number(a.minutes);
        const minutes = Number.isFinite(minutesRaw) && minutesRaw > 0 ? clampMinutes(minutesRaw) : null;
        if (minutes) {
          localStorage.setItem(PENDING_START_MINUTES_KEY, String(minutes));
          window.dispatchEvent(new Event(FOCUS_START_EVENT));
          extraParts.push(t('chat_focus_started').replace('{min}', String(minutes)));
        }
        break;
      }
      case 'set_smart_notifications': {
        if (typeof a.enabled === 'boolean') {
          extraParts.push(t(a.enabled ? 'chat_smart_notif_on' : 'chat_smart_notif_off'));
        }
        break;
      }
      case 'create_smart_reminder': {
        const when = str(a.dateTime);
        if (!when) break;
        const taskId = str(a.taskId) || undefined;
        const scheduleId = str(a.scheduleId) || undefined;
        const linkedTask = taskId ? data.taskById(taskId) : undefined;
        const linkedSchedule = scheduleId ? data.scheduleById(scheduleId) : undefined;
        const title = (str(a.title) ?? linkedTask?.title ?? linkedSchedule?.title ?? '').trim();
        if (!title) break;
        data.addSmartReminder({
          id: str(a.id),
          title,
          description: str(a.description) ?? null,
          dateTime: when,
          linkedTaskId: taskId ?? null,
          linkedScheduleId: scheduleId ?? null,
          createdBy: 'ai',
        });
        created++;
        break;
      }
      case 'update_smart_reminder': {
        const id = str(a.id);
        if (!id || !data.smartReminders.some((r) => r.id === id)) break;
        const patch: Record<string, unknown> = {};
        if ('title' in a && str(a.title)) patch.title = str(a.title);
        if ('description' in a) patch.description = str(a.description) ?? null;
        if ('dateTime' in a && str(a.dateTime)) patch.dateTime = str(a.dateTime);
        data.updateSmartReminder(id, patch);
        updated++;
        break;
      }
      case 'delete_smart_reminder': {
        const id = str(a.id);
        if (!id || !data.smartReminders.some((r) => r.id === id)) break;
        data.deleteSmartReminder(id);
        deleted++;
        break;
      }
      case 'set_agent_calendar_access': {
        extraParts.push(t('chat_mobile_only_action'));
        break;
      }
      case 'create_calendar': {
        extraParts.push(t('chat_mobile_only_action'));
        break;
      }
      default:
        break;
    }
  }

  const parts: string[] = [];
  if (created > 0) parts.push(t('chat_actions_created').replace('{count}', String(created)));
  if (updated > 0) parts.push(t('chat_actions_updated').replace('{count}', String(updated)));
  if (deleted > 0) parts.push(t('chat_actions_deleted').replace('{count}', String(deleted)));
  parts.push(...extraParts);
  if (parts.length === 0) return t('chat_actions_none');
  return `${t('chat_actions_done')} ${parts.join(' · ')}`;
}
