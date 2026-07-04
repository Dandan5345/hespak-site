// Vertical hour timeline for a single day — web port of _DayTimeline in
// calendar_screen.dart, including the overlap side-by-side column layout
// (_layoutDay) and the all-day pinned strip. Clicking an empty slot opens the
// "add event" modal pre-filled with that hour; clicking an event opens edit.
import { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { Course, ScheduleItem, Task } from '../../state/types';
import { addDays, colorForScheduleItem, dayShort, eventFill, eventsOn, hhmm, sameDay, sundayOf, tint } from './dateUtils';
import { useTt } from './i18n';

const PX_PER_HOUR = 64;
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
  onDatePick,
}: {
  date: Date;
  items: ScheduleItem[];
  tasks: Task[];
  courses: Course[];
  onSlotClick: (start: Date) => void;
  onEventClick: (item: ScheduleItem) => void;
  onDatePick: (date: Date) => void;
}) {
  const { t } = useI18n();
  const tt = useTt();
  const dayEvents = useMemo(() => eventsOn(date, items), [date, items]);
  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);
  const now = new Date();
  const isToday = sameDay(date, now);

  const startHour = 0;
  const endHour = 24;
  const hours: number[] = [];
  for (let h = startHour; h < endHour; h++) hours.push(h);
  const totalHeight = (endHour - startHour) * PX_PER_HOUR;
  const pxPerMin = PX_PER_HOUR / 60;
  const topFor = (d: Date) => (d.getHours() * 60 + d.getMinutes() - startHour * 60) * pxPerMin;

  const placed = useMemo(() => layoutDay(timedEvents), [timedEvents]);
  const emptyStartHour = sameDay(date, now) ? Math.min(21, Math.max(8, now.getHours() + 1)) : 9;
  const emptyStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), emptyStartHour, 0);

  // Position/height of an event *as it appears on this day*: a multi-day event
  // that spills past midnight is clamped to the day's [00:00, 24:00] window, and
  // a weekly-repeat instance is drawn at its time-of-day on the shown date. This
  // stops cross-midnight events from overflowing the grid or rendering at the
  // wrong hour on the following day.
  const dayStartMs = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
  const occurrenceBounds = (item: ScheduleItem): { top: number; height: number } => {
    const rawStart = new Date(item.startDateTime);
    const rawEnd = new Date(item.endDateTime);
    const durMs = Math.max(0, rawEnd.getTime() - rawStart.getTime());
    const startMs =
      item.weeklyRepeat && !sameDay(rawStart, date)
        ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), rawStart.getHours(), rawStart.getMinutes()).getTime()
        : rawStart.getTime();
    const clampedStart = Math.max(startMs, dayStartMs);
    const clampedEnd = Math.min(startMs + durMs, dayEndMs);
    const top = ((clampedStart - dayStartMs) / 60000) * pxPerMin;
    const rawHeight = ((clampedEnd - clampedStart) / 60000) * pxPerMin;
    const height = Math.max(24, Math.min(rawHeight, totalHeight - top));
    return { top, height };
  };

  return (
    <div className="flex flex-col">
      <WeekStrip date={date} items={items} tasks={tasks} courses={courses} onPick={onDatePick} />
      <div className="h-1.5" />
      {allDayEvents.length > 0 && (
        <div className="mb-2 flex items-start">
          <div className="shrink-0" style={{ width: GUTTER }} />
          <div className="ms-2 flex-1 min-w-0">
            <div className="text-[12px] font-bold mb-1.5" style={{ color: 'var(--sf-text-faint)' }}>
              {tt('cal_all_day_section')}
            </div>
            {allDayEvents.map((e) => {
              const color = colorForScheduleItem(e, tasks, courses);
              return (
                <button
                  key={e.id}
                  onClick={() => onEventClick(e)}
                  className="text-start rounded-[var(--sf-radius-sm)] px-3 py-2 font-bold text-[13px]"
                  style={{
                    background: eventFill(color),
                    border: `1px solid ${tint(color, 0.35)}`,
                    borderInlineStart: `4px solid ${color}`,
                    color: 'var(--sf-text)',
                    boxShadow: '0 1px 5px rgba(0,0,0,0.07)',
                  }}
                >
                  {e.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {dayEvents.length === 0 && <EmptyDay date={date} onAdd={() => onSlotClick(emptyStart)} />}
      <div className={dayEvents.length === 0 ? 'mt-4' : ''}>
        <div className="flex px-[18px]" style={{ height: totalHeight }}>
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
              const { top, height: h } = occurrenceBounds(p.item);
              const compact = h <= 45 * pxPerMin;
              return (
                <button
                  key={p.item.id}
                  onClick={() => onEventClick(p.item)}
                  className="absolute text-start rounded-[10px] overflow-hidden px-2.5 py-1.5"
                  style={{
                    top,
                    height: h,
                    insetInlineStart: `calc(${p.col} * (100% / ${p.cols}) + ${p.col === 0 ? 0 : 2}px)`,
                    width: `calc(100% / ${p.cols} - ${p.cols > 1 ? 4 : 2}px)`,
                    background: eventFill(color),
                    border: `1px solid ${tint(color, 0.35)}`,
                    borderInlineStart: `4px solid ${color}`,
                    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
                    zIndex: 1,
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
                    <div className="text-[11px] font-bold truncate" style={{ color }}>
                      {hhmm(new Date(p.item.startDateTime))}–{hhmm(new Date(p.item.endDateTime))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyDay({ date, onAdd }: { date: Date; onAdd: () => void }) {
  const { t, lang } = useI18n();
  const today = new Date();
  const isToday = sameDay(date, today);

  return (
    <div className="px-[18px] pt-4">
      <div
        className="relative overflow-hidden rounded-[var(--sf-radius)] min-h-[300px] px-5 py-6 flex flex-col items-center justify-center text-center"
        style={{
          background: 'var(--sf-surface)',
          border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)',
          boxShadow: 'var(--sf-card-shadow)',
        }}
      >
        <div
          className="absolute inset-x-5 top-6 bottom-6 opacity-70 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0, transparent 47px, var(--sf-accent-soft) 48px, var(--sf-accent-soft) 49px)',
          }}
        />
        <div className="relative flex flex-col items-center">
          <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--sf-text-faint)' }}>
            {dayShort(lang, date.getDay())}
          </div>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black mb-4"
            style={{
              background: isToday ? 'var(--sf-accent-gradient)' : 'var(--sf-accent-soft)',
              color: isToday ? 'var(--sf-on-accent)' : 'var(--sf-accent)',
              boxShadow: isToday ? 'var(--sf-glow)' : undefined,
            }}
          >
            {date.getDate()}
          </div>
          <div className="text-[15px] font-extrabold" style={{ color: 'var(--sf-text)' }}>
            {t('cal_no_events')}
          </div>
          <button
            type="button"
            onClick={onAdd}
            aria-label={t('event_title')}
            className="mt-5 w-12 h-12 rounded-full flex items-center justify-center text-[28px] font-bold leading-none"
            style={{ background: 'var(--sf-accent-gradient)', color: 'var(--sf-on-accent)', boxShadow: 'var(--sf-glow)' }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function WeekStrip({
  date,
  items,
  tasks,
  courses,
  onPick,
}: {
  date: Date;
  items: ScheduleItem[];
  tasks: Task[];
  courses: Course[];
  onPick: (date: Date) => void;
}) {
  const { lang } = useI18n();
  const today = new Date();
  const sun = sundayOf(date);

  return (
    <div className="px-3.5">
      <div className="grid grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(sun, i);
          const selected = sameDay(d, date);
          const isToday = sameDay(d, today);
          const dots = eventsOn(d, items).slice(0, 3);
          return (
            <button key={i} type="button" onClick={() => onPick(d)} className="min-w-0 py-1 flex flex-col items-center">
              <span className="text-[11px] font-bold" style={{ color: 'var(--sf-text-faint)' }}>
                {dayShort(lang, i)}
              </span>
              <span
                className="mt-1.5 w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-extrabold"
                style={{
                  background: selected ? 'var(--sf-accent-gradient)' : 'transparent',
                  color: selected ? 'var(--sf-on-accent)' : 'var(--sf-text)',
                  border: !selected && isToday ? '1.6px solid var(--sf-accent)' : '1.6px solid transparent',
                  boxShadow: selected ? 'var(--sf-glow)' : undefined,
                }}
              >
                {d.getDate()}
              </span>
              <span className="mt-1.5 h-1.5 flex items-center justify-center gap-px">
                {dots.map((e) => (
                  <span
                    key={e.id}
                    className="w-[5px] h-[5px] rounded-full"
                    style={{ background: colorForScheduleItem(e, tasks, courses) }}
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
