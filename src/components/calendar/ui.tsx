// Small shared presentational primitives for the calendar feature, styled
// entirely through the app's CSS var tokens (see src/theme/tokens.ts) so they
// follow whichever of the 6 themes / light-dark mode is active. No page
// besides Calendar.tsx depends on these.
import type { ReactNode } from 'react';
import { useSfTheme } from '../../theme/ThemeProvider';

export function Card({
  children,
  onClick,
  className = '',
  highlighted = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  highlighted?: boolean;
}) {
  const { tokens } = useSfTheme();
  return (
    <div
      onClick={onClick}
      className={`rounded-[var(--sf-radius)] ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: 'var(--sf-surface)',
        border: highlighted ? `1.6px solid ${tokens.accent}` : 'var(--sf-card-border-width) solid var(--sf-card-border-color)',
        boxShadow: 'var(--sf-card-shadow)',
      }}
    >
      {children}
    </div>
  );
}

export function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[var(--sf-radius-lg)] p-5 sm:p-6"
        style={{ background: 'var(--sf-bg2)', border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function FieldBox({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-[var(--sf-radius)] px-4 py-2.5"
      style={{ background: 'var(--sf-surface)', border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)' }}
    >
      {children}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[13px] font-semibold mb-1.5" style={{ color: 'var(--sf-text-dim)' }}>
      {children}
    </div>
  );
}

export function PrimaryButton({
  label,
  onClick,
  type = 'button',
}: {
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  const { tokens } = useSfTheme();
  return (
    <button
      type={type}
      onClick={onClick}
      className="w-full rounded-[var(--sf-radius)] py-3 font-bold text-[15px]"
      style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent, boxShadow: tokens.glow !== 'none' ? tokens.glow : undefined }}
    >
      {label}
    </button>
  );
}

export function GhostButton({ label, onClick, danger = false }: { label: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[var(--sf-radius)] py-3 font-bold text-[15px] text-center"
      style={{
        background: danger ? 'rgba(239,68,68,0.10)' : 'var(--sf-surface)',
        color: danger ? '#EF4444' : 'var(--sf-text)',
        border: danger ? 'none' : 'var(--sf-card-border-width) solid var(--sf-card-border-color)',
      }}
    >
      {label}
    </button>
  );
}

export function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  const { tokens } = useSfTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-full py-2 text-[13px] font-bold text-center truncate px-2"
      style={{
        background: selected ? tokens.accent : 'var(--sf-surface)',
        color: selected ? tokens.onAccent : 'var(--sf-text-dim)',
        border: selected ? 'none' : 'var(--sf-card-border-width) solid var(--sf-card-border-color)',
      }}
    >
      {label}
    </button>
  );
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { tokens } = useSfTheme();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 rounded-full transition-colors"
      style={{ width: 46, height: 28, padding: 3, background: checked ? tokens.accent : tokens.ringTrack }}
    >
      <span
        className="block rounded-full bg-white transition-transform"
        style={{ width: 22, height: 22, transform: checked ? 'translateX(18px)' : 'translateX(0px)' }}
      />
    </button>
  );
}

export function IconButton({ children, onClick, ariaLabel }: { children: ReactNode; onClick: () => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
      style={{ background: 'var(--sf-surface)', border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)', color: 'var(--sf-text)' }}
    >
      {children}
    </button>
  );
}
