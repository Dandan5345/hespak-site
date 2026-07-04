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
import { reasoningEmoji } from '../state/types';

const REASONING_LABEL_KEY = { minimal: 'reasoning_minimal', medium: 'reasoning_medium', high: 'reasoning_high', cheap: 'reasoning_cheap' } as const;

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

  const { messages, typing, streamingText, effort, setEffort, sendText, confirmPending, rejectPending, undoChange, newChat, sessions, restoreSession, deleteSession, agentDisplayName, quotaRemaining, noCredits, tt } =
    useChatEngine();

  const [input, setInput] = useState('');
  const [showEffortSheet, setShowEffortSheet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing, streamingText]);

  const handleSend = () => {
    if (!input.trim() || typing || noCredits) return;
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

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 8.5rem)', minHeight: 420 }}>
      {/* header */}
      <div
        className="flex items-center gap-3 px-3 py-3 rounded-t-[var(--sf-radius-lg)]"
        style={{ background: 'var(--sf-nav-bg)', border: `var(--sf-nav-border-width) solid var(--sf-nav-border-color)`, borderBottom: 'none' }}
      >
        <AgentAvatar size={42} tokens={tokens} />
        <div className="flex-1 min-w-0">
          <button onClick={openRename} className="flex items-center gap-1.5 max-w-full" style={{ color: tokens.text }}>
            <span className="font-extrabold text-[15px] truncate">{agentDisplayName}</span>
            <span className="text-xs opacity-60">✎</span>
          </button>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold" style={{ color: typing ? tokens.accent : '#10B981' }}>
              {typing ? t('chat_today') : t('chat_online')}
            </span>
            <span className="text-xs" style={{ color: tokens.textDim }}>
              · {t('chat_tokens_label')}: {quotaRemaining != null ? fmtTokens(quotaRemaining) : '—'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          title={t('chat_history_title')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 relative"
          style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}` }}
        >
          🕘
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
          onClick={newChat}
          title={t('chat_new')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
          style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}` }}
        >
          🆕
        </button>
        <button
          onClick={() => setShowEffortSheet(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-extrabold shrink-0"
          style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}` }}
        >
          <span>{reasoningEmoji(effort)}</span>
          <span className="hidden sm:inline">{t(REASONING_LABEL_KEY[effort])}</span>
        </button>
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
        {typing && streamingText == null && <TypingIndicator tokens={tokens} />}
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
        ) : (
          <div className="flex items-end gap-2">
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
              className="w-11 h-11 rounded-full flex items-center justify-center text-lg shrink-0 disabled:opacity-50"
              style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent, boxShadow: tokens.glow !== 'none' ? tokens.glow : undefined }}
              aria-label={t('chat_placeholder')}
            >
              ➤
            </button>
          </div>
        )}
      </div>

      {showEffortSheet && <ReasoningSheet tokens={tokens} current={effort} onSelect={setEffort} onClose={() => setShowEffortSheet(false)} />}

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" onClick={() => setShowHistory(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
          <div
            className="relative w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[24px] p-5 pb-8 max-h-[70vh] overflow-y-auto"
            style={{ background: tokens.bg2, color: tokens.text }}
            onClick={(e) => e.stopPropagation()}
          >
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
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                      style={{ color: tokens.textDim }}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {renaming && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" onClick={() => setRenaming(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
          <div
            className="relative w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[24px] p-5 pb-8"
            style={{ background: tokens.bg2, color: tokens.text }}
            onClick={(e) => e.stopPropagation()}
          >
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
              className="w-full h-11 rounded-[var(--sf-radius-sm)] font-extrabold"
              style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
            >
              {t('agent_rename_save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
