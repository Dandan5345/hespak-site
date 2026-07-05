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
import { reasoningEmoji } from '../state/types';

const REASONING_LABEL_KEY = {
  cheap: 'reasoning_cheap',
  minimal: 'reasoning_minimal',
  medium: 'reasoning_medium',
  high: 'reasoning_high',
  expert: 'reasoning_expert',
  max: 'reasoning_max',
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
    confirmPending, rejectPending, undoChange, newChat, sessions, restoreSession, deleteSession,
    agentDisplayName, quotaRemaining, noCredits, contextTokens, contextLimit, memoryFull, tt,
  } = useChatEngine();

  const [input, setInput] = useState('');
  const [showEffortSheet, setShowEffortSheet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
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

  // Conversation-memory meter (16K limit): green→amber→red as it fills up.
  const memPct = Math.min(100, Math.round((contextTokens / contextLimit) * 100));
  const memNear = !memoryFull && memPct >= 90;
  const memColor = memoryFull ? '#EF4444' : memPct >= 85 ? '#F59E0B' : tokens.accent;

  const iconBtn = {
    background: tokens.surface,
    border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`,
    color: tokens.text,
  } as const;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 8.5rem)', minHeight: 420 }}>
      {/* header */}
      <div
        className="rounded-t-[var(--sf-radius-lg)] overflow-hidden"
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
          <button
            onClick={() => setShowEffortSheet(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-extrabold shrink-0 sf-press"
            style={iconBtn}
          >
            <span>{reasoningEmoji(effort)}</span>
            <span className="hidden sm:inline">{t(REASONING_LABEL_KEY[effort])}</span>
          </button>
        </div>
        {/* conversation-memory meter (16K tokens per chat) */}
        <div
          className="h-[3px] w-full"
          title={`${t('chat_memory_label')}: ${fmtTokens(contextTokens)} / ${fmtTokens(contextLimit)}`}
          style={{ background: tokens.ringTrack }}
        >
          <div className="h-full transition-all duration-500" style={{ width: `${memPct}%`, background: memColor }} />
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
        {memNear && (
          <div
            className="mb-2 rounded-[var(--sf-radius-sm)] px-3 py-2 text-xs font-semibold text-center"
            style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#F59E0B' }}
          >
            {t('chat_memory_near')}
          </div>
        )}
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
            <button
              onClick={newChat}
              className="h-10 px-5 rounded-full text-sm font-extrabold sf-press"
              style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent, boxShadow: tokens.glow !== 'none' ? tokens.glow : undefined }}
            >
              {t('chat_memory_new_chat')}
            </button>
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
