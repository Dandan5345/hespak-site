import { useI18n } from '../../i18n/I18nProvider';
import { useSfTheme } from '../../theme/ThemeProvider';
import { THEME_METAS } from '../../theme/tokens';

/** Compact pill switch matching the mobile app's toggle look (lib/screens/settings_screen.dart
 * `_Switch`). Uses flexbox justify-content instead of a transform so it flips
 * correctly for RTL without any extra logic. */
export function Switch({ value, onClick, label }: { value: boolean; onClick: () => void; label?: string }) {
  const { tokens } = useSfTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={value}
      aria-label={label}
      className="shrink-0 rounded-full transition-colors duration-200"
      style={{
        width: 50,
        height: 30,
        padding: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: value ? 'flex-end' : 'flex-start',
        background: value ? tokens.accent : tokens.ringTrack,
      }}
    >
      <span
        className="rounded-full transition-transform duration-200"
        style={{ width: 24, height: 24, background: '#FFFFFF' }}
      />
    </button>
  );
}

/** Grid of the 6 theme cards (glass/min/pastel/brutal/nature/cyber), each showing
 * its preview gradient + emoji + localized name. Shared by Onboarding's theme
 * step and Settings. Ported from lib/screens/onboarding_screen.dart `_ThemeCard`
 * / lib/screens/settings_screen.dart `_ThemeTile`. */
export function ThemeGrid({ columns = 2 }: { columns?: 2 | 3 }) {
  const { t } = useI18n();
  const { theme, setTheme, tokens } = useSfTheme();

  return (
    <div className={`grid gap-3 ${columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {THEME_METAS.map((meta) => {
        const selected = theme === meta.theme;
        return (
          <button
            key={meta.theme}
            type="button"
            onClick={() => setTheme(meta.theme)}
            className="flex flex-col rounded-[var(--sf-radius)] p-2.5 text-start transition-transform active:scale-[0.97]"
            style={{
              background: 'var(--sf-surface)',
              borderWidth: selected ? 2.5 : tokens.cardBorderWidth,
              borderStyle: 'solid',
              borderColor: selected ? tokens.accent : tokens.cardBorderColor,
            }}
          >
            <div
              className="flex items-center justify-center text-xl rounded-[calc(var(--sf-radius)-6px)]"
              style={{
                aspectRatio: '1.45',
                background: `linear-gradient(135deg, ${meta.preview[0]}, ${meta.preview[1]})`,
              }}
            >
              <span>{meta.emoji}</span>
            </div>
            <span
              className="mt-2 text-[13px] font-bold truncate"
              style={{ color: tokens.text }}
            >
              {t(meta.nameKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Light/dark toggle row, styled like an SfCard. */
export function DarkModeToggle() {
  const { t } = useI18n();
  const { mode, toggleDark, tokens } = useSfTheme();
  return (
    <div
      className="flex items-center justify-between rounded-[var(--sf-radius)] px-4 py-3.5"
      style={{
        background: 'var(--sf-surface)',
        borderWidth: tokens.cardBorderWidth,
        borderStyle: 'solid',
        borderColor: tokens.cardBorderColor,
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">🌙</span>
        <span className="text-[15px] font-bold">{t('settings_dark_label')}</span>
      </div>
      <Switch value={mode === 'dark'} onClick={toggleDark} label={t('settings_dark_label')} />
    </div>
  );
}
