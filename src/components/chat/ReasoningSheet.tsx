import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { SfTokens } from '../../theme/tokens';
import { isProEffort, reasoningCostBadge, reasoningEmoji, type ReasoningEffort } from '../../state/types';
import { BottomSheet } from './BottomSheet';

// Cheapest/fastest → priciest/deepest. Mirror of ReasoningEffort.values order
// in the app's lib/state/models.dart.
const NORMAL_EFFORTS: ReasoningEffort[] = ['cheap', 'minimal', 'medium', 'high', 'expert', 'max'];
// Pro mode ("הפעל פרו"): three thinking levels on the DeepSeek pro model
// (×2.5) + the top OpenRouter pro model (×3).
const PRO_DEEPSEEK_EFFORTS: ReasoningEffort[] = ['proSmart', 'proDeep', 'proExpert'];
const PRO_OPENROUTER_EFFORTS: ReasoningEffort[] = ['proMax'];

const LABEL_KEY: Record<ReasoningEffort, string> = {
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
};
const HINT_KEY: Record<ReasoningEffort, string> = {
  cheap: 'reasoning_cheap_hint',
  minimal: 'reasoning_minimal_hint',
  medium: 'reasoning_medium_hint',
  high: 'reasoning_high_hint',
  expert: 'reasoning_expert_hint',
  max: 'reasoning_max_hint',
  proSmart: 'reasoning_pro_smart_hint',
  proDeep: 'reasoning_pro_deep_hint',
  proExpert: 'reasoning_pro_expert_hint',
  proMax: 'reasoning_pro_max_hint',
};

interface Props {
  tokens: SfTokens;
  current: ReasoningEffort;
  onSelect: (e: ReasoningEffort) => void;
  onClose: () => void;
}

function EffortRow({
  effort,
  selected,
  tokens,
  onPick,
}: {
  effort: ReasoningEffort;
  selected: boolean;
  tokens: SfTokens;
  onPick: (e: ReasoningEffort) => void;
}) {
  const { t } = useI18n();
  const badge = reasoningCostBadge(effort);
  return (
    <button
      onClick={() => onPick(effort)}
      className="flex items-center gap-3 rounded-[var(--sf-radius-sm)] px-4 py-3 text-start w-full"
      style={{
        background: selected ? tokens.accentSoft : tokens.surface,
        border: `${selected ? 2 : 1}px solid ${selected ? tokens.accent : tokens.navBorderColor}`,
      }}
    >
      <span className="text-xl">{reasoningEmoji(effort)}</span>
      <span className="flex-1">
        <span className="block text-sm font-extrabold">{t(LABEL_KEY[effort])}</span>
        <span className="block text-xs mt-0.5" style={{ color: tokens.textDim }}>
          {t(HINT_KEY[effort])}
        </span>
      </span>
      {badge && (
        <span
          className="text-[11px] font-extrabold rounded-full px-2 py-1"
          style={{ background: tokens.surface2, color: tokens.textDim }}
        >
          {badge}
        </span>
      )}
      {selected && (
        <span className="text-lg" style={{ color: tokens.accent }}>
          ✓
        </span>
      )}
    </button>
  );
}

/** Bottom-sheet-style picker for the chat model + reasoning depth, mirrors
 * _showEffortPicker in chat_screen.dart. The "הפעל פרו" toggle switches the
 * list to the pro models (DeepSeek V4 Pro ×2.5 / Gemma 4 31B ×3). */
export function ReasoningSheet({ tokens, current, onSelect, onClose }: Props) {
  const { t } = useI18n();
  const [pro, setPro] = useState(isProEffort(current));

  const pick = (e: ReasoningEffort) => {
    onSelect(e);
    onClose();
  };

  const sectionLabel = (text: string) => (
    <div className="text-[11px] font-extrabold uppercase tracking-wide mt-1 mb-0.5" style={{ color: tokens.textFaint }}>
      {text}
    </div>
  );

  return (
    <BottomSheet tokens={tokens} onClose={onClose}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="text-lg font-extrabold">{t('chat_thinking_title')}</h2>
          <p className="text-sm" style={{ color: tokens.textDim }}>
            {pro ? t('chat_pro_desc') : t('chat_thinking_desc')}
          </p>
        </div>
        {/* Pro toggle — the model lists below swap when it's on. */}
        <button
          onClick={() => setPro(!pro)}
          className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-extrabold"
          style={
            pro
              ? { background: 'var(--sf-accent-gradient)', color: tokens.onAccent, border: 'none' }
              : { background: tokens.surface, color: tokens.text, border: `1px solid ${tokens.navBorderColor}` }
          }
        >
          <span>💎</span>
          <span>{pro ? t('chat_pro_on') : t('chat_pro_activate')}</span>
        </button>
      </div>

      <div className="flex flex-col gap-2 mt-3">
        {pro ? (
          <>
            {sectionLabel('DeepSeek V4 Pro · ×2.5')}
            {PRO_DEEPSEEK_EFFORTS.map((e) => (
              <EffortRow key={e} effort={e} selected={e === current} tokens={tokens} onPick={pick} />
            ))}
            {sectionLabel('Gemma 4 31B · ×3')}
            {PRO_OPENROUTER_EFFORTS.map((e) => (
              <EffortRow key={e} effort={e} selected={e === current} tokens={tokens} onPick={pick} />
            ))}
          </>
        ) : (
          NORMAL_EFFORTS.map((e) => (
            <EffortRow key={e} effort={e} selected={e === current} tokens={tokens} onPick={pick} />
          ))
        )}
      </div>
    </BottomSheet>
  );
}
