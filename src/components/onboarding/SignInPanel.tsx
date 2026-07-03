import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useSfTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../state/AuthContext';
import { Spinner } from './PrimaryButton';

/** Google + Apple sign-in buttons, reused by Onboarding's final step and by
 * Profile (to let an anonymous visitor upgrade to a real account without
 * redoing onboarding). Apple sign-in on web needs Firebase's generic
 * 'apple.com' OAuth provider configured with an Apple Services ID in the
 * Firebase console — that may not be enabled yet, so failures are caught and
 * shown inline instead of crashing. */
export function SignInPanel({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useI18n();
  const { tokens } = useSfTheme();
  const { signInWithGoogle, signInWithApple, authBusy } = useAuth();
  const [busyWhich, setBusyWhich] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (which: 'google' | 'apple') => {
    setError(null);
    setBusyWhich(which);
    try {
      const user = which === 'google' ? await signInWithGoogle() : await signInWithApple();
      if (user) onSuccess?.();
    } catch {
      setError(t('sign_in_error'));
    } finally {
      setBusyWhich(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <button
        type="button"
        onClick={() => run('google')}
        disabled={authBusy}
        className="w-full flex items-center justify-center gap-2.5 rounded-[var(--sf-radius)] py-4 text-[17px] font-bold transition-transform active:scale-[0.98] disabled:opacity-55"
        style={{
          background: 'var(--sf-surface)',
          color: tokens.text,
          borderWidth: tokens.cardBorderWidth,
          borderStyle: 'solid',
          borderColor: tokens.cardBorderColor,
          boxShadow: tokens.cardShadow !== 'none' ? tokens.cardShadow : undefined,
        }}
      >
        {busyWhich === 'google' ? <Spinner color={tokens.text} /> : <GoogleG />}
        <span>{t('continue_google')}</span>
      </button>
      <button
        type="button"
        onClick={() => run('apple')}
        disabled={authBusy}
        className="w-full flex items-center justify-center gap-2.5 rounded-[var(--sf-radius)] py-4 text-[17px] font-bold transition-transform active:scale-[0.98] disabled:opacity-55"
        style={{ background: tokens.text, color: tokens.bg2 }}
      >
        {busyWhich === 'apple' ? <Spinner color={tokens.bg2} /> : <AppleMark color={tokens.bg2} />}
        <span>{t('continue_apple')}</span>
      </button>
      {error && (
        <p className="text-center text-sm font-semibold" style={{ color: '#EF4444' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function AppleMark({ color }: { color: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 384 512" fill={color} aria-hidden>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function GoogleG() {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-black"
      style={{
        width: 20,
        height: 20,
        fontSize: 12,
        background:
          'conic-gradient(from 0deg, #4285F4, #34A853, #FBBC05, #EA4335, #4285F4)',
      }}
    >
      G
    </span>
  );
}
