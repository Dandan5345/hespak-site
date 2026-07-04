import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { completeChat, QuotaExhaustedError, type ChatTurn } from '../../services/aiChat';
import { promptPackInstruction, systemPrompt, PACKS_NEEDING_ACTION_PROTOCOL, type ChatPromptPack } from '../../services/chatPrompts';
import { useAuth } from '../../state/AuthContext';
import { useData } from '../../state/DataContext';
import { useI18n } from '../../i18n/I18nProvider';
import { genId, reasoningApiValue, reasoningProvider, type ChatTokenUsage, type ReasoningEffort } from '../../state/types';
import { PACK_ORDER, PACKS_NEEDING_ENTITIES, packsForText } from './keywordIntents';
import { buildEntitiesContext, scheduleForDate } from './entitiesContext';
import { applyMutationActions, mutationActionsFromJson } from './chatActions';
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

const REASONING_KEY = 'sf_reasoning';
const VALID_EFFORTS: ReasoningEffort[] = ['minimal', 'medium', 'high', 'cheap'];

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
    remoteSessions: cloudChatSessions,
    remoteRev: cloudChatRev,
    save: saveCloudChat,
    clear: clearCloudChat,
    saveSessions: saveCloudSessions,
  } = useCloudChat();

  const agentDisplayName = data.agentName.trim() || t('agent_default_name');

  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
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
    aiContextRef.current = [];
    loadedPacksRef.current = new Set();
    entitiesNeededRef.current = false;
    entityContextReadTrackedRef.current = false;
    systemPromptTokensTrackedRef.current = false;
    promptReadTokensRef.current = 0;
    promptReadDescriptionsRef.current = [];
    promptReadBreakdownRef.current = {};
    pendingRef.current = new Map();
    setOutOfCredits(false);
    aiContextRef.current = [{ role: 'assistant', content: greeting }];
    setMessages([
      {
        id: genId(),
        fromUser: false,
        text: greeting,
        quickReplies: [t('chat_btn_schedule'), t('chat_btn_task')],
      },
    ]);
  }, [greetingText, t, clearReveal]);

  // Restore a synced conversation (from a reload or the mobile app) into the
  // live UI + model context. Mirrors the app's restoreSession: the model context
  // is rebuilt from the visible turns only.
  const restoreFromCloud = useCallback((stored: CloudChatMessage[]) => {
    clearReveal();
    loadedPacksRef.current = new Set();
    entitiesNeededRef.current = false;
    entityContextReadTrackedRef.current = false;
    systemPromptTokensTrackedRef.current = false;
    promptReadTokensRef.current = 0;
    promptReadDescriptionsRef.current = [];
    promptReadBreakdownRef.current = {};
    pendingRef.current = new Map();
    setOutOfCredits(false);
    aiContextRef.current = stored.map((m) => ({ role: m.fromUser ? 'user' : 'assistant', content: m.text }));
    setMessages(
      stored.map((m) => ({
        id: genId(),
        fromUser: m.fromUser,
        text: m.text,
        inputTokens: m.inputTokens ?? null,
        tokenUsage: m.tokenUsage ?? null,
      })),
    );
  }, [clearReveal]);

  // First mount: wait for the cloud snapshot, then either restore the synced
  // conversation or open with a local greeting — no model call either way.
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!cloudChatLoaded) return;
    hydratedRef.current = true;
    suppressSaveRef.current = true;
    if (hasRealConversation(cloudChatRemote)) {
      restoreFromCloud(cloudChatRemote);
    } else {
      startFresh();
    }
  }, [cloudChatLoaded, cloudChatRemote, restoreFromCloud, startFresh]);

  // Write-through: persist the conversation whenever it changes locally. Skipped
  // right after we apply a remote snapshot (suppressSaveRef) so we don't echo.
  useEffect(() => {
    messagesRef.current = messages;
    if (!hydratedRef.current) return;
    if (suppressSaveRef.current) {
      suppressSaveRef.current = false;
      return;
    }
    saveCloudChat(toCloudChat(messages));
  }, [messages, saveCloudChat]);

  // Realtime pull: when another device changes the conversation, adopt it —
  // unless we're mid-generation, or it's just our own write echoing back.
  useEffect(() => {
    // Don't adopt a remote snapshot while thinking or mid-reveal on this device.
    if (!hydratedRef.current || typing || revealTimerRef.current != null) return;
    const remote = cloudChatRemote;
    if (JSON.stringify(remote) === JSON.stringify(toCloudChat(messagesRef.current))) return;
    suppressSaveRef.current = true;
    if (hasRealConversation(remote)) {
      restoreFromCloud(remote);
    } else {
      startFresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudChatRev]);

  const setEffort = useCallback((e: ReasoningEffort) => {
    setEffortState(e);
    localStorage.setItem(REASONING_KEY, e);
  }, []);

  const promptReadDescription = useCallback(
    (pack: ChatPromptPack) => {
      switch (pack) {
        case 'actionProtocol':
          return t('chat_prompt_read_action');
        case 'tasks':
          return t('chat_prompt_read_tasks');
        case 'courses':
          return t('chat_prompt_read_courses');
        case 'schedule':
          return t('chat_prompt_read_schedule');
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

  const addPromptReadContext = useCallback((description: string, text: string) => {
    const tokens = estimateTokens(text);
    if (tokens <= 0) return;
    promptReadTokensRef.current += tokens;
    promptReadDescriptionsRef.current.push(description);
    promptReadBreakdownRef.current[description] = (promptReadBreakdownRef.current[description] ?? 0) + tokens;
  }, []);

  const includeEntityContextForPromptRead = useCallback(() => {
    entitiesNeededRef.current = true;
    if (entityContextReadTrackedRef.current) return;
    entityContextReadTrackedRef.current = true;
    addPromptReadContext(t('chat_prompt_read_app_data'), buildEntitiesContext(data.courses, data.tasks, data.smartReminders));
  }, [addPromptReadContext, data.courses, data.smartReminders, data.tasks, t]);

  const addLoadedPack = useCallback(
    (pack: ChatPromptPack) => {
      if (loadedPacksRef.current.has(pack)) return;
      loadedPacksRef.current.add(pack);
      addPromptReadContext(promptReadDescription(pack), promptPackInstruction(pack));
    },
    [addPromptReadContext, promptReadDescription],
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
    const detected = packsForText(lower);
    for (const pack of detected) {
      if (PACKS_NEEDING_ACTION_PROTOCOL.includes(pack)) addLoadedPack('actionProtocol');
      addLoadedPack(pack);
      if (PACKS_NEEDING_ENTITIES.includes(pack)) includeEntityContextForPromptRead();
    }
  }, [addLoadedPack, includeEntityContextForPromptRead]);

  const buildMessages = useCallback((): ChatTurn[] => {
    const today = new Date().toISOString().slice(0, 10);
    const turns: ChatTurn[] = [{ role: 'system', content: systemPrompt(today, data.agentName) }];
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
  }, [data.agentName, data.agentMemory, data.courses, data.tasks, data.smartReminders]);

  const estimateSystemInstructionTokens = useCallback((): number => {
    const today = new Date().toISOString().slice(0, 10);
    let tokens = estimateTokens(systemPrompt(today, data.agentName));
    if (data.agentMemory.trim()) tokens += estimateTokens(`[זיכרון אישי קבוע על המשתמש]\n${data.agentMemory.trim()}`);
    if (entitiesNeededRef.current) tokens += estimateTokens(buildEntitiesContext(data.courses, data.tasks, data.smartReminders));
    for (const pack of loadedPacksRef.current) tokens += estimateTokens(promptPackInstruction(pack));
    return tokens;
  }, [data.agentMemory, data.agentName, data.courses, data.smartReminders, data.tasks]);

  const applyHistoryDiscount = useCallback(
    (raw: ChatTokenUsage, currentEffort: ReasoningEffort): ChatTokenUsage => {
      const multiplier = currentEffort === 'cheap' ? 0.5 : 1;
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

  const runAiLoop = useCallback(
    async (currentEffort: ReasoningEffort) => {
      setTyping(true);
      try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          if (!systemPromptTokensTrackedRef.current) {
            systemPromptTokensTrackedRef.current = true;
            const today = new Date().toISOString().slice(0, 10);
            const sysPrompt = systemPrompt(today, data.agentName);
            const memory = data.agentMemory.trim() ? `[זיכרון אישי קבוע על המשתמש]\n${data.agentMemory.trim()}` : '';
            addPromptReadContext(t('chat_prompt_read_system'), memory ? `${sysPrompt}\n${memory}` : sysPrompt);
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
          const usage = result.usage
            ? applyHistoryDiscount(
                {
                  ...result.usage,
                  promptReadTokens: visiblePromptReadTokens,
                  promptReadDescriptions: visiblePromptReadDescriptions,
                  promptReadBreakdown: visiblePromptReadBreakdown,
                },
                currentEffort,
              )
            : undefined;
          const replyText = result.text;
          aiContextRef.current = [...aiContextRef.current, { role: 'assistant', content: replyText }];

          const parsed = extractJson(replyText);

          // Read-only schedule lookup: answer locally, feed back, let the model continue.
          if (parsed && parsed.tool === 'get_schedule' && round < MAX_TOOL_ROUNDS) {
            const lookup = scheduleForDate(typeof parsed.date === 'string' ? parsed.date : undefined, data.scheduleItems);
            const encoded = JSON.stringify(lookup);
            addPromptReadContext(t('chat_prompt_read_schedule_result'), encoded);
            aiContextRef.current = [...aiContextRef.current, { role: 'user', content: encoded }];
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
            pushAiMessage(message, { tokenUsage: usage, pendingActions: mutations });
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
      }
    },
    [addPromptReadContext, applyHistoryDiscount, buildMessages, data, displayName, idToken, pushAiMessage, revealReply, t, tt],
  );

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || typing) return;
      ensureLazyPacks(trimmed);
      setMessages((prev) => [...prev, { id: genId(), fromUser: true, text: trimmed, inputTokens: estimateTokens(trimmed) }]);
      aiContextRef.current = [...aiContextRef.current, { role: 'user', content: trimmed }];
      void runAiLoop(effort);
    },
    [typing, ensureLazyPacks, runAiLoop, effort],
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
      entityContextReadTrackedRef.current = false;
      includeEntityContextForPromptRead();
      aiContextRef.current = [...aiContextRef.current, { role: 'assistant', content: summary }];
      setMessages((prev) => [
        ...prev.map((m) => (m.id === id && m.pending ? { ...m, pending: { ...m.pending, resolved: 'approved' as const } } : m)),
        { id: genId(), fromUser: false, text: summary, undoKey },
      ]);
    },
    [data, includeEntityContextForPromptRead, t],
  );

  const undoChange = useCallback(
    (undoKey: string) => {
      const snapshot = undoSnapshotsRef.current.get(undoKey);
      if (!snapshot) return;
      undoSnapshotsRef.current.delete(undoKey);
      data.restoreState(snapshot);
      const text = t('chat_change_undone');
      aiContextRef.current = [...aiContextRef.current, { role: 'assistant', content: text }];
      setMessages((prev) => [
        // Drop the undo affordance from the confirmation bubble, then confirm.
        ...prev.map((m) => (m.undoKey === undoKey ? { ...m, undoKey: undefined } : m)),
        { id: genId(), fromUser: false, text },
      ]);
    },
    [data, t],
  );

  const rejectPending = useCallback((id: string) => {
    const entry = pendingRef.current.get(id);
    if (!entry || entry.resolved !== 'pending') return;
    entry.resolved = 'rejected';
    const text = t('chat_change_rejected_followup');
    aiContextRef.current = [...aiContextRef.current, { role: 'assistant', content: text }];
    setMessages((prev) => [
      ...prev.map((m) => (m.id === id && m.pending ? { ...m, pending: { ...m.pending, resolved: 'rejected' as const } } : m)),
      { id: genId(), fromUser: false, text },
    ]);
  }, [t]);

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

  // Restore a saved session into the active conversation, archiving whatever is
  // open now (mirrors the app's restoreSession).
  const restoreSession = useCallback(
    (id: string) => {
      if (typing) return;
      const session = cloudChatSessions.find((s) => s.id === id);
      if (!session) return;
      saveCloudSessions(archiveCurrent(id));
      // Don't suppress: the restored thread should become the active cloud thread.
      restoreFromCloud(session.messages);
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
      streamingText,
      effort,
      setEffort,
      sendText,
      confirmPending,
      rejectPending,
      undoChange,
      newChat,
      sessions: cloudChatSessions,
      restoreSession,
      deleteSession,
      agentDisplayName,
      quotaRemaining,
      noCredits,
      tt,
    }),
    [messages, typing, streamingText, effort, setEffort, sendText, confirmPending, rejectPending, undoChange, newChat, cloudChatSessions, restoreSession, deleteSession, agentDisplayName, quotaRemaining, noCredits, tt],
  );
}
