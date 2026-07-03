import type { ReactNode } from 'react';
import { useSfTheme } from '../../theme/ThemeProvider';

/** Gradient CTA button matching lib/widgets/common.dart `PrimaryButton`. */
export function PrimaryButton({
  label,
  onClick,
  disabled,
  busy,
  leading,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  leading?: ReactNode;
}) {
  const { tokens } = useSfTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="w-full flex items-center justify-center gap-2 rounded-[var(--sf-radius)] py-4 text-base font-bold transition-transform active:scale-[0.98] disabled:opacity-55"
      style={{
        background: 'var(--sf-accent-gradient)',
        color: tokens.onAccent,
        boxShadow: tokens.glow !== 'none' ? tokens.glow : `0 10px 26px -8px ${tokens.accent}90`,
      }}
    >
      {busy ? <Spinner color={tokens.onAccent} /> : leading}
      <span>{label}</span>
    </button>
  );
}

export function Spinner({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block rounded-full animate-spin"
      style={{
        width: size,
        height: size,
        border: `2.5px solid ${color}55`,
        borderTopColor: color,
      }}
    />
  );
}
