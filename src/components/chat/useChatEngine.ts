import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { completeChat, QuotaExhaustedError, type ChatTurn } from '../../services/aiChat';
import { promptPackInstruction, summarizeChatInstruction, systemPrompt, type ChatPromptPack } from '../../services/chatPrompts';
import { useAuth } from '../../state/AuthContext';
import { useData } from '../../state/DataContext';
import { useI18n } from '../../i18n/I18nProvider';
import { genId, isProEffort, reasoningApiValue, reasoningCostMultiplier, reasoningProvider, type ChatTokenUsage, type ReasoningEffort } from '../../state/types';
import { PACK_ORDER, PACKS_NEEDING_ENTITIES, packsForText, isSmartNotificationIntent } from './keywordIntents';
import { buildEntitiesContext, scheduleForDate } from './entitiesContext';
import { applyMutationActions, describeActions, mutationActionsFromJson } from './chatActions';
import { extractJson } from './extractJson';
import { useCloudChat, type CloudChatMessage, type CloudChatSession } from './useCloudChat';
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
 * the full history up to ~16K estimated tokens (32K on the Pro tiers); past
 * that the user can either summarize-and-compact the conversation in place or
 * start a new chat (the old one stays in the history). */
export const CONTEXT_TOKEN_LIMIT = 16000;
export const PRO_CONTEXT_TOKEN_LIMIT = 32000;

const REASONING_KEY = 'sf_reasoning';
const VALID_EFFORTS: ReasoningEffort[] = ['cheap', 'minimal', 'medium', 'high', 'expert', 'max', 'proSmart', 'proDeep', 'proExpert', 'proMax'];

