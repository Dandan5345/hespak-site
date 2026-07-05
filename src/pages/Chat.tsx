import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useSfTheme } from '../theme/ThemeProvider';
import { useData } from '../state/DataContext';
import { useChatEngine } from '../components/chat/useChatEngine';
import { ChatBubble } from '../components/chat/ChatBubble';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { ReasoningSheet } from '../components/chat/ReasoningSheet';
import { AgentAvatar } from '../components/chat/AgentAvatar';
import { BottomSheet } from '../components/chat/BottomSheet';
import { TaskPickerSheet } from '../components/chat/TaskPickerSheet';
import { SendIcon, HistoryIcon, NewChatIcon, EditIcon, PaperclipIcon, TrashIcon } from '../components/chat/icons';
import { ProgressRing } from '../components/focus/ProgressRing';
import { reasoningEmoji } from '../state/types';

const REASONING_LABEL_KEY = {
  cheap: 'reasoning_cheap',
  minimal: 'reasoning_minimal',
  medium: 'reasoning_medium',
  high: 'reasoning_high',
  expert: 'reasoning_expert',
  max: 'reasoning_max',
  proSmart: 'reasoning_pro_smart',
  proDeep: 'reasoning_pro_deep',
  proExpert: 'reasoning_pro_expert',
  proMax: 'reasoning_pro_max',
} as const;

function fmtTokens(n: number): string {
  if (n <= 0) return '0';
  return n.toLocaleString();
}

/** Web analogue of lib/screens/chat_screen.dart: the AI agent chat — the
 * centerpiece feature. See src/components/chat/useChatEngine.ts for the
 * message-assembly / action-protocol logic that mirrors AppController. */
