// 12 mini month cards with an event count each — matches _YearView in
// calendar_screen.dart. Clicking a month jumps to Month view.
import { useI18n } from '../../i18n/I18nProvider';
import type { ScheduleItem } from '../../state/types';
import { eventCountInMonth, monthName } from './dateUtils';

export function YearView({ date, items, onMonthClick }: { date: Date; items: ScheduleItem[]; onMonthClick: (d: Date) => void }) {
  const { t, lang } = useI18n();
  const today = new Date();
  const year = date.getFullYear();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
        const count = eventCountInMonth(year, m, items);
        const isCurrent = today.getFullYear() === year && today.getMonth() + 1 === m;
        return (
          <button
            key={m}
            onClick={() => onMonthClick(new Date(year, m - 1, 1))}
            className="rounded-[var(--sf-radius-sm)] py-4 px-2 flex flex-col items-center justify-center gap-1"
            style={{
              background: isCurrent ? 'var(--sf-accent-soft)' : 'var(--sf-surface)',
              border: isCurrent ? '2px solid var(--sf-accent)' : 'var(--sf-card-border-width) solid var(--sf-card-border-color)',
            }}
          >
            <span className="text-[14px] font-extrabold truncate">{monthName(lang, m)}</span>
            <span className="text-[11px] font-medium" style={{ color: 'var(--sf-text-dim)' }}>
              {count} {t('events_suffix')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
