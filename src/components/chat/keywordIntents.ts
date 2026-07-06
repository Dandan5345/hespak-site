// Decides which lazy instruction packs a user message needs, so each request
// carries only the instructions it actually uses (token saving). The pack
// structure is the web's lazy-pack layout (see services/chatPrompts.ts):
// actionProtocol, scheduleRead, scheduleWrite, tasks, courses, focus,
// smartNotifications, identity, memory.
import type { ChatPromptPack } from '../../services/chatPrompts';

const SCHEDULE_DIRECT_TERMS = [
  'לו"ז', 'לו״ז', 'לוז', 'לוח זמנים', 'יומן', 'מערכת שעות',
  'schedule', 'calendar', 'timetable', 'agenda',
];
const SCHEDULE_READ_TERMS = [
  'מה יש לי היום', 'מה יש היום', 'מה יש לי מחר', 'מה יש מחר', 'מה יש לי השבוע',
  'מה מתוכנן', 'מה קורה היום', 'מה קורה מחר', 'מתי יש לי', 'מה יש לי ב',
  'זמן פנוי', 'פנוי לי', 'מתי אני פנוי', 'מה נשאר לי היום',
  'what do i have today', 'what is planned', 'free time', 'when am i free',
];
const SCHEDULE_SUBJECTS = [
  'שיעור', 'שיעורים', 'אירוע', 'אירועים', 'פגישה', 'פגישות', 'מבחן', 'בחינה',
  'אימון', 'אימונים', 'תור', 'משמרת', 'מפגש', 'חוג', 'דייט', 'חופש', 'חופשה',
  'class', 'lesson', 'event', 'meeting', 'exam', 'workout', 'training', 'appointment', 'shift',
];
// Time expressions that, together with a write verb, almost always mean
// "put this on my schedule" (e.g. "תוסיף אימון מחר ב-5").
const SCHEDULE_TIME_HINTS = [
  'מחר', 'מחרתיים', 'היום', 'הערב', 'בבוקר', 'בצהריים', 'אחר הצהריים', 'בערב', 'הלילה',
  'בשעה', 'ביום ראשון', 'ביום שני', 'ביום שלישי', 'ביום רביעי', 'ביום חמישי', 'ביום שישי', 'בשבת',
  'כל יום', 'כל שבוע', 'שבוע הבא',
  'tomorrow', 'today', 'tonight', "o'clock", 'at ', 'next week', 'every ',
];
const WRITE_ACTIONS = [
  'תקבע', 'לקבוע', 'קבע', 'תשבץ', 'שבץ', 'לשבץ', 'תוסיף', 'להוסיף', 'הוסף',
  'תעדכן', 'לעדכן', 'עדכן', 'תשנה', 'שנה', 'לשנות', 'תזיז', 'להזיז', 'דחה', 'לדחות',
  'תמחק', 'למחוק', 'מחק', 'תבטל', 'לבטל', 'בטל', 'תכנן', 'לתכנן', 'סדר לי', 'תפנה',
  'add', 'schedule', 'reschedule', 'move', 'change', 'update', 'delete', 'remove', 'cancel', 'plan',
];
const READ_ACTIONS = [
  'מה יש', 'תראה', 'להראות', 'הצג', 'תציג', 'יש לי', 'תבדוק', 'לבדוק', 'בדוק', 'מתי',
  'תקרא', 'קרא', 'לקרוא', 'תקריא', 'תסכם', 'סכם', 'לסכם', 'תפרט', 'פרט', 'לפרט',
  'תחזיר', 'החזר', 'תשלוף', 'שלוף', 'תציג לי', 'תראה לי',
  'show', 'check', 'look', 'when', 'list', 'read', 'recite', 'summarize', 'detail',
];

const TASK_SUBJECTS = ['משימה', 'משימות', 'מטלה', 'מטלות', 'תרגיל', 'שיעורי בית', 'assignment', 'task', 'todo', 'to-do', 'homework'];
const TASK_ACTIONS = [
  'תיצור', 'צור', 'ליצור', 'תוסיף', 'להוסיף', 'הוסף', 'תעדכן', 'לעדכן', 'עדכן',
  'תערוך', 'לערוך', 'ערוך', 'תשנה', 'לשנות', 'שנה', 'תמחק', 'למחוק', 'מחק',
  'תזכיר', 'להזכיר', 'צריך', 'צריכה', 'לעשות', 'להגיש', 'לסיים', 'סיים', 'להכין', 'הכן',
  'יש לי', 'מה יש', 'אילו', 'איזה', 'תראה', 'הצג',
  'תקרא', 'קרא', 'לקרוא', 'תסכם', 'סכם', 'תפרט', 'פרט', 'תחזיר', 'החזר', 'תשלוף', 'שלוף',
  'create', 'add', 'edit', 'update', 'change', 'delete', 'remove', 'remind', 'need to', 'submit', 'finish', 'prepare', 'show', 'which', 'list', 'read', 'summarize',
];

