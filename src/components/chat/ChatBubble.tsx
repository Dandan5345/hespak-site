import { useI18n } from '../../i18n/I18nProvider';
import type { SfTokens } from '../../theme/tokens';
import { AgentAvatar } from './AgentAvatar';
import type { LocalChatMessage } from './types';

interface Props {
  message: LocalChatMessage;
  tokens: SfTokens;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onGoFocus?: () => void;
  onQuickReply?: (text: string) => void;
}

export function ChatBubble({ message, tokens, onApprove, onReject, onGoFocus, onQuickReply }: Props) {
  const { t } = useI18n();
  const mine = message.fromUser;

  return (
    <div className={`flex mb-3 ${mine ? 'justify-end' : 'justify-start items-end gap-2'}`}>
      {!mine && <AgentAvatar size={30} tokens={tokens} />}
      <div className="flex flex-col" style={{ maxWidth: '76%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
        <div
          className="px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words"
          style={{
            background: mine ? 'var(--sf-accent-gradient)' : tokens.surface,
            color: mine ? tokens.onAccent : tokens.text,
            border: mine ? 'none' : `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`,
            boxShadow: mine ? tokens.glow : tokens.cardShadow,
            borderStartStartRadius: 20,
            borderStartEndRadius: 20,
            borderEndStartRadius: mine ? 20 : 6,
            borderEndEndRadius: mine ? 6 : 20,
          }}
        >
          {message.text}

          {message.pending && message.pending.resolved === 'pending' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onApprove(message.id)}
                className="flex-1 h-9 rounded-[var(--sf-radius-sm)] text-[13px] font-extrabold"
                style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
              >
                {t('chat_confirm_change')}
              </button>
              <button
                onClick={() => onReject(message.id)}
                className="flex-1 h-9 rounded-[var(--sf-radius-sm)] text-[13px] font-extrabold"
                style={{ background: 'var(--sf-bg2)', color: tokens.text, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}` }}
              >
                {t('chat_reject_change')}
              </button>
            </div>
          )}
          {message.pending && message.pending.resolved === 'approved' && (
            <div className="mt-2 text-xs font-semibold" style={{ color: tokens.accent }}>
              ✓ {t('chat_confirm_change')}
            </div>
          )}
          {message.pending && message.pending.resolved === 'rejected' && (
            <div className="mt-2 text-xs font-semibold" style={{ color: tokens.textFaint }}>
              ✗ {t('chat_reject_change')}
            </div>
          )}

          {message.focusMinutes != null && onGoFocus && (
            <button
              onClick={onGoFocus}
              className="mt-3 w-full h-9 rounded-[var(--sf-radius-sm)] text-[13px] font-extrabold"
              style={{ background: mine ? tokens.onAccent : 'var(--sf-accent-gradient)', color: mine ? tokens.accent : tokens.onAccent }}
            >
              🎯 {t('focus_mode')}
            </button>
          )}
        </div>

        {!mine && message.quickReplies && message.quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.quickReplies.map((label) => (
              <button
                key={label}
                onClick={() => onQuickReply?.(label)}
                className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: tokens.accentSoft, color: tokens.accent, border: `1px solid ${tokens.accent}` }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
