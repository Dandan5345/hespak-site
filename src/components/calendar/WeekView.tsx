// Agenda-style week view: one row per day (Sun..Sat) with its events listed
// underneath. Simplified from the Dart app's own week list (which is already
// agenda-style, not an hour grid) — see CLAUDE.md brief. Clicking a day header
// jumps to Day view; clicking an event opens edit.
import { useI18n } from '../../i18n/I18nProvider';
import type { Course, ScheduleItem, Task } from '../../state/types';
import { colorForScheduleItem, dayShort, eventFill, eventsOn, hhmm, sameDay, sundayOf, addDays, tint } from './dateUtils';
import { Card } from './ui';

export function WeekView({
  date,
  items,
  tasks,
  courses,
  onDayClick,
  onEventClick,
}: {
  date: Date;
  items: ScheduleItem[];
  tasks: Task[];
  courses: Course[];
  onDayClick: (d: Date) => void;
  onEventClick: (item: ScheduleItem) => void;
}) {
  const { t, lang } = useI18n();
  const sun = sundayOf(date);
  const today = new Date();

  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: 7 }, (_, i) => addDays(sun, i)).map((d, i) => {
        const dayEvents = eventsOn(d, items);
        const isToday = sameDay(d, today);
        return (
          <Card key={i} highlighted={isToday} className="p-3 flex gap-3 items-start">
            <button onClick={() => onDayClick(d)} className="w-11 shrink-0 text-start">
              <div className="text-[12px] font-bold" style={{ color: 'var(--sf-text-dim)' }}>
                {dayShort(lang, i)}
              </div>
              <div className="text-[22px] font-black" style={{ color: isToday ? 'var(--sf-accent)' : 'var(--sf-text)' }}>
                {d.getDate()}
              </div>
            </button>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              {dayEvents.length === 0 ? (
                <div className="py-2 text-[13px] font-medium" style={{ color: 'var(--sf-text-faint)' }}>
                  {t('cal_no_events')}
                </div>
              ) : (
                dayEvents.map((e) => {
                  const color = colorForScheduleItem(e, tasks, courses);
                  return (
                    <button
                      key={e.id}
                      onClick={() => onEventClick(e)}
                      className="text-start rounded-[var(--sf-radius-sm)] px-2.5 py-1.5 flex items-center gap-2 min-w-0"
                      style={{
                        background: eventFill(color, 0.13),
                        border: `1px solid ${tint(color, 0.3)}`,
                        borderInlineStart: `3px solid ${color}`,
                      }}
                    >
                      <span className="text-[11px] font-bold shrink-0" style={{ color }}>
                        {e.allDay ? t('event_all_day') : `${hhmm(new Date(e.startDateTime))}–${hhmm(new Date(e.endDateTime))}`}
                      </span>
                      <span className="text-[13px] font-semibold truncate">{e.title}</span>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
