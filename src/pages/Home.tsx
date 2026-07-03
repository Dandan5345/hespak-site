import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useSfTheme } from '../theme/ThemeProvider';
import { useAuth } from '../state/AuthContext';
import { useData } from '../state/DataContext';
import { argbToCss, urgencyLabelKey, type ScheduleItem, type Task } from '../state/types';
import { bumpAppOpenStatsOnce, type AppStats } from '../components/home/appStats';
import {
  colorForScheduleItem,
  completedOnDay,
  eventTypeKey,
  eventsOn,
  freeHoursToday,
  isDueToday,
  timeLabel,
  todaysOpenTasks,
} from '../components/home/dateHelpers';

// Local strings not yet in src/i18n/strings.ts (see project convention).
const EXTRA: Record<string, Record<string, string>> = {
  get_started_title: { he: 'ברוך/ה הבא/ה! ✨', en: 'Welcome! ✨' },
  get_started_body: {
    he: 'עוד לא הוספת קורסים או משימות. אפשר להתחיל ידנית או לתת ל-AI לעשות את זה בשבילך.',
    en: "You haven't added any courses or tasks yet. Start manually, or let the AI set things up for you.",
  },
  get_started_add_task: { he: '➕ הוספת משימה ראשונה', en: '➕ Add your first task' },
  get_started_ask_ai: { he: '💬 שאל/י את הסוכן', en: '💬 Ask your agent' },
};

