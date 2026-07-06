import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { completeChat, QuotaExhaustedError, type ChatCompletionResult, type ChatTurn } from '../../services/aiChat';
import { promptPackInstruction, retryInvalidJsonInstruction, summarizeChatInstruction, systemPrompt, type ChatPromptPack } from '../../services/chatPrompts';
import { useAuth } from '../../state/AuthContext';
import { useData } from '../../state/DataContext';
import { useI18n } from '../../i18n/I18nProvider';
import { genId, isProEffort, normalizeEffortForFamily, reasoningApiValue, reasoningCostMultiplier, reasoningProvider, type ChatModelFamily, type ChatTokenUsage, type ReasoningEffort } from '../../state/types';
import { PACK_ORDER, PACKS_NEEDING_ENTITIES, packsForText, isSmartNotificationIntent } from './keywordIntents';
import { buildEntitiesContext, scheduleForDate } from './entitiesContext';
import { applyMutationActions, describeActions, mutationActionsFromJson } from './chatActions';
import { extractJson } from './extractJson';
import { processImage, isImageFile } from './imageUtils';
import type { ChatContentPart } from '../../services/aiChat';
import { prepareRawFile } from './rawFile';
import { useCloudChat, type CloudChatMessage, type CloudChatSession, type CloudUndoSnapshots } from './useCloudChat';
import type { LocalChatMessage } from './types';
import type { CloudAppState } from '../../state/types';

/** Short session title from the first user message (truncated), matching the
 * app's _sessionTitle. */
function sessionTitle(messages: CloudChatMessage[], fallback: string): string {
  const firstUser = messages.find((m) => m.fromUser && m.text.trim().length > 0);
  if (!firstUser) return fallback;
  const trimmed = firstUser.text.trim();
  return trimmed.length <= 40 ? trimmed : `${trimmed.slice(0, 40)}…`;
}

/** Project the live UI messages down to the portable shape stored in Firestore
 * (and shared with the mobile app). UI-only state is dropped. */
function toCloudChat(messages: LocalChatMessage[]): CloudChatMessage[] {
  return messages.map((m) => ({
    fromUser: m.fromUser,
    text: m.text,
    actionKeys: m.actionKeys ?? (m.undoKey ? [m.undoKey] : []),
    inputTokens: m.inputTokens ?? null,
    tokenUsage: m.tokenUsage ?? null,
  }));
}

/** A synced conversation is worth restoring only once the user has actually
 * said something — a lone greeting is treated as an empty/fresh chat. */
function hasRealConversation(messages: CloudChatMessage[]): boolean {
  return messages.some((m) => m.fromUser && m.text.trim().length > 0);
}

/** Compare two conversations by their (sender, text) sequence — robust to
 * Firestore reordering map keys (it returns maps sorted alphabetically, so a
 * raw JSON compare of tokenUsage always mismatches). Mirrors the app's
 * _sameChatThread. */
function sameThread(a: CloudChatMessage[], b: CloudChatMessage[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].fromUser !== b[i].fromUser || a[i].text !== b[i].text) return false;
  }
  return true;
}

/** Is `a` the beginning of `b`? Used to tell "the same conversation grew on
 * another device" (adopt silently) apart from "a different conversation
 * replaced ours" (archive ours first so it isn't lost from the history). */
function threadIsPrefix(a: CloudChatMessage[], b: CloudChatMessage[]): boolean {
  if (a.length > b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].fromUser !== b[i].fromUser || a[i].text !== b[i].text) return false;
  }
  return true;
}

/** Hard cap on the conversation memory kept per chat: the model always sees
 * the full history up to ~128K estimated tokens; past that the user can either
 * summarize-and-compact the conversation in place or start a new chat (the old
 * one stays in the history). */
export const CONTEXT_TOKEN_LIMIT = 128_000;

const REASONING_KEY = 'sf_reasoning';
const MODEL_FAMILY_KEY = 'sf_model_family';
const GEMINI_PRO_KEY = 'sf_gemini_pro';
const VALID_EFFORTS: ReasoningEffort[] = ['cheap', 'minimal', 'medium', 'high', 'expert', 'max', 'proSmart', 'proDeep', 'proExpert'];

function readEffort(): ReasoningEffort {
  const v = localStorage.getItem(REASONING_KEY);
  if (v === 'proMax') return 'proExpert';
  return (VALID_EFFORTS as string[]).includes(v ?? '') ? (v as ReasoningEffort) : 'medium';
}

function readModelFamily(): ChatModelFamily {
  const saved = localStorage.getItem(MODEL_FAMILY_KEY);
  return saved === 'gpt' || saved === 'gemini' ? saved : 'deepseek';
}

function readGeminiPro(): boolean {
  return localStorage.getItem(GEMINI_PRO_KEY) === '1';
}

const EXTRA: Record<string, Record<string, string>> = {
  chat_quota_exhausted_web: {
    he: '🪙 האסימונים נגמרו — ניתן לצפות בפרסומת באפליקציה הניידת כדי לקבל עוד.',
    en: '🪙 Out of tokens — open the mobile app to watch a rewarded ad and top up.',
  },
  chat_web_unavailable_note: {
    he: '(לא זמין באתר — זמין באפליקציה הניידת)',
    en: '(not available on the web — available on the mobile app)',
  },
};

/** Max additional `get_schedule` tool round-trips before we give up and treat
 * whatever came back as the final reply (avoids an infinite loop). */
const MAX_TOOL_ROUNDS = 3;
const MAX_PROVIDER_RETRIES = 2;
const MAX_JSON_REPAIR_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 450;

type CompleteChatOptions = NonNullable<Parameters<typeof completeChat>[1]>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientAiFailureReply(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.length > 180) return false;
  return [
    'משהו השתבש',
    'נסה שוב מאוחר יותר',
    'נסו שוב מאוחר יותר',
    'something went wrong',
    'try again later',
    'internal error',
    'server error',
    'upstream error',
    'an error occurred',
    'i encountered an error',
  ].some((needle) => normalized.includes(needle));
}

function looksLikeJsonReply(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.includes('{') && !trimmed.startsWith('```')) return false;
  return /["'“”]?(action|actions|tool|message)["'“”]?\s*:/i.test(trimmed);
}