const COURSE_SUBJECTS = ['קורס', 'קורסים', 'מקצוע', 'מקצועות', 'סמסטר', 'semester', 'course', 'courses', 'subject'];
const COURSE_ACTIONS = [
  'תיצור', 'צור', 'ליצור', 'תוסיף', 'להוסיף', 'הוסף', 'תעדכן', 'לעדכן', 'עדכן',
  'תערוך', 'לערוך', 'ערוך', 'תשנה', 'לשנות', 'שנה', 'תמחק', 'למחוק', 'מחק',
  'תפתח', 'פתח', 'לפתוח', 'יש לי', 'אילו', 'איזה',
  'תקרא', 'קרא', 'לקרוא', 'תסכם', 'סכם', 'תפרט', 'פרט', 'תחזיר', 'החזר', 'תשלוף', 'שלוף',
  'create', 'add', 'edit', 'update', 'change', 'delete', 'remove', 'open', 'which', 'read', 'summarize',
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

export function isScheduleWriteIntent(lower: string): boolean {
  return (
    containsAny(lower, WRITE_ACTIONS) &&
    (containsAny(lower, SCHEDULE_DIRECT_TERMS) || containsAny(lower, SCHEDULE_SUBJECTS) || containsAny(lower, SCHEDULE_TIME_HINTS))
  );
}
export function isScheduleReadIntent(lower: string): boolean {
  return (
    containsAny(lower, SCHEDULE_READ_TERMS) ||
    (containsAny(lower, SCHEDULE_DIRECT_TERMS) && containsAny(lower, READ_ACTIONS)) ||
    (containsAny(lower, SCHEDULE_SUBJECTS) && containsAny(lower, READ_ACTIONS))
  );
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
export function isMiscIntent(lower: string): boolean {
  return (
    isSmartNotificationIntent(lower) ||
    isFocusIntent(lower) ||
    isIdentityIntent(lower) ||
    isMemoryIntent(lower)
  );
}

function pushOnce(packs: ChatPromptPack[], pack: ChatPromptPack): void {
  if (!packs.includes(pack)) packs.push(pack);
}

/** Which packs a message's keywords call for. A schedule *write* always brings
 * the read pack too — edits/deletes must go through get_schedule first. */
export function packsForText(text: string): ChatPromptPack[] {
  const lower = text.toLowerCase();
  const packs: ChatPromptPack[] = [];
  const write = isScheduleWriteIntent(lower);
  if (write || isScheduleReadIntent(lower)) pushOnce(packs, 'scheduleRead');
  if (write) {
    pushOnce(packs, 'actionProtocol');
    pushOnce(packs, 'scheduleWrite');
  }
  if (isTaskIntent(lower)) {
    pushOnce(packs, 'actionProtocol');
    pushOnce(packs, 'tasks');
  }
  if (isCourseIntent(lower)) {
    pushOnce(packs, 'actionProtocol');
    pushOnce(packs, 'courses');
  }
  if (isFocusIntent(lower)) {
    pushOnce(packs, 'actionProtocol');
    pushOnce(packs, 'focus');
  }
  if (isSmartNotificationIntent(lower)) {
    pushOnce(packs, 'actionProtocol');
    pushOnce(packs, 'smartNotifications');
  }
  if (isIdentityIntent(lower)) pushOnce(packs, 'identity');
  if (isMemoryIntent(lower)) pushOnce(packs, 'memory');
  return packs;
}

/** Packs that need to see the live app data (real ids) to act correctly.
 * scheduleRead is excluded — get_schedule returns its own data. */
export const PACKS_NEEDING_ENTITIES: ChatPromptPack[] = ['scheduleWrite', 'tasks', 'courses', 'smartNotifications'];

/** Fixed iteration order so the assembled system turns come out stable. */
export const PACK_ORDER: ChatPromptPack[] = [
  'actionProtocol',
  'scheduleRead',
  'scheduleWrite',
  'tasks',
  'courses',
  'focus',
  'smartNotifications',
  'identity',
  'memory',
];