export default function Chat() {
  const { t, dir, lang } = useI18n();
  const { tokens } = useSfTheme();
  const { agentName, setAgentName } = useData();
  const navigate = useNavigate();

  const {
    messages, typing, typingStatus, streamingText, effort, setEffort, sendText, attachTasks,
    confirmPending, rejectPending, undoChange, newChat, summarizeChat, sessions, restoreSession, deleteSession,
    agentDisplayName, quotaRemaining, noCredits, contextTokens, contextLimit, memoryFull, tt,
  } = useChatEngine();

  const [input, setInput] = useState('');
  const [showEffortSheet, setShowEffortSheet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showMemoryDetails, setShowMemoryDetails] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing, streamingText]);

  const handleSend = () => {
    if (!input.trim() || typing || noCredits || memoryFull) return;
    sendText(input);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openRename = () => {
    setRenameValue(agentName);
    setRenaming(true);
  };
  const saveRename = () => {
    setAgentName(renameValue);
    setRenaming(false);
  };

  // Conversation-memory meter: fills as context is used, while the center shows
  // how much room is left.
  const memPct = Math.min(100, Math.round((contextTokens / contextLimit) * 100));
  const memRemainingPct = Math.max(0, 100 - memPct);
  const memNeedsAttention = memPct >= 70;
  const memCritical = memPct >= 90;
  const memColor = memoryFull || memCritical ? '#EF4444' : memNeedsAttention ? '#F59E0B' : '#10B981';
  const memColorEnd = memoryFull || memCritical ? '#FB7185' : memNeedsAttention ? '#FBBF24' : '#34D399';
  const memShadow = memNeedsAttention ? `0 0 18px ${memColor}55` : undefined;

  const iconBtn = {
    background: tokens.surface,
    border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`,
    color: tokens.text,
  } as const;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 8.5rem)', minHeight: 420 }}>
      {/* header */}
      <div
        className="rounded-t-[var(--sf-radius-lg)] overflow-visible"
        style={{ background: 'var(--sf-nav-bg)', border: `var(--sf-nav-border-width) solid var(--sf-nav-border-color)`, borderBottom: 'none' }}
      >
        <div className="flex items-center gap-3 px-3 pt-3 pb-2.5">
          <div className="relative shrink-0">
            <AgentAvatar size={42} tokens={tokens} />
            {/* online dot */}
            <span
              className="absolute w-3 h-3 rounded-full"
              style={{ bottom: 0, insetInlineEnd: 0, background: typing ? tokens.accent : '#10B981', border: `2px solid ${tokens.bg2}` }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <button onClick={openRename} className="flex items-center gap-1.5 max-w-full" style={{ color: tokens.text }}>
              <span className="font-extrabold text-[15px] truncate">{agentDisplayName}</span>
              <span style={{ color: tokens.textDim }}>
                <EditIcon size={13} />
              </span>
            </button>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold" style={{ color: typing ? tokens.accent : '#10B981' }}>
                {typing ? t('chat_today') : t('chat_online')}
              </span>
              <span className="text-xs truncate" style={{ color: tokens.textDim }}>
                · {t('chat_tokens_label')}: {quotaRemaining != null ? fmtTokens(quotaRemaining) : '—'}
              </span>
            </div>
          </div>
          <button onClick={newChat} title={t('chat_new')} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 sf-press" style={iconBtn}>
            <NewChatIcon />
          </button>
          <button
            onClick={() => setShowHistory(true)}
            title={t('chat_history_title')}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative sf-press"
            style={{
              ...iconBtn,
              background: sessions.length > 0 ? tokens.accentSoft : tokens.surface,
              color: sessions.length > 0 ? tokens.accent : tokens.text,
            }}
          >
            <HistoryIcon />
            {sessions.length > 0 && (
              <span
                className="absolute min-w-[16px] h-4 px-1 rounded-full text-[10px] font-black flex items-center justify-center"
                style={{ top: -4, insetInlineEnd: -4, background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
              >
                {sessions.length}
              </span>
            )}
          </button>
          <div className="relative hidden sm:block shrink-0">
            <button
              type="button"
              onClick={() => setShowMemoryDetails((v) => !v)}
              aria-expanded={showMemoryDetails}
              aria-label={t('chat_memory_label')}
              title={`${t('chat_memory_label')}: ${fmtTokens(contextTokens)} / ${fmtTokens(contextLimit)}`}
              className="w-9 h-9 rounded-full flex items-center justify-center sf-press"
              style={{
                background: tokens.surface,
                border: `${tokens.cardBorderWidth}px solid ${memNeedsAttention ? `${memColor}88` : tokens.cardBorderColor}`,
                boxShadow: memShadow,
              }}
            >
              <ProgressRing
                size={28}
                stroke={3}
                progress={memPct / 100}
                track={tokens.ringTrack}
                colorStart={memColor}
                colorEnd={memColorEnd}
                glow={memShadow}
              >
                <span className="text-[8px] font-black leading-none" style={{ color: memColor }}>
                  {memRemainingPct}%
                </span>
              </ProgressRing>
            </button>
            {showMemoryDetails && (
              <div
                className="absolute z-30 mt-2 w-[286px] rounded-[var(--sf-radius-sm)] p-3 text-start"
                style={{
                  insetInlineEnd: 0,
                  background: tokens.surface,
                  border: `${tokens.cardBorderWidth}px solid ${memNeedsAttention ? `${memColor}66` : tokens.cardBorderColor}`,
                  boxShadow: memNeedsAttention ? `0 18px 42px -18px ${memColor}` : tokens.cardShadow,
                  color: tokens.text,
                }}
              >
                <div className="flex items-center gap-3">
                  <ProgressRing
                    size={42}
                    stroke={5}
                    progress={memPct / 100}
                    track={tokens.ringTrack}
                    colorStart={memColor}
                    colorEnd={memColorEnd}
                    glow={memShadow}
                  >
                    <span className="text-[10px] font-black leading-none" style={{ color: memColor }}>
                      {memRemainingPct}%
                    </span>
                  </ProgressRing>
                  <div className="min-w-0">
                    <div className="text-[13px] font-black" style={{ color: tokens.text }}>
                      {t('chat_memory_label')}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold" style={{ color: tokens.textDim }}>
                      {t('chat_context_remaining')
                        .replace('{percent}', `${memRemainingPct}`)
                        .replace('{used}', fmtTokens(contextTokens))
                        .replace('{limit}', fmtTokens(contextLimit))}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] leading-relaxed font-medium" style={{ color: tokens.textDim }}>
                  {t('chat_memory_explain')}
                </div>
                {memNeedsAttention && !memoryFull && (
                  <div className="mt-2">
                    <div className="mb-2 text-[11px] font-bold" style={{ color: memColor }}>
                      {t(memCritical ? 'chat_context_critical' : 'chat_context_warning')}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMemoryDetails(false);
                        void summarizeChat();
                      }}
                      disabled={typing}
                      className="h-8 w-full rounded-full text-[11px] font-black sf-press disabled:opacity-50"
                      style={{
                        background: memCritical ? '#EF4444' : memColor,
                        color: '#FFFFFF',
                        boxShadow: memShadow,
                      }}
                    >
                      {t('chat_memory_summarize_now')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowEffortSheet(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-extrabold shrink-0 sf-press"
            style={iconBtn}
          >
            <span>{reasoningEmoji(effort)}</span>
            <span className="hidden sm:inline">{t(REASONING_LABEL_KEY[effort])}</span>
          </button>
        </div>
        <div className="px-3 pb-3 sm:hidden">
          <div
            className="flex items-center gap-3 rounded-[var(--sf-radius-sm)] px-3 py-2"
            title={`${t('chat_memory_label')}: ${fmtTokens(contextTokens)} / ${fmtTokens(contextLimit)}`}
            style={{
              background: tokens.surface,
              border: `${tokens.cardBorderWidth}px solid ${memNeedsAttention ? `${memColor}66` : tokens.cardBorderColor}`,
              boxShadow: memNeedsAttention ? `0 10px 28px -18px ${memColor}` : undefined,
            }}
          >
            <div className="shrink-0">
              <ProgressRing
                size={46}
                stroke={5}
                progress={memPct / 100}
                track={tokens.ringTrack}
                colorStart={memColor}
                colorEnd={memColorEnd}
                glow={memShadow}
              >
                <div className="text-center leading-none">
                  <div className="text-[11px] font-black" style={{ color: memColor }}>
                    {memRemainingPct}%
                  </div>
                  <div className="text-[8px] font-extrabold mt-0.5" style={{ color: tokens.textFaint }}>
                    {t('chat_context_left_short')}
                  </div>
                </div>
              </ProgressRing>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black" style={{ color: tokens.text }}>
                  {t('chat_context_title')}
                </span>
                {memNeedsAttention && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: memColor, boxShadow: memShadow }} />
                )}
              </div>
              <div className="mt-0.5 text-[11px] font-semibold truncate" style={{ color: tokens.textDim }}>
                {t('chat_context_remaining')
                  .replace('{percent}', `${memRemainingPct}`)
                  .replace('{used}', fmtTokens(contextTokens))
                  .replace('{limit}', fmtTokens(contextLimit))}
              </div>
              {memNeedsAttention && !memoryFull && (
                <div className="mt-0.5 text-[10px] font-bold truncate" style={{ color: memColor }}>
                  {t(memCritical ? 'chat_context_critical' : 'chat_context_warning')}
                </div>
              )}
            </div>
            {memNeedsAttention && !memoryFull && (
              <button
                type="button"
                onClick={() => void summarizeChat()}
                disabled={typing}
                className="h-8 px-3 rounded-full text-[11px] font-black shrink-0 sf-press disabled:opacity-50"
                style={{
                  background: memCritical ? '#EF4444' : memColor,
                  color: '#FFFFFF',
                  boxShadow: memShadow,
                }}
              >
                {t('chat_memory_summarize_now')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4"
        style={{
          background: 'var(--sf-surface2)',
          borderInlineStart: `var(--sf-nav-border-width) solid var(--sf-nav-border-color)`,
          borderInlineEnd: `var(--sf-nav-border-width) solid var(--sf-nav-border-color)`,
        }}
      >
        <div className="flex justify-center mb-4">
          <span
            className="px-3.5 py-1 rounded-full text-xs font-bold"
            style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`, color: tokens.textDim }}
          >
            {t('chat_today')}
          </span>
        </div>
        {messages.map((m) => (
          <ChatBubble
            key={m.id}
            message={m}
            tokens={tokens}
            onApprove={confirmPending}
            onReject={rejectPending}
            onUndo={undoChange}
            onGoFocus={() => navigate('/focus')}
            onQuickReply={(label) => setInput(label)}
          />
        ))}
        {/* The agent writing: reveal the reply gradually, like the app. */}
        {streamingText != null && (
          <ChatBubble
            key="streaming"
            message={{ id: 'streaming', fromUser: false, text: streamingText || '▍' }}
            tokens={tokens}
            onApprove={confirmPending}
            onReject={rejectPending}
          />
        )}
        {/* Thinking dots only while waiting for the reply — not while writing. */}
        {typing && streamingText == null && <TypingIndicator tokens={tokens} status={typingStatus} />}
      </div>

      {/* composer */}
      <div
        className="p-3 rounded-b-[var(--sf-radius-lg)]"
        style={{ background: 'var(--sf-nav-bg)', border: `var(--sf-nav-border-width) solid var(--sf-nav-border-color)`, borderTop: 'none' }}
      >
        {noCredits ? (
          <div
            className="rounded-[var(--sf-radius-sm)] px-4 py-3 text-sm font-semibold text-center"
            style={{ background: tokens.accentSoft, color: tokens.accent }}
          >
            {tt('chat_quota_exhausted_web')}
          </div>
        ) : memoryFull ? (
          <div
            className="rounded-[var(--sf-radius-sm)] px-4 py-3 text-center"
            style={{ background: tokens.accentSoft }}
          >
            <div className="text-sm font-semibold mb-2.5" style={{ color: tokens.text }}>
              {t('chat_memory_full')}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {/* Summarize-and-compact keeps the conversation going: the model
                  writes a brief, and the thread continues as summary + last 10
                  messages (the full chat is archived to the history). */}
              <button
                onClick={() => void summarizeChat()}
                disabled={typing}
                className="h-10 px-5 rounded-full text-sm font-extrabold sf-press disabled:opacity-50"
                style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent, boxShadow: tokens.glow !== 'none' ? tokens.glow : undefined }}
              >
                {t('chat_memory_summarize')}
              </button>
              <button
                onClick={newChat}
                disabled={typing}
                className="h-10 px-5 rounded-full text-sm font-extrabold sf-press disabled:opacity-50"
                style={{ background: tokens.surface, color: tokens.text, border: `1px solid ${tokens.navBorderColor}` }}
              >
                {t('chat_memory_new_chat')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowTaskPicker(true)}
              title={t('chat_pick_tasks')}
              disabled={typing}
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 sf-press"
              style={iconBtn}
            >
              <PaperclipIcon />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              dir={dir}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('chat_placeholder')}
              rows={1}
              className="flex-1 resize-none rounded-[24px] px-4 py-2.5 text-[15px] outline-none"
              style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`, color: tokens.text, maxHeight: 120 }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || typing}
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 sf-press"
              style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent, boxShadow: tokens.glow !== 'none' ? tokens.glow : undefined }}
              aria-label={t('chat_placeholder')}
            >
              <span style={{ transform: dir === 'rtl' ? 'scaleX(-1)' : undefined, display: 'inline-flex' }}>
                <SendIcon />
              </span>
            </button>
          </div>
        )}
      </div>

      {showEffortSheet && <ReasoningSheet tokens={tokens} current={effort} onSelect={setEffort} onClose={() => setShowEffortSheet(false)} />}

      {showTaskPicker && <TaskPickerSheet tokens={tokens} onAttach={attachTasks} onClose={() => setShowTaskPicker(false)} />}

      {showHistory && (
        <BottomSheet tokens={tokens} onClose={() => setShowHistory(false)}>
          <h2 className="text-lg font-extrabold mb-3">{t('chat_history_title')}</h2>
          {sessions.length === 0 ? (
            <div className="text-sm py-6 text-center" style={{ color: tokens.textDim }}>
              {t('chat_history_empty')}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-[var(--sf-radius-sm)] p-2"
                  style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}` }}
                >
                  <button
                    onClick={() => {
                      restoreSession(s.id);
                      setShowHistory(false);
                    }}
                    title={t('chat_history_restore')}
                    className="flex-1 min-w-0 text-start"
                  >
                    <div className="text-[14px] font-bold truncate">{s.title || t('chat_new')}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: tokens.textDim }}>
                      {new Date(s.createdAt).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteSession(s.id)}
                    title={t('chat_history_delete')}
                    aria-label={t('chat_history_delete')}
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 sf-press"
                    style={{ color: tokens.textDim }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </BottomSheet>
      )}

      {renaming && (
        <BottomSheet tokens={tokens} onClose={() => setRenaming(false)}>
          <h2 className="text-lg font-extrabold mb-3">{t('agent_rename_title')}</h2>
          <input
            autoFocus
            dir={dir}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveRename()}
            placeholder={t('agent_rename_hint')}
            className="w-full rounded-[var(--sf-radius-sm)] px-4 py-2.5 text-[15px] outline-none mb-4"
            style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`, color: tokens.text }}
          />
          <button
            onClick={saveRename}
            className="w-full h-11 rounded-[var(--sf-radius-sm)] font-extrabold sf-press"
            style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
          >
            {t('agent_rename_save')}
          </button>
        </BottomSheet>
      )}
    </div>
  );
}
