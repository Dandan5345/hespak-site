import { useI18n } from '../../i18n/I18nProvider';
import type { SfTokens } from '../../theme/tokens';
import { reasoningEmoji, type ReasoningEffort } from '../../state/types';
import { BottomSheet } from './BottomSheet';

const EFFORTS: ReasoningEffort[] = ['minimal', 'medium', 'high', 'cheap'];
const LABEL_KEY: Record<ReasoningEffort, string> = {
  minimal: 'reasoning_minimal',
  medium: 'reasoning_medium',
  high: 'reasoning_high',
  cheap: 'reasoning_cheap',
};
const HINT_KEY: Record<ReasoningEffort, string> = {
  minimal: 'reasoning_minimal_hint',
  medium: 'reasoning_medium_hint',
  high: 'reasoning_high_hint',
  cheap: 'reasoning_cheap_hint',
};

interface Props {
  tokens: SfTokens;
  current: ReasoningEffort;
  onSelect: (e: ReasoningEffort) => void;
  onClose: () => void;
}

/** Bottom-sheet-style picker for the chat reasoning depth, mirrors
 * _showEffortPicker in chat_screen.dart. */
export function ReasoningSheet({ tokens, current, onSelect, onClose }: Props) {
  const { t } = useI18n();
  return (
    <BottomSheet tokens={tokens} onClose={onClose}>
      <h2 className="text-lg font-extrabold mb-1">{t('chat_thinking_title')}</h2>
        <p className="text-sm mb-4" style={{ color: tokens.textDim }}>
          {t('chat_thinking_desc')}
        </p>
        <div className="flex flex-col gap-2.5">
          {EFFORTS.map((e) => {
            const selected = e === current;
            return (
              <button
                key={e}
                onClick={() => {
                  onSelect(e);
                  onClose();
                }}
                className="flex items-center gap-3 rounded-[var(--sf-radius-sm)] px-4 py-3.5 text-start"
                style={{
                  background: selected ? tokens.accentSoft : tokens.surface,
                  border: `${selected ? 2 : 1}px solid ${selected ? tokens.accent : tokens.navBorderColor}`,
                }}
              >
                <span className="text-xl">{reasoningEmoji(e)}</span>
                <span className="flex-1">
                  <span className="block text-sm font-extrabold">{t(LABEL_KEY[e])}</span>
                  <span className="block text-xs mt-0.5" style={{ color: tokens.textDim }}>
                    {t(HINT_KEY[e])}
                  </span>
                </span>
                {selected && (
                  <span className="text-lg" style={{ color: tokens.accent }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
    </BottomSheet>
  );
}
