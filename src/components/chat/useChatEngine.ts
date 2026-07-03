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
import type { LocalChatMessage } from './types';

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

  const agentDisplayName = data.agentName.trim() || t('agent_default_name');

  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
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
  const greetedRef = useRef(false);

  const greetingText = useCallback(() => t('chat_greeting').replace('{name}', agentDisplayName), [t, agentDisplayName]);

  const startFresh = useCallback(() => {
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
  }, [greetingText, t]);

  // Local opening greeting on first mount — no model call.
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    startFresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            pushAiMessage(rawMessage || t('agent_renamed').replace('{name}', (typeof parsed?.name === 'string' ? parsed.name : '').trim() || t('agent_default_name')), {
              tokenUsage: usage,
            });
            return;
          }
          if (action === 'save_memory') {
            data.setAgentMemory(typeof parsed?.memory === 'string' ? parsed.memory : '');
            pushAiMessage(rawMessage || t('agent_memory_saved'), { tokenUsage: usage });
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
          pushAiMessage(rawMessage || replyText, { tokenUsage: usage });
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
    [addPromptReadContext, applyHistoryDiscount, buildMessages, data, displayName, idToken, pushAiMessage, t, tt],
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
      const summary = applyMutationActions(entry.actions, data, t);
      entityContextReadTrackedRef.current = false;
      includeEntityContextForPromptRead();
      aiContextRef.current = [...aiContextRef.current, { role: 'assistant', content: summary }];
      setMessages((prev) => [
        ...prev.map((m) => (m.id === id && m.pending ? { ...m, pending: { ...m.pending, resolved: 'approved' as const } } : m)),
        { id: genId(), fromUser: false, text: summary },
      ]);
    },
    [data, includeEntityContextForPromptRead, t],
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

  const newChat = useCallback(() => {
    if (typing) return;
    startFresh();
  }, [typing, startFresh]);

  const quotaRemaining = data.tokenQuota?.remainingTokens ?? null;
  const noCredits = outOfCredits || (quotaRemaining != null && quotaRemaining <= 0);

  return useMemo(
    () => ({
      messages,
      typing,
      effort,
      setEffort,
      sendText,
      confirmPending,
      rejectPending,
      newChat,
      agentDisplayName,
      quotaRemaining,
      noCredits,
      tt,
    }),
    [messages, typing, effort, setEffort, sendText, confirmPending, rejectPending, newChat, agentDisplayName, quotaRemaining, noCredits, tt],
  );
}
