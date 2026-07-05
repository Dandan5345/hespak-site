import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { SfTokens } from '../../theme/tokens';
import { isProEffort, reasoningCostBadge, reasoningEmoji, type ChatModelFamily, type ReasoningEffort } from '../../state/types';
import { BottomSheet } from './BottomSheet';

// Cheapest/fastest → deepest. Mirror of ReasoningEffort.values order
// in the app's lib/state/models.dart.
const NORMAL_EFFORTS: ReasoningEffort[] = ['cheap', 'minimal', 'medium', 'high', 'expert', 'max'];
const GPT_EFFORTS: ReasoningEffort[] = ['minimal', 'medium', 'high', 'expert', 'max'];
const GEMINI_EFFORTS: ReasoningEffort[] = ['minimal', 'medium', 'high', 'expert'];
// Pro mode ("הפעל פרו"): three thinking levels on the DeepSeek pro model (×2.5).
const PRO_DEEPSEEK_EFFORTS: ReasoningEffort[] = ['proSmart', 'proDeep', 'proExpert'];

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
};

interface Props {
  tokens: SfTokens;
  current: ReasoningEffort;
  modelFamily: ChatModelFamily;
  geminiPro: boolean;
  onSelect: (e: ReasoningEffort) => void;
  onSelectModelFamily: (family: ChatModelFamily) => void;
  onSelectGeminiPro: (enabled: boolean) => void;
  onClose: () => void;
}

function EffortRow({
  effort,
  selected,
  family,
  geminiPro,
  tokens,
  onPick,
}: {
  effort: ReasoningEffort;
  selected: boolean;
  family: ChatModelFamily;
  geminiPro: boolean;
  tokens: SfTokens;
  onPick: (e: ReasoningEffort) => void;
}) {
  const { t } = useI18n();
  const badge = reasoningCostBadge(effort, family, geminiPro);
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
 * _showEffortPicker in chat_screen.dart. The top switch chooses the model
 * family; DeepSeek and Gemini have their own Pro toggles. */
export function ReasoningSheet({
  tokens,
  current,
  modelFamily,
  geminiPro,
  onSelect,
  onSelectModelFamily,
  onSelectGeminiPro,
  onClose,
}: Props) {
  const { t } = useI18n();
  const [pro, setPro] = useState(
    modelFamily === 'gemini' ? geminiPro : modelFamily === 'deepseek' && isProEffort(current),
  );

  const pick = (e: ReasoningEffort) => {
    onSelect(e);
    onClose();
  };

  const switchFamily = (family: ChatModelFamily) => {
    onSelectModelFamily(family);
    if (family === 'gpt') setPro(false);
    else if (family === 'gemini') setPro(geminiPro);
    else setPro(isProEffort(current));
  };

  const togglePro = () => {
    const next = !pro;
    setPro(next);
    if (modelFamily === 'gemini') onSelectGeminiPro(next);
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
            {modelFamily === 'gpt'
              ? t('chat_gpt_desc')
              : modelFamily === 'gemini'
                ? pro
                  ? t('chat_gemini_pro_desc')
                  : t('chat_gemini_desc')
                : pro
                  ? t('chat_pro_desc')
                  : t('chat_thinking_desc')}
          </p>
        </div>
        {(modelFamily === 'deepseek' || modelFamily === 'gemini') && (
          <button
            onClick={togglePro}
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
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        {(['deepseek', 'gpt', 'gemini'] as ChatModelFamily[]).map((family) => {
          const selected = modelFamily === family;
          return (
            <button
              key={family}
              type="button"
              onClick={() => switchFamily(family)}
              className="h-10 rounded-full text-[13px] font-extrabold sf-press"
              style={{
                background: selected ? 'var(--sf-accent-gradient)' : tokens.surface,
                color: selected ? tokens.onAccent : tokens.text,
                border: selected ? 'none' : `1px solid ${tokens.navBorderColor}`,
                boxShadow: selected && tokens.glow !== 'none' ? tokens.glow : undefined,
              }}
            >
              {t(
                family === 'deepseek'
                  ? 'chat_model_deepseek'
                  : family === 'gpt'
                    ? 'chat_model_gpt'
                    : 'chat_model_gemini',
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 mt-3">
        {modelFamily === 'gpt' ? (
          <>
            {sectionLabel('GPT-5.4 mini · ×2.5')}
            {GPT_EFFORTS.map((e) => (
              <EffortRow key={e} effort={e} family="gpt" geminiPro={false} selected={e === current} tokens={tokens} onPick={pick} />
            ))}
          </>
        ) : modelFamily === 'gemini' ? (
          <>
            {sectionLabel(pro ? 'Gemini 3.5 Flash · ×2.5' : 'Gemini Flash-Lite')}
            {GEMINI_EFFORTS.map((e) => (
              <EffortRow key={e} effort={e} family="gemini" geminiPro={pro} selected={e === current} tokens={tokens} onPick={pick} />
            ))}
          </>
        ) : pro ? (
          <>
            {sectionLabel('DeepSeek V4 Pro · ×2.5')}
            {PRO_DEEPSEEK_EFFORTS.map((e) => (
              <EffortRow key={e} effort={e} family="deepseek" geminiPro={false} selected={e === current} tokens={tokens} onPick={pick} />
            ))}
          </>
        ) : (
          <>
            {sectionLabel('Mistral + DeepSeek')}
            {NORMAL_EFFORTS.map((e) => (
              <EffortRow key={e} effort={e} family="deepseek" geminiPro={false} selected={e === current} tokens={tokens} onPick={pick} />
            ))}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