function readEffort(): ReasoningEffort {
  const v = localStorage.getItem(REASONING_KEY);
  return (VALID_EFFORTS as string[]).includes(v ?? '') ? (v as ReasoningEffort) : 'medium';
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

function aiOutputContextTokens(text: string, usage?: ChatTokenUsage | null): number {
  const estimated = estimateTokens(text);
  return usage ? Math.max(estimated, usage.completionTokens) : estimated;
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
  // instructions excluded). Drives the 16K memory meter + full-memory gate.
  const [contextTokens, setContextTokens] = useState(0);
  // While the agent is *writing* (not thinking), the reply is revealed a few
  // characters at a time here — the web analogue of the app's streamingText.
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [effort, setEffortState] = useState<ReasoningEffort>(readEffort);

  const aiContextRef = useRef<ChatTurn[]>([]);
  const loadedPacksRef = useRef<Set<ChatPromptPack>>(new Set());
  const entitiesNeededRef = useRef(false);
  const entityContextReadTrackedRef = useRef(false);
  const systemPromptTokensTrackedRef = useRef(false);
  const promptReadTokensRef = useRef(0);
  const promptReadDescriptionsRef = useRef<string[]>([]);
  const promptReadBreakdownRef = useRef<Record<string, number>>({});
  const pendingRef = useRef<Map<string, PendingEntry>>(new Map());
  // Pre-change snapshots so a confirmed AI change can be undone while the chat
  // stays open (mirrors AppController._undoSnapshots).
  const undoSnapshotsRef = useRef<Map<string, CloudAppState>>(new Map());
  const hydratedRef = useRef(false);
  // Set right before we replace local messages with a remote snapshot, so the
  // save-on-change effect doesn't immediately echo that snapshot back.
  const suppressSaveRef = useRef(false);
  // Mirror of `messages` for use inside effects without re-subscribing them.
  const messagesRef = useRef<LocalChatMessage[]>([]);
  const revealTimerRef = useRef<number | null>(null);

  // Single write-path for the model context: keeps the ref and the estimated
  // token counter in sync so the 16K memory gate is always accurate.
  const setAiContext = useCallback((turns: ChatTurn[], tokenAdjustment = 0) => {
    aiContextRef.current = turns;
    let total = 0;
    for (const turn of turns) total += estimateTokens(turn.content);
    setContextTokens(Math.max(0, total + tokenAdjustment));
  }, []);

  const appendAiContextTurn = useCallback((turn: ChatTurn, actualTokens?: number) => {
    aiContextRef.current = [...aiContextRef.current, turn];
    const estimated = estimateTokens(turn.content);
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
    const seeded = new Set<ChatPromptPack>();
    for (const p of hint?.packs ?? []) {
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
    setMessages(
      stored.map((m) => ({
        id: genId(),
        fromUser: m.fromUser,
        text: m.text,
        inputTokens: m.inputTokens ?? null,
        tokenUsage: m.tokenUsage ?? null,
      })),
    );
  }, [clearReveal, setAiContext]);

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
    saveCloudChat(toCloudChat(messages), [...loadedPacksRef.current], entitiesNeededRef.current);
  }, [messages, saveCloudChat]);

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

  const promptReadDescription = useCallback(
    (pack: ChatPromptPack) => {
      switch (pack) {
        case 'scheduleRead':
          return t('chat_prompt_read_schedule');
        case 'scheduleWrite':
          return t('chat_prompt_read_schedule_write');
        case 'tasks':
          return t('chat_prompt_read_tasks');
        case 'courses':
          return t('chat_prompt_read_courses');
        case 'misc':
          return t('chat_prompt_read_misc');
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
        case 'tasks':
          return t('chat_status_prompt_tasks');
        case 'courses':
          return t('chat_status_prompt_courses');
        case 'misc':
          return t('chat_status_prompt_misc');
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
    // The misc pack itself is small, but managing reminders needs the live
    // reminder list (ids) from the app data.
    if (isSmartNotificationIntent(lower)) includeEntityContextForPromptRead();
  }, [addLoadedPack, includeEntityContextForPromptRead]);

  const buildMessages = useCallback((): ChatTurn[] => {
    const today = new Date().toISOString().slice(0, 10);
    const turns: ChatTurn[] = [{ role: 'system', content: systemPrompt(today, data.agentName, isProEffort(effort)) }];
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
  }, [data.agentName, data.agentMemory, data.courses, data.tasks, data.smartReminders, effort]);

  const estimateSystemInstructionTokens = useCallback((): number => {
    const today = new Date().toISOString().slice(0, 10);
    let tokens = estimateTokens(systemPrompt(today, data.agentName, isProEffort(effort)));
    if (data.agentMemory.trim()) tokens += estimateTokens(`[זיכרון אישי קבוע על המשתמש]\n${data.agentMemory.trim()}`);
    if (entitiesNeededRef.current) tokens += estimateTokens(buildEntitiesContext(data.courses, data.tasks, data.smartReminders));
    for (const pack of loadedPacksRef.current) tokens += estimateTokens(promptPackInstruction(pack));
    return tokens;
  }, [data.agentMemory, data.agentName, data.courses, data.smartReminders, data.tasks, effort]);

  const applyHistoryDiscount = useCallback(
    (raw: ChatTokenUsage, currentEffort: ReasoningEffort): ChatTokenUsage => {
      const multiplier = reasoningCostMultiplier(currentEffort);
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
    [estimateSystemInstructionTokens],
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
    async (currentEffort: ReasoningEffort) => {
      setTyping(true);
      try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          if (!systemPromptTokensTrackedRef.current) {
            systemPromptTokensTrackedRef.current = true;
            const today = new Date().toISOString().slice(0, 10);
            const sysPrompt = systemPrompt(today, data.agentName, isProEffort(currentEffort));
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
          const result = await completeChat(turns, {
            reasoningEffort: reasoningApiValue(currentEffort),
            provider: reasoningProvider(currentEffort),
            idToken: await idToken(),
            displayName,
          });
          if (result.remaining != null) {
            data.applyTokenQuota({ remainingTokens: result.remaining });
          }
          const usage = result.usage
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
          const replyText = result.text;
          setTypingStatus(null);
          appendAiContextTurn(
            { role: 'assistant', content: replyText },
            aiOutputContextTokens(replyText, usage),
          );

          const parsed = extractJson(replyText);

          // Read-only schedule lookup: answer locally, feed back, let the model continue.
          if (parsed && parsed.tool === 'get_schedule' && round < MAX_TOOL_ROUNDS) {
            const lookup = scheduleForDate(
              typeof parsed.date === 'string' ? parsed.date : undefined,
              typeof parsed.endDate === 'string' ? parsed.endDate : undefined,
              data.scheduleItems,
            );
            const encoded = JSON.stringify(lookup);
            addPromptReadContext(t('chat_prompt_read_schedule_result'), encoded, t('chat_status_prompt_schedule_result'));
            appendAiContextTurn({ role: 'user', content: encoded });
            continue;
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
          revealReply(rawMessage || replyText, currentEffort, { tokenUsage: usage });
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
    [addPromptReadContext, appendAiContextTurn, applyAuthoritativeCharge, applyHistoryDiscount, buildMessages, data, displayName, idToken, lang, pushAiMessage, revealReply, t, tt],
  );

  // Pro tiers get double the conversation memory.
  const contextLimit = isProEffort(effort) ? PRO_CONTEXT_TOKEN_LIMIT : CONTEXT_TOKEN_LIMIT;
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
      const undoKey = genId();
      undoSnapshotsRef.current.set(undoKey, snapshot);
      // The model keeps seeing the (now updated) app data on later turns, but
      // the conversation already paid for the app-data read — don't re-charge.
      entitiesNeededRef.current = true;
      appendAiContextTurn({ role: 'assistant', content: summary });
      setMessages((prev) => [
        ...prev.map((m) => (m.id === id && m.pending ? { ...m, pending: { ...m.pending, resolved: 'approved' as const } } : m)),
        { id: genId(), fromUser: false, text: summary, undoKey },
      ]);
    },
    [data, appendAiContextTurn, t],
  );

  const undoChange = useCallback(
    (undoKey: string) => {
      const snapshot = undoSnapshotsRef.current.get(undoKey);
      if (!snapshot) return;
      undoSnapshotsRef.current.delete(undoKey);
      data.restoreState(snapshot);
      const text = t('chat_change_undone');
      appendAiContextTurn({ role: 'assistant', content: text });
      setMessages((prev) => [
        // Drop the undo affordance from the confirmation bubble, then confirm.
        ...prev.map((m) => (m.undoKey === undoKey ? { ...m, undoKey: undefined } : m)),
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
          provider: reasoningProvider(effort),
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
        contextTokenAdjustmentForMessages(compacted),
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
  }, [typing, summarizing, effort, idToken, displayName, data, applyAuthoritativeCharge, applyHistoryDiscount, saveCloudSessions, archiveCurrent, setAiContext, pushAiMessage, t, tt]);

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

  return useMemo(
    () => ({
      messages,
      typing,
      typingStatus,
      streamingText,
      effort,
      setEffort,
      sendText,
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
    [messages, typing, typingStatus, streamingText, effort, setEffort, sendText, attachTasks, confirmPending, rejectPending, undoChange, newChat, summarizeChat, cloudChatSessions, restoreSession, deleteSession, agentDisplayName, quotaRemaining, noCredits, contextTokens, contextLimit, memoryFull, tt],
  );
}