function isIsoDate(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parsedJsonNeedsRepair(parsed: Record<string, unknown> | null): boolean {
  if (!parsed) return false;
  if (typeof parsed.tool === 'string') {
    if (parsed.tool !== 'get_schedule') return true;
    return !isIsoDate(parsed.date) || ('endDate' in parsed && parsed.endDate != null && !isIsoDate(parsed.endDate));
  }
  if (Array.isArray(parsed.actions)) {
    const actionObjects = parsed.actions.filter((item) => !!item && typeof item === 'object').length;
    const validMutations = mutationActionsFromJson(parsed).length;
    return actionObjects === 0 || validMutations !== actionObjects;
  }
  if (typeof parsed.action === 'string') {
    if (parsed.action === 'set_agent_name') return false;
    if (parsed.action === 'save_memory') return typeof parsed.memory !== 'string';
    return mutationActionsFromJson(parsed).length === 0;
  }
  return false;
}

function shouldRepairJsonReply(text: string, parsed: Record<string, unknown> | null): boolean {
  if (!parsed) return looksLikeJsonReply(text);
  return parsedJsonNeedsRepair(parsed);
}

async function completeChatReliably(
  messages: ChatTurn[],
  opts: CompleteChatOptions,
  handlers: {
    onRetry?: () => void;
    onResult?: (result: ChatCompletionResult) => void;
  } = {},
): Promise<ChatCompletionResult> {
  for (let attempt = 0; attempt <= MAX_PROVIDER_RETRIES; attempt++) {
    try {
      const result = await completeChat(messages, opts);
      handlers.onResult?.(result);
      if (isTransientAiFailureReply(result.text)) {
        if (attempt >= MAX_PROVIDER_RETRIES) throw new Error('AI returned a transient failure reply');
        handlers.onRetry?.();
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
        continue;
      }
      return result;
    } catch (e) {
      if (e instanceof QuotaExhaustedError || attempt >= MAX_PROVIDER_RETRIES) throw e;
      handlers.onRetry?.();
      await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
    }
  }
  throw new Error('AI retry failed');
}

function estimateTokens(text: string): number {
  if (!text) return 0;
  let heb = 0;
  let other = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if ((c >= 0x0590 && c <= 0x05ff) || c === 0x05be || c === 0x05c3) heb++;
    else other++;
  }
  return Math.ceil(heb / 2 + other / 4);
}

function estimateContentTokens(content: ChatTurn['content']): number {
  if (typeof content === 'string') return estimateTokens(content);
  return content.reduce((sum, part) => {
    if (part.type === 'text') return sum + estimateTokens(part.text);
    if (part.type === 'image_url') return sum + 1500;
    const dataUrl = part.file.file_data;
    const comma = dataUrl.indexOf(',');
    const base64Length = comma >= 0 ? dataUrl.length - comma - 1 : dataUrl.length;
    const padding = dataUrl.endsWith('==') ? 2 : dataUrl.endsWith('=') ? 1 : 0;
    const bytes = Math.max(0, Math.floor((base64Length * 3) / 4) - padding);
    return sum + estimateTokens(part.file.filename) + Math.min(60_000, Math.max(300, Math.ceil(bytes / 1024)));
  }, 0);
}

function aiOutputContextTokens(text: string, usage?: ChatTokenUsage | null): number {
  const estimated = estimateTokens(text);
  const visibleOutput = usage
    ? Math.max(0, usage.completionTokens - (usage.reasoningTokens ?? 0))
    : null;
  return visibleOutput != null ? Math.max(estimated, visibleOutput) : estimated;
}

function messageContextTokens(message: {
  fromUser: boolean;
  text: string;
  inputTokens?: number | null;
  tokenUsage?: ChatTokenUsage | null;
}): number {
  const estimated = estimateTokens(message.text);
  if (message.fromUser) return Math.max(estimated, message.inputTokens ?? 0);
  return aiOutputContextTokens(message.text, message.tokenUsage);
}

function contextTokenAdjustmentForMessages(messages: Array<{
  fromUser: boolean;
  text: string;
  inputTokens?: number | null;
  tokenUsage?: ChatTokenUsage | null;
}>): number {
  return messages.reduce((sum, message) => sum + messageContextTokens(message) - estimateTokens(message.text), 0);
}

function billableTokens(rawTokens: number, multiplier: number): number {
  if (rawTokens <= 0) return 0;
  return Math.min(Math.max(1, Math.ceil(rawTokens * multiplier)), rawTokens);
}

interface PendingEntry {
  actions: Record<string, unknown>[];
  resolved: 'pending' | 'approved' | 'rejected';
}

const UNDO_MESSAGE_WINDOW = 5;

function undoKeyFromMessage(message: Pick<LocalChatMessage, 'actionKeys' | 'undoKey'>): string | undefined {
  const keys = [...(message.actionKeys ?? []), ...(message.undoKey ? [message.undoKey] : [])];
  return keys.find((key) => key.startsWith('ai_undo_change_'));
}

