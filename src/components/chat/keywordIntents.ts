// Ported from the `_is*Intent` keyword-matching helpers + term lists in
// lib/state/app_controller.dart (search `_ensureLazyPromptsForText`). Decides
// which lazy prompt packs a given user message needs, so the web chat's
// system-prompt assembly matches the mobile app's token-saving behavior.
import type { ChatPromptPack } from '../../services/chatPrompts';

const SCHEDULE_DIRECT_TERMS = [
  'לו"ז', 'לו״ז', 'לוז', 'לוח זמנים', 'יומן', 'מערכת שעות',
  'מה יש לי היום', 'מה יש היום', 'מה יש לי מחר', 'מה יש לי השבוע',
  'מה מתוכנן', 'מה קורה היום', 'מה קורה מחר', 'מתי יש לי',
  'תכנן לי את היום', 'סדר לי את היום',
  'schedule', 'calendar', 'timetable', 'agenda', 'what do i have today', 'what is planned',
];
const SCHEDULE_SUBJECTS = ['שיעור', 'שיעורים', 'אירוע', 'פגישה', 'מבחן', 'בחינה', 'class', 'lesson', 'event', 'meeting', 'exam'];
const SCHEDULE_ACTIONS = [
  'תקבע', 'לקבוע', 'קבע', 'תשבץ', 'שבץ', 'לשבץ', 'תוסיף', 'להוסיף',
  'תעדכן', 'לעדכן', 'תשנה', 'שנה', 'לשנות', 'תזיז', 'להזיז', 'דחה', 'לדחות',
  'תמחק', 'למחוק', 'מחק', 'מה יש', 'תראה', 'הצג', 'יש לי', 'תכנן', 'לתכנן',
  'add', 'schedule', 'reschedule', 'move', 'change', 'update', 'delete', 'remove', 'show',
];

const TASK_SUBJECTS = ['משימה', 'משימות', 'מטלה', 'מטלות', 'תרגיל', 'שיעורי בית', 'assignment', 'task', 'todo', 'to-do', 'homework'];
const TASK_ACTIONS = [
  'תיצור', 'צור', 'ליצור', 'תוסיף', 'להוסיף', 'הוסף', 'תעדכן', 'לעדכן', 'עדכן',
  'תערוך', 'לערוך', 'ערוך', 'תשנה', 'לשנות', 'שנה', 'תמחק', 'למחוק', 'מחק',
  'תזכיר', 'להזכיר', 'צריך', 'צריכה', 'לעשות', 'להגיש', 'לסיים', 'סיים', 'להכין', 'הכן', 'יש לי',
  'create', 'add', 'edit', 'update', 'change', 'delete', 'remove', 'remind', 'need to', 'submit', 'finish', 'prepare',
];

const COURSE_SUBJECTS = ['קורס', 'קורסים', 'מקצוע', 'מקצועות', 'סמסטר', 'semester', 'course', 'courses', 'subject', 'class'];
const COURSE_ACTIONS = [
  'תיצור', 'צור', 'ליצור', 'תוסיף', 'להוסיף', 'הוסף', 'תעדכן', 'לעדכן', 'עדכן',
  'תערוך', 'לערוך', 'ערוך', 'תשנה', 'לשנות', 'שנה', 'תמחק', 'למחוק', 'מחק',
  'תפתח', 'פתח', 'לפתוח', 'יש לי', 'create', 'add', 'edit', 'update', 'change', 'delete', 'remove', 'open',
];

const SMART_NOTIFICATION_TERMS = [
  'התראה', 'התראות', 'תזכורת', 'תזכורות', 'תזכיר', 'תזכירי', 'להזכיר',
  'notification', 'notifications', 'reminder', 'reminders', 'remind me', 'alert',
];
const FOCUS_TERMS = ['פוקוס', 'מיקוד', 'מצב מיקוד', 'פומודורו', 'טיימר', 'focus', 'pomodoro', 'timer'];
const IDENTITY_TERMS = ['קרא לעצמך', 'תקרא לעצמך', 'קוראים לך', 'השם שלך', 'שמך', 'name yourself', 'your name', 'call you'];
const MEMORY_TERMS = [
  'תזכור', 'תזכרי', 'זכור', 'זכרי', 'אל תשכח', 'אל תשכחי', 'תשמור בזיכרון', 'לזכור', 'תזכר',
  'אני מעדיף', 'אני מעדיפה', 'מעדיף', 'מעדיפה', 'העדפה', 'העדפות', 'קשה לי',
  'אני לא לומד', 'אני לא לומדת', 'אני עושה הפסקה', 'אני עושה הפסקות', 'הפסקה אחרי',
  'הרגל', 'הרגלים', 'אילוץ', 'אילוצים',
  'remember', 'keep in mind', 'my preference', 'i prefer', 'habit', 'constraint',
];

function containsAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function isScheduleIntent(lower: string): boolean {
  return containsAny(lower, SCHEDULE_DIRECT_TERMS) || (containsAny(lower, SCHEDULE_SUBJECTS) && containsAny(lower, SCHEDULE_ACTIONS));
}
export function isTaskIntent(lower: string): boolean {
  return containsAny(lower, TASK_SUBJECTS) && containsAny(lower, TASK_ACTIONS);
}
export function isCourseIntent(lower: string): boolean {
  return containsAny(lower, COURSE_SUBJECTS) && containsAny(lower, COURSE_ACTIONS);
}
export function isSmartNotificationIntent(lower: string): boolean {
  return containsAny(lower, SMART_NOTIFICATION_TERMS);
}
export function isFocusIntent(lower: string): boolean {
  return containsAny(lower, FOCUS_TERMS);
}
export function isIdentityIntent(lower: string): boolean {
  return containsAny(lower, IDENTITY_TERMS);
}
export function isMemoryIntent(lower: string): boolean {
  return containsAny(lower, MEMORY_TERMS);
}

/** Mirrors `_ensureLazyPromptsForText`: which packs a message's keywords call for. */
export function packsForText(text: string): ChatPromptPack[] {
  const lower = text.toLowerCase();
  const packs: ChatPromptPack[] = [];
  if (isScheduleIntent(lower)) packs.push('schedule');
  if (isCourseIntent(lower)) packs.push('courses');
  if (isTaskIntent(lower)) packs.push('tasks');
  if (isSmartNotificationIntent(lower)) packs.push('smartNotifications');
  if (isFocusIntent(lower)) packs.push('focus');
  if (isIdentityIntent(lower)) packs.push('identity');
  if (isMemoryIntent(lower)) packs.push('memory');
  return packs;
}

/** Packs whose Dart counterpart is loaded with `includeEntities: true`
 * (they need to see current courses/tasks/reminders to act on real ids). */
export const PACKS_NEEDING_ENTITIES: ChatPromptPack[] = ['schedule', 'courses', 'tasks', 'smartNotifications'];

/** Fixed iteration order matching `ChatPromptPack.values` in Dart, so the
 * assembled system turns come out in a stable, predictable order. */
export const PACK_ORDER: ChatPromptPack[] = [
  'actionProtocol',
  'tasks',
  'courses',
  'schedule',
  'focus',
  'smartNotifications',
  'identity',
  'memory',
];
