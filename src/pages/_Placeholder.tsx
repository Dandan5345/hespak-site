import { useI18n } from '../i18n/I18nProvider';

/** Temporary stand-in while a real page is being built. */
export function Placeholder({ title, emoji }: { title: string; emoji: string }) {
  const { t } = useI18n();
  return (
    <div
      className="rounded-[var(--sf-radius-lg)] p-10 text-center mt-6"
      style={{
        background: 'var(--sf-surface)',
        border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)',
        boxShadow: 'var(--sf-card-shadow)',
      }}
    >
      <div className="text-5xl mb-3">{emoji}</div>
      <h1 className="text-xl font-bold mb-1">{title}</h1>
      <p style={{ color: 'var(--sf-text-dim)' }}>{t('loading') || '...בקרוב'}</p>
    </div>
  );
}