export function useChatEngine() {
  const { t, lang } = useI18n();
  const tt = useCallback((k: string) => EXTRA[k]?.[lang] ?? t(k), [lang, t]);
  const { displayName, idToken } = useAuth();
  const data = useData();
  const {
    loaded: cloudChatLoaded,
    remoteMessages: cloudChatRemote,
    remotePacks: cloudChatPacks,
    remotePacksEntities: cloudChatPacksEntities,
    remoteSessions: cloudChatSessions,
    remoteUndoSnapshots: cloudUndoSnapshots,
    remoteRev: cloudChatRev,
    save: saveCloudChat,
    clear: clearCloudChat,
    saveSessions: saveCloudSessions,
  } = useCloudChat();

  const agentDisplayName = data.agentName.trim() || t('agent_default_name');

  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  // Short "loading X instructions…" line under the typing dots, mirroring the
  // app's chatTypingStatus.
  const [typingStatus, setTypingStatus] = useState<string | null>(null);
  // Estimated tokens of the conversation history the model sees (system
  // instructions excluded). Drives the memory meter + full-memory gate.
  const [contextTokens, setContextTokens] = useState(0);
  // While the agent is *writing* (not thinking), the reply is revealed a few
  // characters at a time here — the web analogue of the app's streamingText.
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [effort, setEffortState] = useState<ReasoningEffort>(readEffort);
  const [modelFamily, setModelFamilyState] = useState<ChatModelFamily>(readModelFamily);
  const [geminiPro, setGeminiProState] = useState<boolean>(readGeminiPro);

  const aiContextRef = useRef<ChatTurn[]>([]);
  const loadedPacksRef = useRef<Set<ChatPromptPack>>(new Set());
  const entitiesNeededRef = useRef(false);
  const entityContextReadTrackedRef = useRef(false);
  const systemPromptTokensTrackedRef = useRef(false);
  const promptReadTokensRef = useRef(0);
  const promptReadDescriptionsRef = useRef<string[]>([]);
  const promptReadBreakdownRef = useRef<Record<string, number>>({});
  const pendingRef = useRef<Map<string, PendingEntry>>(new Map());
  // Pre-change snapshots so a confirmed AI change can be undone after leaving
  // and returning to the chat. Snapshots are synced with the active chat doc.
  const undoSnapshotsRef = useRef<Map<string, string>>(new Map());
  const hydratedRef = useRef(false);
  // Set right before we replace local messages with a remote snapshot, so the
  // save-on-change effect doesn't immediately echo that snapshot back.
  const suppressSaveRef = useRef(false);
  // Mirror of `messages` for use inside effects without re-subscribing them.
  const messagesRef = useRef<LocalChatMessage[]>([]);
  const revealTimerRef = useRef<number | null>(null);

  const serializedUndoSnapshots = useCallback((): CloudUndoSnapshots => {
    const out: CloudUndoSnapshots = {};
    for (const [key, snapshotJson] of undoSnapshotsRef.current.entries()) {
      out[key] = snapshotJson;
    }
    return out;
  }, []);

  const liveUndoKeyForMessage = useCallback((message: LocalChatMessage, index: number, all: LocalChatMessage[]): string | undefined => {
    const key = undoKeyFromMessage(message);
    if (!key || !undoSnapshotsRef.current.has(key)) return undefined;
    return all.length - index - 1 <= UNDO_MESSAGE_WINDOW ? key : undefined;
  }, []);

  const messagesWithLiveUndo = useCallback(
    (items: LocalChatMessage[]) =>
      items.map((message, index, all) => ({
        ...message,
        undoKey: liveUndoKeyForMessage(message, index, all),
      })),
    [liveUndoKeyForMessage],
  );

  // Single write-path for the model context: keeps the ref and the estimated
  // token counter in sync so the memory gate is always accurate.
  const setAiContext = useCallback((turns: ChatTurn[], tokenAdjustment = 0) => {
    aiContextRef.current = turns;
    let total = 0;
    for (const turn of turns) total += estimateContentTokens(turn.content);
    setContextTokens(Math.max(0, total + tokenAdjustment));
  }, []);

  const appendAiContextTurn = useCallback((turn: ChatTurn, actualTokens?: number) => {
    aiContextRef.current = [...aiContextRef.current, turn];
    const estimated = estimateContentTokens(turn.content);
    const counted = actualTokens ?? estimated;
    setContextTokens((prev) => Math.max(0, prev + counted));
  }, []);

  // Stop any in-progress character reveal and drop the partial bubble.
  const clearReveal = useCallback(() => {
    if (revealTimerRef.current != null) {
      window.clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setStreamingText(null);
  }, []);

  const greetingText = useCallback(() => t('chat_greeting').replace('{name}', agentDisplayName), [t, agentDisplayName]);

  const startFresh = useCallback(() => {
    clearReveal();
    const greeting = greetingText();
    loadedPacksRef.current = new Set();
    entitiesNeededRef.current = false;
    entityContextReadTrackedRef.current = false;
    systemPromptTokensTrackedRef.current = false;
    promptReadTokensRef.current = 0;
    promptReadDescriptionsRef.current = [];
    promptReadBreakdownRef.current = {};
    pendingRef.current = new Map();
    undoSnapshotsRef.current = new Map();
    setOutOfCredits(false);
    setAiContext([{ role: 'assistant', content: greeting }]);
    setMessages([
      {
        id: genId(),
        fromUser: false,
        text: greeting,
        quickReplies: [t('chat_btn_schedule'), t('chat_btn_task')],
      },
    ]);
  }, [greetingText, t, clearReveal, setAiContext]);

  // Restore a synced conversation (reload, history, or another device) into the
  // live UI + model context, rebuilt from the visible turns. The instruction
  // packs come primarily from the packs persisted WITH the conversation (exact,
  // no guessing — this is what keeps a restored chat acting instead of saying
  // "I'll check" with no tool spec loaded); keyword-scanning every stored turn
  // (assistant included) is the union fallback. Everything is marked as ALREADY
  // CHARGED — the conversation paid when the packs first loaded.
  const restoreFromCloud = useCallback((stored: CloudChatMessage[], hint?: { packs?: string[]; entities?: boolean }) => {
    clearReveal();
    undoSnapshotsRef.current = new Map(Object.entries(cloudUndoSnapshots));
    const seeded = new Set<ChatPromptPack>();
    for (const p of hint?.packs ?? []) {
      if (p === 'misc') {
        for (const legacyPack of ['focus', 'smartNotifications', 'identity', 'memory'] satisfies ChatPromptPack[]) {
          seeded.add(legacyPack);
        }
        continue;
      }
      if ((PACK_ORDER as string[]).includes(p)) seeded.add(p as ChatPromptPack);
    }
    let entities = hint?.entities ?? false;
    for (const m of stored) {
      for (const pack of packsForText(m.text)) {
        seeded.add(pack);
        if (PACKS_NEEDING_ENTITIES.includes(pack)) entities = true;
      }
      if (isSmartNotificationIntent(m.text.toLowerCase())) entities = true;
    }
    for (const pack of seeded) {
      if (PACKS_NEEDING_ENTITIES.includes(pack)) entities = true;
    }
    loadedPacksRef.current = seeded;
    entitiesNeededRef.current = entities;
    entityContextReadTrackedRef.current = true;
    systemPromptTokensTrackedRef.current = true;
    promptReadTokensRef.current = 0;
    promptReadDescriptionsRef.current = [];
    promptReadBreakdownRef.current = {};
    pendingRef.current = new Map();
    setOutOfCredits(false);
    setAiContext(
      stored.map((m) => ({ role: m.fromUser ? 'user' : 'assistant', content: m.text })),
      contextTokenAdjustmentForMessages(stored),
    );
    const restored = stored.map((m) => ({
      id: genId(),
      fromUser: m.fromUser,
      text: m.text,
      actionKeys: m.actionKeys,
      inputTokens: m.inputTokens ?? null,
      tokenUsage: m.tokenUsage ?? null,
    }));
    setMessages(messagesWithLiveUndo(restored));
  }, [clearReveal, cloudUndoSnapshots, messagesWithLiveUndo, setAiContext]);

  // First mount: wait for the cloud snapshot, then either restore the synced
  // conversation or open with a local greeting — no model call either way.
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!cloudChatLoaded) return;
    hydratedRef.current = true;
    suppressSaveRef.current = true;
    if (hasRealConversation(cloudChatRemote)) {
      restoreFromCloud(cloudChatRemote, { packs: cloudChatPacks, entities: cloudChatPacksEntities });
    } else {
      startFresh();
    }
  }, [cloudChatLoaded, cloudChatRemote, cloudChatPacks, cloudChatPacksEntities, restoreFromCloud, startFresh]);

  // Write-through: persist the conversation + its loaded packs whenever it
  // changes locally. Skipped right after we apply a remote snapshot
  // (suppressSaveRef) so we don't echo.
  useEffect(() => {
    messagesRef.current = messages;
    if (!hydratedRef.current) return;
    if (suppressSaveRef.current) {
      suppressSaveRef.current = false;
      return;
    }
    saveCloudChat(toCloudChat(messages), [...loadedPacksRef.current], entitiesNeededRef.current, serializedUndoSnapshots());
  }, [messages, saveCloudChat, serializedUndoSnapshots]);

  // Realtime pull: when another device changes the conversation, adopt it —
  // unless we're mid-generation, or it's just our own write echoing back.
  useEffect(() => {
    // Don't adopt a remote snapshot while thinking or mid-reveal on this device.
    if (!hydratedRef.current || typing || revealTimerRef.current != null) return;
    const remote = cloudChatRemote;
    // A cleared/greeting-only remote thread shouldn't wipe the local one
    // (mirrors the app's _applyCloudChatRealtime guard).
    if (!hasRealConversation(remote)) return;
    // Our own write echoing back must be a no-op: a restore here would reset
    // the loaded-packs / prompt-read tracking and re-charge the instruction
    // tokens on every turn. Compare (sender, text) — not raw JSON, because
    // Firestore returns tokenUsage maps with re-sorted keys.
    const local = toCloudChat(messagesRef.current);
    if (sameThread(remote, local)) return;
    // A *different* conversation is replacing ours (e.g. a new chat started on
    // the phone) — archive the current one into the history first, or it would
    // silently vanish. A thread that merely grew/shrank on the other device is
    // the same conversation and is adopted as-is.
    if (
      hasRealConversation(local) &&
      !threadIsPrefix(local, remote) &&
      !threadIsPrefix(remote, local) &&
      !cloudChatSessions.some((s) => sameThread(s.messages, local))
    ) {
      saveCloudSessions(archiveCurrent());
    }
    suppressSaveRef.current = true;
    restoreFromCloud(remote, { packs: cloudChatPacks, entities: cloudChatPacksEntities });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudChatRev]);

  const setEffort = useCallback((e: ReasoningEffort) => {
    setEffortState(e);
    localStorage.setItem(REASONING_KEY, e);
  }, []);

  const setModelFamily = useCallback((family: ChatModelFamily) => {
    setModelFamilyState(family);
    localStorage.setItem(MODEL_FAMILY_KEY, family);
    setEffortState((prev) => {
      const next = normalizeEffortForFamily(prev, family);
      if (next !== prev) localStorage.setItem(REASONING_KEY, next);
      return next;
    });
  }, []);

  const setGeminiPro = useCallback((enabled: boolean) => {
    setGeminiProState(enabled);
    localStorage.setItem(GEMINI_PRO_KEY, enabled ? '1' : '0');
  }, []);

  useEffect(() => {
    const normalized = normalizeEffortForFamily(effort, modelFamily);
    if (normalized !== effort) setEffort(normalized);
  }, [effort, modelFamily, setEffort]);

  const promptReadDescription = useCallback(
    (pack: ChatPromptPack) => {
      switch (pack) {
        case 'scheduleRead':
          return t('chat_prompt_read_schedule');
        case 'scheduleWrite':
          return t('chat_prompt_read_schedule_write');
        case 'actionProtocol':
          return t('chat_prompt_read_action');
        case 'tasks':
          return t('chat_prompt_read_tasks');
        case 'courses':
          return t('chat_prompt_read_courses');
        case 'focus':
          return t('chat_prompt_read_focus');
        case 'smartNotifications':
          return t('chat_prompt_read_smart_notifications');
        case 'identity':
          return t('chat_prompt_read_identity');
        case 'memory':
          return t('chat_prompt_read_memory');
      }
    },
    [t],
  );

  const promptStatus = useCallback(
    (pack: ChatPromptPack) => {
      switch (pack) {
        case 'scheduleRead':
          return t('chat_status_prompt_schedule');
        case 'scheduleWrite':
          return t('chat_status_prompt_schedule_write');
        case 'actionProtocol':
          return t('chat_status_prompt_action');
        case 'tasks':
          return t('chat_status_prompt_tasks');
        case 'courses':
          return t('chat_status_prompt_courses');
        case 'focus':
          return t('chat_status_prompt_focus');
        case 'smartNotifications':
          return t('chat_status_prompt_smart_notifications');
        case 'identity':
          return t('chat_status_prompt_identity');
        case 'memory':
          return t('chat_status_prompt_memory');
      }
    },
    [t],
  );

  const addPromptReadContext = useCallback((description: string, text: string, status?: string) => {
    const tokens = estimateTokens(text);
    if (tokens <= 0) return;
    promptReadTokensRef.current += tokens;
    promptReadDescriptionsRef.current.push(description);
    promptReadBreakdownRef.current[description] = (promptReadBreakdownRef.current[description] ?? 0) + tokens;
    if (status) setTypingStatus(status);
  }, []);

  const includeEntityContextForPromptRead = useCallback(() => {
    entitiesNeededRef.current = true;
    if (entityContextReadTrackedRef.current) return;
    entityContextReadTrackedRef.current = true;
    addPromptReadContext(
      t('chat_prompt_read_app_data'),
      buildEntitiesContext(data.courses, data.tasks, data.smartReminders),
      t('chat_status_prompt_app_data'),
    );
  }, [addPromptReadContext, data.courses, data.smartReminders, data.tasks, t]);

  const addLoadedPack = useCallback(
    (pack: ChatPromptPack) => {
      if (loadedPacksRef.current.has(pack)) return;
      loadedPacksRef.current.add(pack);
      addPromptReadContext(promptReadDescription(pack), promptPackInstruction(pack), promptStatus(pack));
    },
    [addPromptReadContext, promptReadDescription, promptStatus],
  );

  const pushAiMessage = useCallback((text: string, opts: { tokenUsage?: ChatTokenUsage; pendingActions?: Record<string, unknown>[]; focusMinutes?: number | null } = {}) => {
    const id = genId();
    if (opts.pendingActions && opts.pendingActions.length > 0) {
      pendingRef.current.set(id, { actions: opts.pendingActions, resolved: 'pending' });
    }
    setMessages((prev) => [
      ...prev,
      {
        id,
        fromUser: false,
        text,
        tokenUsage: opts.tokenUsage ?? null,
        pending: opts.pendingActions && opts.pendingActions.length > 0 ? { actions: opts.pendingActions, resolved: 'pending' } : null,
        focusMinutes: opts.focusMinutes ?? null,
      },
    ]);
  }, []);

  // Reveal a plain reply a few characters at a time, mirroring the app's
  // _revealReply: fast modes (minimal/cheap) show it instantly, deeper modes
  // animate it (≈1.2s cap). The text is already fully received — this is purely
  // the "writing…" animation, distinct from the "thinking…" typing dots.
  const revealReply = useCallback(
    (text: string, currentEffort: ReasoningEffort, opts: { tokenUsage?: ChatTokenUsage } = {}) => {
      if (revealTimerRef.current != null) {
        window.clearInterval(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      setTyping(false);
      const full = text;
      const revealInstantly = currentEffort === 'minimal' || currentEffort === 'cheap';
      if (!full || revealInstantly) {
        setStreamingText(null);
        pushAiMessage(full, opts);
        return;
      }
      const codePoints = Array.from(full);
      const maxTicks = 55;
      const step = Math.min(Math.max(1, Math.ceil(codePoints.length / maxTicks)), codePoints.length);
      let shown = 0;
      setStreamingText('');
      revealTimerRef.current = window.setInterval(() => {
        shown = Math.min(shown + step, codePoints.length);
        if (shown >= codePoints.length) {
          if (revealTimerRef.current != null) {
            window.clearInterval(revealTimerRef.current);
            revealTimerRef.current = null;
          }
          setStreamingText(null);
          pushAiMessage(full, opts);
          return;
        }
        setStreamingText(codePoints.slice(0, shown).join(''));
      }, 22);
    },
    [pushAiMessage],
  );

  const ensureLazyPacks = useCallback((text: string) => {
    const lower = text.toLowerCase();
    for (const pack of packsForText(lower)) {
      addLoadedPack(pack);
      if (PACKS_NEEDING_ENTITIES.includes(pack)) includeEntityContextForPromptRead();
    }
  }, [addLoadedPack, includeEntityContextForPromptRead]);

  const buildMessages = useCallback((): ChatTurn[] => {
    const today = new Date().toISOString().slice(0, 10);
    const premiumPrompt = isProEffort(effort) || (modelFamily === 'gemini' && geminiPro);
    const turns: ChatTurn[] = [{ role: 'system', content: systemPrompt(today, data.agentName, premiumPrompt) }];
    if (data.agentMemory.trim()) {
      turns.push({ role: 'system', content: `[זיכרון אישי קבוע על המשתמש]\n${data.agentMemory.trim()}` });
    }
    if (entitiesNeededRef.current) {
      turns.push({ role: 'system', content: buildEntitiesContext(data.courses, data.tasks, data.smartReminders) });
    }
    for (const pack of PACK_ORDER) {
      if (loadedPacksRef.current.has(pack)) turns.push({ role: 'system', content: promptPackInstruction(pack) });
    }
    turns.push(...aiContextRef.current);
    return turns;
  }, [data.agentName, data.agentMemory, data.courses, data.tasks, data.smartReminders, effort, geminiPro, modelFamily]);

  const estimateSystemInstructionTokens = useCallback((): number => {
    const today = new Date().toISOString().slice(0, 10);
    const premiumPrompt = isProEffort(effort) || (modelFamily === 'gemini' && geminiPro);
    let tokens = estimateTokens(systemPrompt(today, data.agentName, premiumPrompt));
    if (data.agentMemory.trim()) tokens += estimateTokens(`[זיכרון אישי קבוע על המשתמש]\n${data.agentMemory.trim()}`);
    if (entitiesNeededRef.current) tokens += estimateTokens(buildEntitiesContext(data.courses, data.tasks, data.smartReminders));
    for (const pack of loadedPacksRef.current) tokens += estimateTokens(promptPackInstruction(pack));
    return tokens;
  }, [data.agentMemory, data.agentName, data.courses, data.smartReminders, data.tasks, effort, geminiPro, modelFamily]);

  const applyHistoryDiscount = useCallback(
    (raw: ChatTokenUsage, currentEffort: ReasoningEffort): ChatTokenUsage => {
      const multiplier = reasoningCostMultiplier(currentEffort, modelFamily, geminiPro);
      const estimatedSystem = estimateSystemInstructionTokens();
      const historyTokens = Math.min(Math.max(0, raw.promptTokens - estimatedSystem), raw.promptTokens);
      const systemAndOutput = estimatedSystem + raw.completionTokens;
      const historyCharged = billableTokens(historyTokens, 0.1 * multiplier);
      const chargedTokens = billableTokens(systemAndOutput, multiplier) + historyCharged;
      return {
        ...raw,
        costMultiplier: raw.costMultiplier ?? multiplier,
        historyTokensCharged: historyCharged,
        chargedTokens,
      };
    },
    [estimateSystemInstructionTokens, geminiPro, modelFamily],
  );

  const applyAuthoritativeCharge = useCallback((usage: ChatTokenUsage, charged?: number): ChatTokenUsage => {
    if (charged == null) return usage;
    const chargedTokens = Math.max(0, Math.round(charged));
    const historyTokensCharged = usage.chargedTokens > 0
      ? Math.round(usage.historyTokensCharged * (chargedTokens / usage.chargedTokens))
      : 0;
    return { ...usage, chargedTokens, historyTokensCharged };
  }, []);

  const runAiLoop = useCallback(
    async (currentEffort: ReasoningEffort, overrideFamily?: ChatModelFamily) => {
      // For image turns we force Gemini (the only vision-capable provider).
      const effectiveFamily = overrideFamily ?? modelFamily;
      const effectiveGeminiPro = overrideFamily === 'gemini' ? geminiPro : geminiPro;
      setTyping(true);
      try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          if (!systemPromptTokensTrackedRef.current) {
            systemPromptTokensTrackedRef.current = true;
            const today = new Date().toISOString().slice(0, 10);
            const premiumPrompt = isProEffort(currentEffort) || (effectiveFamily === 'gemini' && effectiveGeminiPro);
            const sysPrompt = systemPrompt(today, data.agentName, premiumPrompt);
            const memory = data.agentMemory.trim() ? `[זיכרון אישי קבוע על המשתמש]\n${data.agentMemory.trim()}` : '';
            addPromptReadContext(t('chat_prompt_read_system'), memory ? `${sysPrompt}\n${memory}` : sysPrompt, t('chat_status_prompt_system'));
          }
          const visiblePromptReadTokens = promptReadTokensRef.current;
          const visiblePromptReadDescriptions = [...promptReadDescriptionsRef.current];
          const visiblePromptReadBreakdown = { ...promptReadBreakdownRef.current };
          promptReadTokensRef.current = 0;
          promptReadDescriptionsRef.current = [];
          promptReadBreakdownRef.current = {};

          const turns = buildMessages();
          const requestOptions: CompleteChatOptions = {
            reasoningEffort: reasoningApiValue(currentEffort),
            provider: reasoningProvider(currentEffort, effectiveFamily, effectiveGeminiPro),
            idToken: await idToken(),
            displayName,
          };
          const trackRemaining = (result: ChatCompletionResult) => {
            if (result.remaining != null) {
              data.applyTokenQuota({ remainingTokens: result.remaining });
            }
          };
          const usageFor = (result: ChatCompletionResult): ChatTokenUsage | undefined => result.usage
            ? applyAuthoritativeCharge(applyHistoryDiscount(
              {
                ...result.usage,
                promptReadTokens: visiblePromptReadTokens,
                promptReadDescriptions: visiblePromptReadDescriptions,
                promptReadBreakdown: visiblePromptReadBreakdown,
              },
              currentEffort,
            ), result.charged)
            : undefined;

          let result = await completeChatReliably(turns, requestOptions, {
            onRetry: () => setTypingStatus(t('chat_status_retrying_ai')),
            onResult: trackRemaining,
          });
          let usage = usageFor(result);
          let replyText = result.text;
          let parsed = extractJson(replyText);

          for (let repairAttempt = 0; repairAttempt < MAX_JSON_REPAIR_RETRIES && shouldRepairJsonReply(replyText, parsed); repairAttempt++) {
            setTypingStatus(t('chat_status_repairing_json'));
            const repairTurns: ChatTurn[] = [
              ...turns,
              { role: 'assistant', content: replyText || '[empty assistant reply]' },
              { role: 'user', content: retryInvalidJsonInstruction },
            ];
            result = await completeChatReliably(repairTurns, requestOptions, {
              onRetry: () => setTypingStatus(t('chat_status_retrying_ai')),
              onResult: trackRemaining,
            });
            usage = usageFor(result);
            replyText = result.text;
            parsed = extractJson(replyText);
          }

          if (shouldRepairJsonReply(replyText, parsed)) {
            throw new Error('AI returned invalid JSON after repair attempts');
          }

          setTypingStatus(null);
          appendAiContextTurn(
            { role: 'assistant', content: replyText },
            aiOutputContextTokens(replyText, usage),
          );

          // Read-only schedule lookup: answer locally, feed back, let the model continue.
          if (parsed && parsed.tool === 'get_schedule') {
            const lookup = scheduleForDate(
              typeof parsed.date === 'string' ? parsed.date : undefined,
              typeof parsed.endDate === 'string' ? parsed.endDate : undefined,
              data.scheduleItems,
            );
            const encoded = JSON.stringify(lookup);
            addPromptReadContext(t('chat_prompt_read_schedule_result'), encoded, t('chat_status_prompt_schedule_result'));
            // If we still have rounds, feed the data back and let the model
            // phrase the answer. On the last round, fall back to a friendly
            // summary built from the lookup so the user never sees raw JSON.
            if (round < MAX_TOOL_ROUNDS) {
              appendAiContextTurn({ role: 'user', content: encoded });
              continue;
            }
            const count = Array.isArray(lookup.events) ? lookup.events.length : 0;
            const when = typeof parsed.date === 'string' ? parsed.date : '';
            const fallback = count > 0
              ? `${t('chat_schedule_lookup_found').replace('{count}', String(count)).replace('{date}', when)}`
              : t('chat_schedule_lookup_empty').replace('{date}', when);
            revealReply(fallback, currentEffort, { tokenUsage: usage });
            return;
          }

          const action = typeof parsed?.action === 'string' ? parsed.action : undefined;
          const rawMessage = typeof parsed?.message === 'string' ? parsed.message.trim() : '';

          // Applied immediately — no approval needed.
          if (action === 'set_agent_name') {
            data.setAgentName(typeof parsed?.name === 'string' ? parsed.name : '');
            revealReply(
              rawMessage || t('agent_renamed').replace('{name}', (typeof parsed?.name === 'string' ? parsed.name : '').trim() || t('agent_default_name')),
              currentEffort,
              { tokenUsage: usage },
            );
            return;
          }
          if (action === 'save_memory') {
            data.setAgentMemory(typeof parsed?.memory === 'string' ? parsed.memory : '');
            revealReply(rawMessage || t('agent_memory_saved'), currentEffort, { tokenUsage: usage });
            return;
          }

          const mutations = parsed ? mutationActionsFromJson(parsed) : [];
          if (mutations.length > 0) {
            const message = rawMessage || t('chat_pending_change').replace('{count}', String(mutations.length));
            // Ground-truth breakdown built from the JSON itself, so approval is
            // never based on a vague model summary alone.
            const details = describeActions(mutations, data, t, lang);
            pushAiMessage(details ? `${message}\n\n${details}` : message, { tokenUsage: usage, pendingActions: mutations });
            return;
          }

          // Plain conversational reply — either free text, or a JSON envelope
          // carrying just `{"message": "..."}` with no recognized action.
          // Guard against empty replies (model hiccup) and against showing the
          // user raw JSON when the envelope had no usable message/action.
          const visibleReply = rawMessage || replyText;
          if (visibleReply.trim()) {
            revealReply(visibleReply, currentEffort, { tokenUsage: usage });
          } else {
            pushAiMessage(t('chat_empty_reply'), { tokenUsage: usage });
          }
          return;
        }
      } catch (e) {
        if (e instanceof QuotaExhaustedError) {
          setOutOfCredits(true);
          pushAiMessage(tt('chat_quota_exhausted_web'));
        } else {
          pushAiMessage(t('chat_error'));
        }
      } finally {
        setTyping(false);
        setTypingStatus(null);
      }
    },
    [addPromptReadContext, appendAiContextTurn, applyAuthoritativeCharge, applyHistoryDiscount, buildMessages, data, displayName, geminiPro, idToken, lang, modelFamily, pushAiMessage, revealReply, t, tt],
  );

  const contextLimit = CONTEXT_TOKEN_LIMIT;
  const memoryFull = contextTokens >= contextLimit;

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || typing || memoryFull) return;
      ensureLazyPacks(trimmed);
      setMessages((prev) => [...prev, { id: genId(), fromUser: true, text: trimmed, inputTokens: estimateTokens(trimmed) }]);
      appendAiContextTurn({ role: 'user', content: trimmed });
      void runAiLoop(effort);
    },
    [typing, memoryFull, ensureLazyPacks, runAiLoop, effort, appendAiContextTurn],
  );

  // Attach a user-uploaded document/spreadsheet/text file to the chat. The raw
  // bytes are sent as a provider file part; no client-side text extraction.
  // DeepSeek/OpenRouter cannot read file parts, so document turns route to
  // Gemini unless the user explicitly selected GPT.
  const [parsingFile, setParsingFile] = useState(false);
  const sendWithFile = useCallback(
    async (file: File, note: string) => {
      if (typing || memoryFull || parsingFile) return;
      setParsingFile(true);
      let rawFile;
      try {
        rawFile = await prepareRawFile(file);
      } catch (e) {
        setParsingFile(false);
        pushAiMessage(e instanceof Error ? `📎 ${e.message}` : t('chat_file_parse_error'));
        return;
      }
      setParsingFile(false);
      const caption = note.trim();
      const promptText = caption || 'המשתמש צירף קובץ. קרא אותו כמו שהוא, סכם/נתח אותו וענה לפי התוכן.';
      const visibleText = `📎 ${rawFile.name} · ${rawFile.summary}${caption ? `\n${caption}` : ''}`;
      const parts: ChatContentPart[] = [
        { type: 'file', file: { filename: rawFile.name, file_data: rawFile.dataUrl } },
        { type: 'text', text: promptText },
      ];
      const targetFamily: ChatModelFamily = modelFamily === 'gpt' ? 'gpt' : 'gemini';
      const fileEffort = modelFamily === targetFamily ? effort : 'medium';
      const inputTokens = rawFile.estimatedTokens + estimateTokens(promptText);
      ensureLazyPacks(caption || rawFile.name);
      setMessages((prev) => [...prev, { id: genId(), fromUser: true, text: visibleText, inputTokens }]);
      appendAiContextTurn({ role: 'user', content: parts }, inputTokens);
      void runAiLoop(fileEffort, targetFamily);
    },
    [typing, memoryFull, parsingFile, ensureLazyPacks, pushAiMessage, t, modelFamily, effort, appendAiContextTurn, runAiLoop],
  );

  // Attach a user-uploaded image to the chat. Images go ONLY to Gemini (the
  // only provider with vision support here) — if the user is on DeepSeek/GPT,
  // we switch to Gemini for this one turn so the image actually gets read.
  // The image is resized client-side and sent as a base64 data URL inside a
  // multimodal content array (OpenAI/Gemini format).
  const sendWithImage = useCallback(
    async (file: File, note: string) => {
      if (typing || memoryFull || parsingFile) return;
      if (!isImageFile(file)) {
        pushAiMessage(t('chat_image_not_image'));
        return;
      }
      setParsingFile(true);
      let dataUrl: string;
      let width: number;
      let height: number;
      try {
        const processed = await processImage(file);
        dataUrl = processed.dataUrl;
        width = processed.width;
        height = processed.height;
      } catch (e) {
        setParsingFile(false);
        pushAiMessage(e instanceof Error ? `🖼️ ${e.message}` : t('chat_image_parse_error'));
        return;
      }
      setParsingFile(false);
      const caption = note.trim();
      // What the user sees in the bubble: a thumbnail + caption.
      const visibleText = `🖼️ ${file.name} · ${width}×${height}${caption ? `\n${caption}` : ''}`;
      // What the model sees: multimodal content (image + text). Gemini reads
      // the image_url directly; the text part carries the caption/instruction.
      const parts: ChatContentPart[] = [
        { type: 'image_url', image_url: { url: dataUrl } },
        {
          type: 'text',
          text: caption || 'המשתמש שלח תמונה. תאר/נתח אותה וענה לפי הבקשה.',
        },
      ];
      // Images need Gemini — force it for this turn if the user is elsewhere.
      const imageEffort = modelFamily === 'gemini' ? effort : 'medium';
      const imageFamily = 'gemini' as ChatModelFamily;
      ensureLazyPacks(caption || file.name);
      setMessages((prev) => [...prev, { id: genId(), fromUser: true, text: visibleText, inputTokens: 1500 }]);
      appendAiContextTurn({ role: 'user', content: parts }, 1500 + estimateTokens(caption));
      void runAiLoop(imageEffort, imageFamily);
    },
    [typing, memoryFull, parsingFile, ensureLazyPacks, pushAiMessage, t, appendAiContextTurn, runAiLoop, effort, modelFamily],
  );

  // Attach existing tasks for the AI to weave into the schedule — the web
  // analogue of the app's attachTasksToChat (📎 button).
  const attachTasks = useCallback(
    (ids: string[]) => {
      if (typing || memoryFull || ids.length === 0) return;
      const picked = data.tasks.filter((task) => ids.includes(task.id));
      if (picked.length === 0) return;
      addLoadedPack('scheduleRead');
      addLoadedPack('scheduleWrite');
      includeEntityContextForPromptRead();
      const payload = picked.map((task) => ({
        id: task.id,
        title: task.title,
        courseId: task.courseId ?? null,
        urgency: task.urgency,
        estimatedDurationMinutes: task.estimatedDurationMinutes ?? null,
        dueDateTime: task.dueDateTime ?? null,
      }));
      const modelText = `${t('chat_attached_tasks')}: ${JSON.stringify(payload)}. קשר אותן ללו"ז אם רלוונטי.`;
      setMessages((prev) => [
        ...prev,
        { id: genId(), fromUser: true, text: `${t('chat_attached_tasks')} (${picked.length})`, inputTokens: estimateTokens(modelText) },
      ]);
      appendAiContextTurn({ role: 'user', content: modelText });
      void runAiLoop(effort);
    },
    [typing, memoryFull, data.tasks, addLoadedPack, includeEntityContextForPromptRead, t, appendAiContextTurn, runAiLoop, effort],
  );

  const confirmPending = useCallback(
    (id: string) => {
      const entry = pendingRef.current.get(id);
      if (!entry || entry.resolved !== 'pending') return;
      entry.resolved = 'approved';
      // Snapshot the data *before* applying so the change can be undone later.
      const snapshot = data.snapshotState();
      const summary = applyMutationActions(entry.actions, data, t);
      const undoKey = `ai_undo_change_${genId()}`;
      undoSnapshotsRef.current.set(undoKey, JSON.stringify(snapshot));
      // The model keeps seeing the (now updated) app data on later turns, but
      // the conversation already paid for the app-data read — don't re-charge.
      entitiesNeededRef.current = true;
      appendAiContextTurn({ role: 'assistant', content: summary });
      setMessages((prev) => [
        ...prev.map((m) => (m.id === id && m.pending ? { ...m, pending: { ...m.pending, resolved: 'approved' as const } } : m)),
        { id: genId(), fromUser: false, text: summary, actionKeys: [undoKey], undoKey },
      ]);
    },
    [data, appendAiContextTurn, t],
  );

  const undoChange = useCallback(
    (undoKey: string) => {
      const snapshotJson = undoSnapshotsRef.current.get(undoKey);
      if (!snapshotJson) return;
      undoSnapshotsRef.current.delete(undoKey);
      data.restoreState(JSON.parse(snapshotJson) as CloudAppState);
      const text = t('chat_change_undone');
      appendAiContextTurn({ role: 'assistant', content: text });
      setMessages((prev) => [
        // Drop the undo affordance from the confirmation bubble, then confirm.
        ...prev.map((m) =>
          undoKeyFromMessage(m) === undoKey
            ? { ...m, actionKeys: (m.actionKeys ?? []).filter((key) => key !== undoKey), undoKey: undefined }
            : m,
        ),
        { id: genId(), fromUser: false, text },
      ]);
    },
    [data, appendAiContextTurn, t],
  );

  const rejectPending = useCallback((id: string) => {
    const entry = pendingRef.current.get(id);
    if (!entry || entry.resolved !== 'pending') return;
    entry.resolved = 'rejected';
    const text = t('chat_change_rejected_followup');
    appendAiContextTurn({ role: 'assistant', content: text });
    setMessages((prev) => [
      ...prev.map((m) => (m.id === id && m.pending ? { ...m, pending: { ...m.pending, resolved: 'rejected' as const } } : m)),
      { id: genId(), fromUser: false, text },
    ]);
  }, [appendAiContextTurn, t]);

  // Archive the current conversation as a session (newest first, capped) if it
  // has real content. Returns the resulting sessions list.
  const archiveCurrent = useCallback(
    (excludeId?: string): CloudChatSession[] => {
      const current = toCloudChat(messagesRef.current);
      let sessions = cloudChatSessions.filter((s) => s.id !== excludeId);
      if (hasRealConversation(current)) {
        const session: CloudChatSession = {
          id: genId(),
          title: sessionTitle(current, t('chat_new')),
          createdAt: new Date().toISOString(),
          messages: current,
          totalTokens: 0,
          packs: [...loadedPacksRef.current],
          packsEntities: entitiesNeededRef.current,
        };
        sessions = [session, ...sessions].slice(0, 5);
      }
      return sessions;
    },
    [cloudChatSessions, t],
  );

  const newChat = useCallback(() => {
    if (typing) return;
    saveCloudSessions(archiveCurrent());
    suppressSaveRef.current = true;
    clearCloudChat();
    startFresh();
  }, [typing, startFresh, clearCloudChat, saveCloudSessions, archiveCurrent]);

  // "Summarize & free space" at the memory cap: ask the model for a compact
  // brief of the whole conversation, archive the full thread into the history,
  // then continue the live chat as summary-bubble + the last 10 messages — the
  // model context shrinks drastically but nothing is really lost.
  const [summarizing, setSummarizing] = useState(false);
  const summarizeChat = useCallback(async () => {
    if (typing || summarizing) return;
    const visible = messagesRef.current;
    if (!hasRealConversation(toCloudChat(visible))) return;
    setSummarizing(true);
    setTyping(true);
    setTypingStatus(t('chat_status_summarizing'));
    try {
      const result = await completeChat(
        [...aiContextRef.current, { role: 'user', content: summarizeChatInstruction }],
        {
          reasoningEffort: reasoningApiValue(effort),
          provider: reasoningProvider(effort, modelFamily, geminiPro),
          idToken: await idToken(),
          displayName,
        },
      );
      const summary = result.text.trim();
      if (!summary) throw new Error('empty summary');
      if (result.remaining != null) {
        data.applyTokenQuota({ remainingTokens: result.remaining });
      }
      const usage = result.usage
        ? applyAuthoritativeCharge(applyHistoryDiscount(result.usage, effort), result.charged)
        : undefined;
      // Keep the full conversation reachable from the history before compacting.
      saveCloudSessions(archiveCurrent());
      const keep = visible.slice(-10);
      const summaryMessage: LocalChatMessage = {
        id: genId(),
        fromUser: false,
        text: `${t('chat_summary_prefix')}\n\n${summary}`,
        tokenUsage: usage ?? null,
      };
      const compacted = [summaryMessage, ...keep];
      setAiContext(
        compacted.map((m) => ({ role: m.fromUser ? 'user' : 'assistant', content: m.text })),
      );
      setMessages(compacted);
    } catch (e) {
      if (e instanceof QuotaExhaustedError) {
        setOutOfCredits(true);
        pushAiMessage(tt('chat_quota_exhausted_web'));
      } else {
        pushAiMessage(t('chat_error'));
      }
    } finally {
      setSummarizing(false);
      setTyping(false);
      setTypingStatus(null);
    }
  }, [typing, summarizing, effort, geminiPro, modelFamily, idToken, displayName, data, applyAuthoritativeCharge, applyHistoryDiscount, saveCloudSessions, archiveCurrent, setAiContext, pushAiMessage, t, tt]);

  // Restore a saved session into the active conversation, archiving whatever is
  // open now (mirrors the app's restoreSession).
  const restoreSession = useCallback(
    (id: string) => {
      if (typing) return;
      const session = cloudChatSessions.find((s) => s.id === id);
      if (!session) return;
      saveCloudSessions(archiveCurrent(id));
      // Don't suppress: the restored thread should become the active cloud thread.
      restoreFromCloud(session.messages, { packs: session.packs, entities: session.packsEntities });
    },
    [typing, cloudChatSessions, saveCloudSessions, archiveCurrent, restoreFromCloud],
  );

  const deleteSession = useCallback(
    (id: string) => {
      saveCloudSessions(cloudChatSessions.filter((s) => s.id !== id));
    },
    [cloudChatSessions, saveCloudSessions],
  );

  // Stop the reveal animation if the chat unmounts mid-write.
  useEffect(
    () => () => {
      if (revealTimerRef.current != null) window.clearInterval(revealTimerRef.current);
    },
    [],
  );

  const quotaRemaining = data.tokenQuota?.remainingTokens ?? null;
  const noCredits = outOfCredits || (quotaRemaining != null && quotaRemaining <= 0);
  const visibleMessages = useMemo(() => messagesWithLiveUndo(messages), [messages, messagesWithLiveUndo]);

  return useMemo(
    () => ({
      messages: visibleMessages,
      typing,
      typingStatus,
      streamingText,
      effort,
      setEffort,
      modelFamily,
      setModelFamily,
      geminiPro,
      setGeminiPro,
      sendText,
      sendWithFile,
      sendWithImage,
      parsingFile,
      attachTasks,
      confirmPending,
      rejectPending,
      undoChange,
      newChat,
      summarizeChat,
      sessions: cloudChatSessions,
      restoreSession,
      deleteSession,
      agentDisplayName,
      quotaRemaining,
      noCredits,
      contextTokens,
      contextLimit,
      memoryFull,
      tt,
    }),
    [visibleMessages, typing, typingStatus, streamingText, effort, setEffort, modelFamily, setModelFamily, geminiPro, setGeminiPro, sendText, sendWithFile, sendWithImage, parsingFile, attachTasks, confirmPending, rejectPending, undoChange, newChat, summarizeChat, cloudChatSessions, restoreSession, deleteSession, agentDisplayName, quotaRemaining, noCredits, contextTokens, contextLimit, memoryFull, tt],
  );
}
