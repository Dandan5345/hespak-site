// Mirrors lib/state/models.dart in the StudyFlow Flutter app. Keep field
// names and JSON shape identical — both apps read/write the same Firestore
// document (users/{uid}/appState/data), so any drift breaks cross-device sync.

export type Urgency = 'notUrgent' | 'urgent' | 'veryUrgent';
export const URGENCY_VALUES: Urgency[] = ['notUrgent', 'urgent', 'veryUrgent'];
export const DEFAULT_URGENCY: Urgency = 'notUrgent';

export function urgencyLabelKey(u: Urgency): string {
  switch (u) {
    case 'urgent':
      return 'urgency_urgent';
    case 'veryUrgent':
      return 'urgency_very_urgent';
    default:
      return 'urgency_not_urgent';
  }
}

export type CreatedBy = 'user' | 'ai' | 'device';

export interface Course {
  id: string;
  name: string;
  /** ARGB32 int, same encoding as Flutter's Color.toARGB32() (e.g. 0xFF6366F1). */
  color: number;
  description?: string | null;
  startDate?: string | null; // ISO date
  endDate?: string | null; // ISO date
  createdBy: CreatedBy;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  courseId?: string | null;
  dueDateTime?: string | null; // ISO datetime — deadline, not duration
  urgency: Urgency;
  estimatedDurationMinutes?: number | null;
  isCompleted: boolean;
  completedAt?: string | null;
  createdBy: CreatedBy;
  createdAt: string;
  updatedAt: string;
}

export type EventType = 'classLesson' | 'exam' | 'submission' | 'personal';

export interface ScheduleItem {
  id: string;
  taskId?: string | null;
  title: string;
  description?: string | null;
  startDateTime: string; // ISO
  endDateTime: string; // ISO
  type: EventType;
  weeklyRepeat: boolean;
  allDay: boolean;
  isCompleted: boolean;
  externalEventId?: string | null;
  calendarId?: string | null;
  calendarColor?: number | null;
  createdBy: CreatedBy;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarCommand {
  id: string;
  action: 'upsert' | 'delete';
  item?: ScheduleItem | null;
  calendarId?: string | null;
  externalEventId?: string | null;
  source: 'web';
  createdAt: string;
}

export interface SmartReminder {
  id: string;
  notifId: number;
  title: string;
  description?: string | null;
  dateTime: string; // ISO
  linkedTaskId?: string | null;
  linkedScheduleId?: string | null;
  createdBy: CreatedBy;
  createdAt: string;
}

export interface ChatTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptReadTokens: number;
  promptReadDescriptions: string[];
  promptReadBreakdown: Record<string, number>;
  reasoningTokens?: number | null;
  costMultiplier: number;
  historyTokensCharged: number;
  chargedTokens: number;
}

export interface ChatMessage {
  fromUser: boolean;
  text: string;
  actionKeys: string[];
  inputTokens?: number | null;
  tokenUsage?: ChatTokenUsage | null;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
  totalTokens: number;
}

export interface TokenQuota {
  remainingTokens: number;
  displayName?: string | null;
}

// Six levels ordered cheapest/fastest → priciest/deepest. Mirror of
// `ReasoningEffort` in the app's lib/state/models.dart and of the `DEPTH`
// table in ai-worker/src/index.ts — keep all three in sync.
export type ReasoningEffort = 'cheap' | 'minimal' | 'medium' | 'high' | 'expert' | 'max';

/** Value for the `reasoningEffort` field sent to the worker. 'cheap' runs on a
 * different (cheaper) OpenRouter model but with no extended thinking, so it
 * shares 'minimal's depth value. */
export function reasoningApiValue(effort: ReasoningEffort): string {
  return effort === 'cheap' ? 'minimal' : effort;
}

/** AI provider this depth routes to. 'cheap' and 'max' use OpenRouter (Mistral
 * / Gemma respectively); the rest use DeepSeek. */
export function reasoningProvider(effort: ReasoningEffort): 'deepseek' | 'openrouter' {
  return effort === 'cheap' || effort === 'max' ? 'openrouter' : 'deepseek';
}

/** Quota cost multiplier per raw provider token. 'cheap' is the lightest model
 * (half price); 'max' is the premium Gemma model with the deepest thinking
 * (double price); everything else is standard price. */
export function reasoningCostMultiplier(effort: ReasoningEffort): number {
  if (effort === 'cheap') return 0.5;
  if (effort === 'max') return 2;
  return 1;
}

/** "×0.5" / "×2" badge for non-standard-price tiers; null for standard-price
 * tiers so the UI isn't cluttered. */
export function reasoningCostBadge(effort: ReasoningEffort): string | null {
  if (effort === 'cheap') return '×0.5';
  if (effort === 'max') return '×2';
  return null;
}

export function reasoningEmoji(effort: ReasoningEffort): string {
  switch (effort) {
    case 'medium':
      return '🧠';
    case 'high':
      return '✨';
    case 'expert':
      return '🔬';
    case 'max':
      return '👑';
    case 'cheap':
      return '🪙';
    default:
      return '⚡';
  }
}

/** Full app-state document shape at users/{uid}/appState/data. */
export interface CloudAppState {
  courses: Course[];
  tasks: Task[];
  scheduleItems: ScheduleItem[];
  deviceCalendarItems: ScheduleItem[];
  calendarCommands: CalendarCommand[];
  smartReminders: SmartReminder[];
  agentMemory: string;
  agentName: string;
}

export function argbToCss(argb: number): string {
  const a = ((argb >>> 24) & 0xff) / 255;
  const r = (argb >>> 16) & 0xff;
  const g = (argb >>> 8) & 0xff;
  const b = argb & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function cssToArgb(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return (0xff << 24) | (r << 16) | (g << 8) | b;
}

export function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
