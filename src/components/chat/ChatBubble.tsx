import { useI18n } from '../../i18n/I18nProvider';
import { useState } from 'react';
import type { SfTokens } from '../../theme/tokens';
import { AgentAvatar } from './AgentAvatar';
import type { LocalChatMessage } from './types';

function fmtTokens(n: number): string {
  if (n <= 0) return '0';
  return n.toLocaleString();
}

interface Props {
  message: LocalChatMessage;
  tokens: SfTokens;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onGoFocus?: () => void;
  onQuickReply?: (text: string) => void;
}

function TokenBreakdown({ usage, tokens }: { usage: NonNullable<LocalChatMessage['tokenUsage']>; tokens: SfTokens }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const reasoning = usage.reasoningTokens ?? 0;
  const writing = Math.max(0, usage.completionTokens - reasoning);
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] font-medium ml-1 mt-0.5"
        style={{ color: tokens.textDim }}
      >
        <span>
          {fmtTokens(usage.completionTokens)} {t('chat_output_tokens')}
          {usage.promptReadTokens > 0 ? ` + ${fmtTokens(usage.promptReadTokens)} ${t('chat_instruction_tokens')}` : ''}
        </span>
        <span style={{ color: tokens.accent, fontSize: 12 }}>ⓘ</span>
      </button>
      {open && (
        <div
          className="mt-1.5 rounded-[var(--sf-radius-sm)] px-3 py-2 text-[11px] leading-relaxed"
          style={{ background: tokens.surface2, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`, color: tokens.textDim }}
        >
          <div>{t('chat_tokens_reasoning')}: {fmtTokens(reasoning)}</div>
          <div>{t('chat_tokens_writing_output')}: {fmtTokens(writing)}</div>
          <div>{t('chat_tokens_output_total')}: {fmtTokens(usage.completionTokens)}</div>
          {usage.promptReadTokens > 0 &&
            (Object.keys(usage.promptReadBreakdown).length > 0 ? (
              Object.entries(usage.promptReadBreakdown).map(([label, count]) => (
                <div key={label}>{t('chat_tokens_instruction_context').replace('{item}', label)}: {fmtTokens(count)}</div>
              ))
            ) : (
              <div>{t('chat_tokens_prompt_read')}: {fmtTokens(usage.promptReadTokens)}</div>
            ))}
          {usage.costMultiplier !== 1 && <div>🔢 {t('chat_multiplier')}: ×{usage.costMultiplier}</div>}
          {usage.historyTokensCharged > 0 && <div>📝 {t('chat_history_portion')}: {fmtTokens(usage.historyTokensCharged)} (10%)</div>}
          <div className="mt-0.5 font-bold">💰 {t('chat_charged')}: {fmtTokens(usage.chargedTokens)}</div>
        </div>
      )}
    </>
  );
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
            boxShadow: mine ? (tokens.glow !== 'none' ? tokens.glow : `0 6px 22px -6px ${tokens.accent}70`) : tokens.cardShadow,
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

        {/* Token display — AI messages show output tokens, user messages show input tokens */}
        {!mine && message.tokenUsage && (
          <TokenBreakdown usage={message.tokenUsage} tokens={tokens} />
        )}
        {mine && (message.inputTokens ?? 0) > 0 && (
          <div className="text-[10px] font-medium mt-0.5 mr-1 opacity-60" style={{ color: tokens.textFaint }}>
            {t('chat_tokens_user_input_line').replace('{count}', fmtTokens(message.inputTokens ?? 0))}
          </div>
        )}

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