export default function Home() {
  const { t, lang } = useI18n();
  const { tokens } = useSfTheme();
  const { isSignedIn, displayName } = useAuth();
  const { tasks, scheduleItems, courseById, taskById, agentName, updateTask } = useData();
  const navigate = useNavigate();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);

  const [stats, setStats] = useState<AppStats>({ appOpenCount: 0, currentStreak: 0, bestStreak: 0 });
  useEffect(() => {
    setStats(bumpAppOpenStatsOnce());
  }, []);

  const now = useMemo(() => new Date(), []);
  const todayEvents = useMemo(() => eventsOn(scheduleItems, now), [scheduleItems, now]);
  const urgentTasks = useMemo(
    () => tasks.filter((task) => !task.isCompleted && (task.urgency === 'urgent' || task.urgency === 'veryUrgent')).slice(0, 3),
    [tasks],
  );
  const totalTasksToday = useMemo(() => tasks.filter((task) => isDueToday(task, now)).length, [tasks, now]);
  const doneToday = useMemo(() => tasks.filter((task) => task.isCompleted && completedOnDay(task, now)).length, [tasks, now]);
  const progress = totalTasksToday === 0 ? 0 : doneToday / totalTasksToday;
  const hasAiSummary = urgentTasks.length > 0 || todayEvents.length > 0;
  const isBrandNew = tasks.length === 0 && scheduleItems.length === 0;

  const agentDisplayName = agentName.trim() || t('agent_default_name');
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
      }).format(now),
    [lang, now],
  );

  return (
    <div className="pb-8 pt-2 flex flex-col gap-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: tokens.textDim }}>
            {todayLabel}
          </p>
          <h1 className="text-[26px] font-extrabold tracking-tight mt-0.5">
            {t('greeting')}
            {isSignedIn && displayName ? `, ${displayName.split(' ')[0]}` : ''}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-lg"
          style={{
            background: 'var(--sf-accent-gradient)',
            color: tokens.onAccent,
            boxShadow: tokens.glow !== 'none' ? tokens.glow : undefined,
          }}
          aria-label={t('nav_profile')}
        >
          {isSignedIn && displayName ? displayName.trim()[0]?.toUpperCase() : '👤'}
        </button>
      </div>

      {isBrandNew && (
        <div
          className="rounded-[var(--sf-radius-lg)] p-5"
          style={{
            background: 'var(--sf-surface)',
            borderWidth: tokens.cardBorderWidth,
            borderStyle: 'solid',
            borderColor: tokens.cardBorderColor,
            boxShadow: tokens.cardShadow !== 'none' ? tokens.cardShadow : undefined,
          }}
        >
          <p className="font-extrabold text-lg mb-1.5">{tt('get_started_title')}</p>
          <p className="text-sm font-medium mb-4" style={{ color: tokens.textDim }}>
            {tt('get_started_body')}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="rounded-full px-4 py-2.5 text-sm font-bold"
              style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
            >
              {tt('get_started_add_task')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="rounded-full px-4 py-2.5 text-sm font-bold"
              style={{ background: tokens.accentSoft, color: tokens.accent }}
            >
              {tt('get_started_ask_ai')}
            </button>
          </div>
        </div>
      )}

      {/* AI daily summary card */}
      <button
        type="button"
        onClick={() => navigate('/chat')}
        className="text-start rounded-[var(--sf-radius-lg)] p-[18px] pb-5 transition-transform active:scale-[0.99]"
        style={{
          background: 'var(--sf-accent-gradient)',
          boxShadow: tokens.glow !== 'none' ? tokens.glow : `0 20px 45px -14px ${tokens.accent}90`,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="text-[13px] font-bold" style={{ color: tokens.onAccent }}>
            {t('ai_daily_summary')} · {agentDisplayName}
          </span>
        </div>
        <p className="mt-2 text-base font-semibold leading-relaxed" style={{ color: tokens.onAccent }}>
          {hasAiSummary ? t('home_ai_text') : t('home_ai_empty')}
        </p>
        <span
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold"
          style={{ background: 'rgba(255,255,255,0.22)', color: tokens.onAccent }}
        >
          💬 {t('open_chat')}
        </span>
      </button>

      <DailyBriefing tasks={tasks} todayEvents={todayEvents} now={now} updateTask={updateTask} />

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card>
          <span className="text-xl">🔥</span>
          <p className="text-[22px] font-extrabold mt-1.5">{stats.currentStreak}</p>
          <p className="text-xs font-medium" style={{ color: tokens.textDim }}>
            {t('streak_days')}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <ProgressRing progress={progress} track={tokens.ringTrack} color={tokens.accent}>
              <span className="text-[9px] font-extrabold">
                {totalTasksToday === 0 ? '—' : `${Math.round(progress * 100)}%`}
              </span>
            </ProgressRing>
          </div>
          <p className="text-[22px] font-extrabold mt-1.5">
            {totalTasksToday === 0 ? '0' : `${doneToday}/${totalTasksToday}`}
          </p>
          <p className="text-xs font-medium truncate" style={{ color: tokens.textDim }}>
            {t('tasks_today')}
          </p>
        </Card>
      </div>

      {totalTasksToday > 0 && (
        <div
          className="flex items-center gap-2.5 rounded-[var(--sf-radius)] px-4 py-3"
          style={{ background: tokens.accentSoft, border: `1px solid ${tokens.accent}59` }}
        >
          <span className="text-lg">💪</span>
          <p className="text-sm font-bold" style={{ color: tokens.accent }}>
            {t('keep_going')}
          </p>
        </div>
      )}

      {/* Urgent tasks */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">⚡</span>
            <h2 className="text-lg font-extrabold">{t('urgent_today')}</h2>
          </div>
          <button type="button" onClick={() => navigate('/tasks')} className="text-[13px] font-bold" style={{ color: tokens.accent }}>
            {t('see_all')}
          </button>
        </div>
        {urgentTasks.length === 0 ? (
          <Card row>
            <span className="text-xl">✨</span>
            <p className="text-sm font-semibold flex-1" style={{ color: tokens.textDim }}>
              {t('empty_urgent_tasks')}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {urgentTasks.map((task) => (
              <TaskRowCompact key={task.id} task={task} courseColor={courseById(task.courseId)?.color} />
            ))}
          </div>
        )}
      </div>

      {/* Today's schedule */}
      <div>
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-lg">📅</span>
          <h2 className="text-lg font-extrabold">{t('today_schedule')}</h2>
        </div>
        <Card padded={false}>
          {todayEvents.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-5">
              <span className="text-xl">📅</span>
              <p className="text-sm font-semibold" style={{ color: tokens.textDim }}>
                {t('empty_schedule')}
              </p>
            </div>
          ) : (
            <div className="px-4">
              {todayEvents.map((event, i) => {
                const course = courseById(taskById(event.taskId)?.courseId);
                const subtitleParts = [t(eventTypeKey(event.type))];
                if (course) subtitleParts.push(course.name);
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 py-3"
                    style={{ borderBottom: i === todayEvents.length - 1 ? undefined : `1px solid ${tokens.accentSoft}` }}
                  >
                    <span className="w-11 text-[13px] font-extrabold shrink-0" style={{ color: tokens.textDim }}>
                      {timeLabel(event.startDateTime)}
                    </span>
                    <span
                      className="w-[3px] shrink-0 rounded-full"
                      style={{ height: 34, background: colorForScheduleItem(event, courseById, taskById) }}
                    />
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold truncate">{event.title}</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: tokens.textDim }}>
                        {subtitleParts.join(' · ')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DailyBriefing({
  tasks,
  todayEvents,
  now,
  updateTask,
}: {
  tasks: Task[];
  todayEvents: ScheduleItem[];
  now: Date;
  updateTask: (id: string, patch: Partial<Task>) => void;
}) {
  const { t } = useI18n();
  const { tokens } = useSfTheme();
  const navigate = useNavigate();
  const [flash, setFlash] = useState<string | null>(null);

  const hour = now.getHours();
  const morning = hour < 12;
  const evening = hour >= 17;
  if (!morning && !evening) return null;

  const openToday = todaysOpenTasks(tasks, now);

  let text: string;
  let showMove = false;
  if (morning) {
    text =
      openToday.length === 0
        ? t('briefing_morning_empty')
        : t('briefing_morning_text')
            .replace('{free}', String(freeHoursToday(todayEvents)))
            .replace('{count}', String(openToday.length))
            .replace('{task}', openToday[0].title);
  } else {
    const total = tasks.filter((task) => isDueToday(task, now)).length;
    const done = tasks.filter((task) => task.isCompleted && completedOnDay(task, now)).length;
    const remaining = openToday.length;
    if (total === 0) {
      text = t('briefing_evening_empty');
    } else if (remaining === 0) {
      text = t('briefing_evening_done').replace('{done}', String(done));
    } else {
      text = t('briefing_evening_text')
        .replace('{done}', String(done))
        .replace('{total}', String(total))
        .replace('{remaining}', String(remaining));
      showMove = true;
    }
  }

  const moveTomorrow = () => {
    let moved = 0;
    for (const task of openToday) {
      if (!task.dueDateTime) continue;
      const next = new Date(task.dueDateTime);
      next.setDate(next.getDate() + 1);
      updateTask(task.id, { dueDateTime: next.toISOString() });
      moved++;
    }
    if (moved > 0) setFlash(t('briefing_moved').replace('{count}', String(moved)));
  };

  return (
    <div
      className="rounded-[var(--sf-radius-lg)] p-4"
      style={{ background: tokens.accentSoft, border: `1px solid ${tokens.accent}4d` }}
    >
      <button type="button" onClick={() => navigate('/chat')} className="w-full text-start">
        <div className="flex items-center gap-2">
          <span className="text-lg">{morning ? '🌅' : '🌙'}</span>
          <span className="text-[13px] font-extrabold" style={{ color: tokens.accent }}>
            {t(morning ? 'briefing_morning_label' : 'briefing_evening_label')}
          </span>
        </div>
        <p className="mt-2.5 text-[15px] font-semibold leading-relaxed">{text}</p>
      </button>
      {showMove && (
        <button
          type="button"
          onClick={moveTomorrow}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[13px] font-extrabold"
          style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
        >
          📆 {t('briefing_move_tomorrow')}
        </button>
      )}
      {flash && (
        <p className="mt-2 text-xs font-bold" style={{ color: tokens.accent }}>
          {flash}
        </p>
      )}
    </div>
  );
}

function Card({ children, row, padded = true }: { children: React.ReactNode; row?: boolean; padded?: boolean }) {
  const { tokens } = useSfTheme();
  return (
    <div
      className={`rounded-[var(--sf-radius)] ${padded ? 'p-4' : 'py-1'} ${row ? 'flex items-center gap-3' : ''}`}
      style={{
        background: 'var(--sf-surface)',
        borderWidth: tokens.cardBorderWidth,
        borderStyle: 'solid',
        borderColor: tokens.cardBorderColor,
        boxShadow: tokens.cardShadow !== 'none' ? tokens.cardShadow : undefined,
      }}
    >
      {children}
    </div>
  );
}

function ProgressRing({
  progress,
  track,
  color,
  size = 40,
  stroke = 4,
  children,
}: {
  progress: number;
  track: string;
  color: string;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}

function TaskRowCompact({ task, courseColor }: { task: Task; courseColor?: number }) {
  const { t } = useI18n();
  const { tokens } = useSfTheme();
  const navigate = useNavigate();
  const dotColor = courseColor ? argbToCss(courseColor) : tokens.accent;
  const urgencyColor = task.urgency === 'veryUrgent' ? '#EF4444' : task.urgency === 'urgent' ? '#F59E0B' : tokens.textFaint;

  return (
    <button type="button" onClick={() => navigate('/tasks')} className="w-full text-start">
      <Card row>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dotColor }} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold truncate">{task.title}</p>
          {task.dueDateTime && (
            <p className="text-xs font-medium mt-0.5" style={{ color: tokens.textDim }}>
              {timeLabel(task.dueDateTime)}
            </p>
          )}
        </div>
        <span
          className="text-[11px] font-extrabold px-2 py-1 rounded-full shrink-0"
          style={{ color: urgencyColor, background: `${urgencyColor}1f` }}
        >
          {t(urgencyLabelKey(task.urgency))}
        </span>
      </Card>
    </button>
  );
}
