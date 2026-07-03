// Month calendar grid — each cell shows the day number and a dot per event
// (up to 3), matching _MonthView in calendar_screen.dart. Clicking a day
// jumps to Day view.
import { useI18n } from '../../i18n/I18nProvider';
import type { Course, ScheduleItem, Task } from '../../state/types';
import { col, colorForScheduleItem, dayShort, daysInMonth, eventsOn, sameDay } from './dateUtils';

export function MonthView({
  date,
  items,
  tasks,
  courses,
  onDayClick,
}: {
  date: Date;
  items: ScheduleItem[];
  tasks: Task[];
  courses: Course[];
  onDayClick: (d: Date) => void;
}) {
  const { lang } = useI18n();
  const today = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed
  const total = daysInMonth(year, month);
  const firstCol = col(new Date(year, month - 1, 1));
  const cells: (number | null)[] = [...Array(firstCol).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="text-center text-[12px] font-bold" style={{ color: 'var(--sf-text-faint)' }}>
            {dayShort(lang, i)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((n, idx) => {
          if (n === null) return <div key={idx} />;
          const d = new Date(year, month - 1, n);
          const isToday = sameDay(d, today);
          const selected = sameDay(d, date);
          const dayEvents = eventsOn(d, items);
          return (
            <button
              key={idx}
              onClick={() => onDayClick(d)}
              className="aspect-square rounded-[10px] flex flex-col items-center justify-center gap-1"
              style={{
                background: selected ? 'var(--sf-accent-gradient)' : (isToday ? 'var(--sf-accent-soft)' : 'transparent'),
                border: !selected && isToday ? '1.6px solid var(--sf-accent)' : '1.6px solid transparent',
              }}
            >
              <span className="text-[14px] font-bold" style={{ color: selected ? 'var(--sf-on-accent)' : 'var(--sf-text)' }}>
                {n}
              </span>
              <span className="flex items-center gap-0.5" style={{ height: 5 }}>
                {dayEvents.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className="rounded-full"
                    style={{ width: 4, height: 4, background: selected ? 'var(--sf-on-accent)' : colorForScheduleItem(e, tasks, courses) }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
