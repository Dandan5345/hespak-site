// Mirrors lib/state/models.dart in the StudyFlow Flutter app. Keep field
// names and JSON shape identical — both apps read/write the same Firestore
// document (users/{uid}/appState/data), so any drift breaks cross-device sync.

export type Urgency = 'not_urgent' | 'urgent' | 'very_urgent';
export const URGENCY_VALUES: Urgency[] = ['not_urgent', 'urgent', 'very_urgent'];
export const DEFAULT_URGENCY: Urgency = 'not_urgent';

export function urgencyLabelKey(u: Urgency): string {
  switch (u) {
    case 'urgent':
      return 'urgency_urgent';
    case 'very_urgent':
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

export type EventType = 'class' | 'exam' | 'submission' | 'personal';

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
  createdBy: CreatedBy;
  createdAt: string;
  updatedAt: string;
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

export type ReasoningEffort = 'minimal' | 'medium' | 'high' | 'cheap';

export function reasoningApiValue(effort: ReasoningEffort): string {
  return effort === 'cheap' ? 'minimal' : effort;
}

export function reasoningProvider(effort: ReasoningEffort): 'deepseek' | 'openrouter' {
  return effort === 'cheap' ? 'openrouter' : 'deepseek';
}

export function reasoningCostMultiplier(effort: ReasoningEffort): number {
  return effort === 'cheap' ? 0.5 : 1;
}

export function reasoningEmoji(effort: ReasoningEffort): string {
  switch (effort) {
    case 'medium':
      return '🧠';
    case 'high':
      return '✨';
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
