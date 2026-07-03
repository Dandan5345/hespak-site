// Calendar page — web port of lib/screens/calendar_screen.dart +
// schedule_detail_screen.dart + smart_notifications_screen.dart. Day / Week /
// Month / Year views, an add/edit event modal, and a collapsible smart
// reminders section (there's no dedicated route for reminders on the web).
import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useData } from '../state/DataContext';
import type { ScheduleItem } from '../state/types';
import { useSfTheme } from '../theme/ThemeProvider';
import { DayView } from '../components/calendar/DayView';
import { WeekView } from '../components/calendar/WeekView';
import { MonthView } from '../components/calendar/MonthView';
import { YearView } from '../components/calendar/YearView';
import { EventModal } from '../components/calendar/EventModal';
import { RemindersSection } from '../components/calendar/RemindersSection';
import { addDays, calendarTitle, roundToNextHalfHour, startOfDay, type CalView } from '../components/calendar/dateUtils';

const VIEWS: { view: CalView; key: string }[] = [
  { view: 'day', key: 'cal_day' },
  { view: 'week', key: 'cal_week' },
  { view: 'month', key: 'cal_month' },
  { view: 'year', key: 'cal_year' },
];

type EventModalState = { mode: 'new' | 'edit'; item?: ScheduleItem; initialStart?: Date };

export default function Calendar() {
  const { t, lang, isRtl } = useI18n();
  const { tokens } = useSfTheme();
  const { tasks, courses, scheduleItems } = useData();

  const [calView, setCalView] = useState<CalView>('day');
  const [calDate, setCalDate] = useState<Date>(() => startOfDay(new Date()));
  const [eventModal, setEventModal] = useState<EventModalState | null>(null);

  const title = calendarTitle(calView, calDate, lang);
  const prevGlyph = '‹';
  const nextGlyph = '›';

  function step(dir: 1 | -1) {
    setCalDate((d) => {
      switch (calView) {
        case 'day':
          return addDays(d, dir);
        case 'week':
          return addDays(d, dir * 7);
        case 'month':
          return new Date(d.getFullYear(), d.getMonth() + dir, 1);
        case 'year':
          return new Date(d.getFullYear() + dir, d.getMonth(), 1);
      }
    });
  }

  function openDay(d: Date) {
    setCalDate(startOfDay(d));
    setCalView('day');
  }

  function openMonth(d: Date) {
    setCalDate(new Date(d.getFullYear(), d.getMonth(), 1));
    setCalView('month');
  }

  function openNewEvent(start?: Date) {
    setEventModal({ mode: 'new', initialStart: start ?? roundToNextHalfHour(new Date()) });
  }

  function openEditEvent(item: ScheduleItem) {
    setEventModal({ mode: 'edit', item });
  }

  return (
    <div className="pb-6 max-w-[560px] mx-auto">
      <div className="flex items-center justify-between gap-2 mb-4" dir="ltr">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={isRtl ? 'הקודם' : 'Previous'}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-lg font-bold"
          style={{ background: 'var(--sf-surface)', border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)' }}
        >
          {prevGlyph}
        </button>
        <h1 className="text-lg sm:text-xl font-extrabold text-center flex-1 truncate" dir={isRtl ? 'rtl' : 'ltr'}>
          {title}
        </h1>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label={isRtl ? 'הבא' : 'Next'}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-lg font-bold"
          style={{ background: 'var(--sf-surface)', border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)' }}
        >
          {nextGlyph}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <div
          className="flex-1 flex rounded-[var(--sf-radius)] p-1 gap-1"
          style={{ background: 'var(--sf-surface)', border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)' }}
        >
          {VIEWS.map(({ view, key }) => (
            <button
              key={view}
              type="button"
              onClick={() => setCalView(view)}
              className="flex-1 rounded-[calc(var(--sf-radius)-6px)] py-2 text-[13px] font-bold truncate"
              style={{ background: calView === view ? 'var(--sf-accent)' : 'transparent', color: calView === view ? tokens.onAccent : 'var(--sf-text-dim)' }}
            >
              {t(key)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => openNewEvent()}
          aria-label={t('event_title')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-2xl font-bold shrink-0 leading-none"
          style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent, boxShadow: tokens.glow !== 'none' ? tokens.glow : undefined }}
        >
          +
        </button>
      </div>

      {calView === 'day' && (
        <DayView
          date={calDate}
          items={scheduleItems}
          tasks={tasks}
          courses={courses}
          onSlotClick={openNewEvent}
          onEventClick={openEditEvent}
          onDatePick={(d) => setCalDate(startOfDay(d))}
        />
      )}
      {calView === 'week' && (
        <WeekView date={calDate} items={scheduleItems} tasks={tasks} courses={courses} onDayClick={openDay} onEventClick={openEditEvent} />
      )}
      {calView === 'month' && <MonthView date={calDate} items={scheduleItems} tasks={tasks} courses={courses} onDayClick={openDay} />}
      {calView === 'year' && <YearView date={calDate} items={scheduleItems} onMonthClick={openMonth} />}

      <RemindersSection />

      {eventModal && (
        <EventModal mode={eventModal.mode} item={eventModal.item} initialStart={eventModal.initialStart} onClose={() => setEventModal(null)} />
      )}
    </div>
  );
}
