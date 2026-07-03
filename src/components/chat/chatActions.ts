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

const COLOR_PALETTE = [0xff6366f1, 0xff22c55e, 0xfff59e0b, 0xffec4899, 0xff06b6d4, 0xff8b5cf6, 0xffef4444, 0xff14b8a6];
function colorFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[h % COLOR_PALETTE.length];
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);

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
        const start = str(a.startDateTime);
        const end = str(a.endDateTime);
        if (!start || !end || !title) break;
        data.addScheduleItem({
          id: str(a.id),
          taskId: taskId ?? null,
          title,
          description: str(a.description) ?? null,
          startDateTime: start,
          endDateTime: end,
          type: (str(a.type) as EventType | undefined) ?? 'personal',
          weeklyRepeat: bool(a.weeklyRepeat) ?? false,
          allDay: bool(a.allDay) ?? false,
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
