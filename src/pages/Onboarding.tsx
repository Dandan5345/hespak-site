import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { markOnboarded } from '../App';
import { useI18n, LANGUAGES } from '../i18n/I18nProvider';
import { useSfTheme } from '../theme/ThemeProvider';
import { ThemeGrid, DarkModeToggle } from '../components/settings/ThemePicker';
import { PrimaryButton } from '../components/onboarding/PrimaryButton';
import { SignInPanel } from '../components/onboarding/SignInPanel';

// Small local strings not already present in src/i18n/strings.ts — see the
// project convention for why these live here instead of the shared table.
const EXTRA: Record<string, Record<string, string>> = {
  continue_without_signin: { he: 'המשך בלי להתחבר', en: 'Continue without signing in' },
};

const STEP_COUNT = 4;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { t, lang } = useI18n();
  const { tokens } = useSfTheme();
  const navigate = useNavigate();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);

  const finish = () => {
    markOnboarded();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10" style={{ color: tokens.text }}>
      <div className="w-full max-w-sm flex flex-col" style={{ minHeight: 'min(640px, 88vh)' }}>
        <div className="h-6 flex items-center">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="text-sm font-bold"
              style={{ color: tokens.textDim }}
            >
              {lang === 'he' ? `${t('back')} →` : `← ${t('back')}`}
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col mt-2">
          {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
          {step === 1 && <LanguageStep onNext={() => setStep(2)} />}
          {step === 2 && <ThemeStep onNext={() => setStep(3)} />}
          {step === 3 && <SignInStep onDone={finish} skipLabel={tt('continue_without_signin')} />}
        </div>

        <div className="flex items-center justify-center gap-[7px] mt-6">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 22 : 7,
                height: 7,
                background: i === step ? tokens.accent : tokens.textFaint,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  const { tokens } = useSfTheme();
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        <div
          className="w-[112px] h-[112px] rounded-[32px] flex items-center justify-center text-5xl"
          style={{
            background: 'var(--sf-accent-gradient)',
            boxShadow: tokens.glow !== 'none' ? tokens.glow : `0 24px 50px -12px ${tokens.accent}80`,
          }}
        >
          📚
        </div>
        <div className="flex items-center justify-center gap-2 text-lg">
          <span>✨</span>
          <span>🎯</span>
          <span>💪</span>
        </div>
        <h1 className="text-[38px] font-extrabold tracking-tight leading-none">📘 הספק</h1>
        <p
          className="max-w-[250px] text-lg font-medium whitespace-pre-line leading-snug"
          style={{ color: tokens.textDim }}
        >
          {t('app_tagline')}
        </p>
      </div>
      <PrimaryButton label={t('lets_start')} onClick={onNext} />
    </div>
  );
}

function LanguageStep({ onNext }: { onNext: () => void }) {
  const { t, lang, setLang } = useI18n();
  const { tokens } = useSfTheme();
  return (
    <div className="flex-1 flex flex-col">
      <h2 className="text-[28px] font-extrabold tracking-tight mb-1.5">{t('choose_language')}</h2>
      <p className="text-base font-medium mb-7" style={{ color: tokens.textDim }}>
        {t('choose_language_sub')}
      </p>
      <div className="flex flex-col gap-3.5">
        {LANGUAGES.map((l) => {
          const selected = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className="flex items-center gap-3.5 rounded-[var(--sf-radius)] p-5 text-start transition-colors"
              style={{
                background: selected ? tokens.accentSoft : 'var(--sf-surface)',
                borderWidth: selected ? 2.5 : tokens.cardBorderWidth,
                borderStyle: 'solid',
                borderColor: selected ? tokens.accent : tokens.cardBorderColor,
              }}
            >
              <span className="text-xl">{l.flag}</span>
              <span className="flex-1 font-bold text-lg">{l.label}</span>
              {selected && <span style={{ color: tokens.accent }}>✓</span>}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-6" />
      <PrimaryButton label={t('continue')} onClick={onNext} />
    </div>
  );
}

function ThemeStep({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  const { tokens } = useSfTheme();
  return (
    <div className="flex-1 flex flex-col">
      <h2 className="text-[28px] font-extrabold tracking-tight mb-1.5">{t('choose_style')}</h2>
      <p className="text-base font-medium mb-5" style={{ color: tokens.textDim }}>
        {t('choose_style_sub')}
      </p>
      <ThemeGrid columns={2} />
      <div className="mt-4">
        <DarkModeToggle />
      </div>
      <div className="flex-1 min-h-6" />
      <PrimaryButton label={t('continue')} onClick={onNext} />
    </div>
  );
}

function SignInStep({ onDone, skipLabel }: { onDone: () => void; skipLabel: string }) {
  const { t } = useI18n();
  const { tokens } = useSfTheme();
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        <div
          className="w-[90px] h-[90px] rounded-[26px] flex items-center justify-center text-4xl"
          style={{
            background: 'var(--sf-accent-gradient)',
            boxShadow: tokens.glow !== 'none' ? tokens.glow : `0 18px 40px -12px ${tokens.accent}80`,
          }}
        >
          🎓
        </div>
        <h2 className="text-[26px] font-extrabold">{t('almost_ready')}</h2>
        <p className="max-w-[250px] text-base font-medium leading-snug" style={{ color: tokens.textDim }}>
          {t('almost_ready_sub')}
        </p>
      </div>
      <SignInPanel onSuccess={onDone} />
      <button
        type="button"
        onClick={onDone}
        className="mt-4 text-sm font-semibold underline underline-offset-4"
        style={{ color: tokens.textDim }}
      >
        {skipLabel}
      </button>
    </div>
  );
}
