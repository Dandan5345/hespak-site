// Vertical hour timeline for a single day — web port of _DayTimeline in
// calendar_screen.dart, including the overlap side-by-side column layout
// (_layoutDay) and the all-day pinned strip. Clicking an empty slot opens the
// "add event" modal pre-filled with that hour; clicking an event opens edit.
import { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { Course, ScheduleItem, Task } from '../../state/types';
import { colorForScheduleItem, durationMinutes, eventsOn, hhmm, sameDay } from './dateUtils';
import { useTt } from './i18n';

const PX_PER_HOUR = 56;
const GUTTER = 46;

interface Placed {
  item: ScheduleItem;
  col: number;
  cols: number;
}

function layoutDay(items: ScheduleItem[]): Placed[] {
  const placed: Placed[] = items
    .slice()
    .sort((a, b) => {
      const c = new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
      if (c !== 0) return c;
      return new Date(b.endDateTime).getTime() - new Date(a.endDateTime).getTime();
    })
    .map((item) => ({ item, col: 0, cols: 1 }));

  let i = 0;
  while (i < placed.length) {
    const cluster: Placed[] = [placed[i]];
    let clusterEnd = new Date(placed[i].item.endDateTime).getTime();
    let j = i + 1;
    while (j < placed.length && new Date(placed[j].item.startDateTime).getTime() < clusterEnd) {
      cluster.push(placed[j]);
      const endJ = new Date(placed[j].item.endDateTime).getTime();
      if (endJ > clusterEnd) clusterEnd = endJ;
      j++;
    }
    const colEnds: number[] = [];
    for (const p of cluster) {
      let assigned = false;
      const s = new Date(p.item.startDateTime).getTime();
      for (let c = 0; c < colEnds.length; c++) {
        if (s >= colEnds[c]) {
          p.col = c;
          colEnds[c] = new Date(p.item.endDateTime).getTime();
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        p.col = colEnds.length;
        colEnds.push(new Date(p.item.endDateTime).getTime());
      }
    }
    for (const p of cluster) p.cols = colEnds.length;
    i = j;
  }
  return placed;
}

export function DayView({
  date,
  items,
  tasks,
  courses,
  onSlotClick,
  onEventClick,
}: {
  date: Date;
  items: ScheduleItem[];
  tasks: Task[];
  courses: Course[];
  onSlotClick: (start: Date) => void;
  onEventClick: (item: ScheduleItem) => void;
}) {
  const { t } = useI18n();
  const tt = useTt();
  const dayEvents = useMemo(() => eventsOn(date, items), [date, items]);
  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);
  const now = new Date();
  const isToday = sameDay(date, now);

  let startHour = 7;
  let endHour = 22;
  for (const e of timedEvents) {
    const s = new Date(e.startDateTime);
    const en = new Date(e.endDateTime);
    startHour = Math.min(startHour, s.getHours());
    const endH = en.getMinutes() > 0 ? en.getHours() + 1 : en.getHours();
    endHour = Math.max(endHour, endH);
  }
  endHour = Math.min(24, Math.max(startHour + 1, endHour));
  const hours: number[] = [];
  for (let h = startHour; h < endHour; h++) hours.push(h);
  const totalHeight = (endHour - startHour) * PX_PER_HOUR;
  const pxPerMin = PX_PER_HOUR / 60;
  const topFor = (d: Date) => (d.getHours() * 60 + d.getMinutes() - startHour * 60) * pxPerMin;

  const placed = useMemo(() => layoutDay(timedEvents), [timedEvents]);

  return (
    <div>
      {allDayEvents.length > 0 && (
        <div className="mb-3">
          <div className="text-[12px] font-bold mb-1.5" style={{ color: 'var(--sf-text-faint)' }}>
            {tt('cal_all_day_section')}
          </div>
          <div className="flex flex-col gap-1.5">
            {allDayEvents.map((e) => {
              const color = colorForScheduleItem(e, tasks, courses);
              return (
                <button
                  key={e.id}
                  onClick={() => onEventClick(e)}
                  className="text-start rounded-[var(--sf-radius-sm)] px-3 py-2 font-bold text-[13px]"
                  style={{ background: `${color}24`, borderInlineStart: `4px solid ${color}`, color: 'var(--sf-text)' }}
                >
                  {e.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {dayEvents.length === 0 ? (
        <div className="mt-6 py-10 text-center">
          <div className="text-3xl mb-2">🗓️</div>
          <div className="text-[14px] font-semibold" style={{ color: 'var(--sf-text-dim)' }}>
            {t('cal_no_events')}
          </div>
        </div>
      ) : (
        <div className="flex" style={{ height: totalHeight }}>
          <div className="relative shrink-0" style={{ width: GUTTER }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute text-[12px] font-bold"
                style={{ top: (h - startHour) * PX_PER_HOUR - 7, color: isToday && now.getHours() === h ? 'var(--sf-accent)' : 'var(--sf-text-faint)' }}
              >
                {h < 10 ? `0${h}` : h}:00
              </div>
            ))}
          </div>
          <div className="relative flex-1 ms-2">
            {/* hour rows — click to add an event starting at that hour */}
            {hours.map((h) => (
              <button
                key={h}
                onClick={() => onSlotClick(new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 0))}
                className="absolute inset-x-0"
                style={{ top: (h - startHour) * PX_PER_HOUR, height: PX_PER_HOUR, borderTop: '1px solid var(--sf-accent-soft)' }}
                aria-label={t('event_title')}
              />
            ))}
            {isToday && now.getHours() >= startHour && now.getHours() < endHour && (
              <div className="absolute inset-x-0 pointer-events-none" style={{ top: topFor(now), height: 2, background: 'var(--sf-accent)' }} />
            )}
            {placed.map((p) => {
              const color = colorForScheduleItem(p.item, tasks, courses);
              const top = topFor(new Date(p.item.startDateTime));
              const h = Math.min(totalHeight, Math.max(24, durationMinutes(p.item) * pxPerMin));
              const compact = durationMinutes(p.item) <= 45;
              return (
                <button
                  key={p.item.id}
                  onClick={() => onEventClick(p.item)}
                  className="absolute text-start rounded-[var(--sf-radius-sm)] overflow-hidden px-2.5 py-1.5"
                  style={{
                    top,
                    height: h,
                    insetInlineStart: `calc(${p.col} * (100% / ${p.cols}))`,
                    width: `calc(100% / ${p.cols} - 3px)`,
                    background: `${color}24`,
                    borderInlineStart: `4px solid ${color}`,
                  }}
                >
                  <div
                    className="text-[13px] font-bold truncate"
                    style={{
                      color: p.item.isCompleted ? 'var(--sf-text-faint)' : 'var(--sf-text)',
                      textDecoration: p.item.isCompleted ? 'line-through' : undefined,
                    }}
                  >
                    {p.item.title}
                  </div>
                  {!compact && (
                    <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--sf-text-dim)' }}>
                      {hhmm(new Date(p.item.startDateTime))}–{hhmm(new Date(p.item.endDateTime))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
