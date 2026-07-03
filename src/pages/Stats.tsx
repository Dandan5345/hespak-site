import { useEffect, useMemo, useState } from 'react';
import { useData } from '../state/DataContext';
import { useI18n } from '../i18n/I18nProvider';
import { useSfTheme } from '../theme/ThemeProvider';
import { argbToCss } from '../state/types';
import { BarChart } from '../components/stats/BarChart';
import { Heatmap } from '../components/habits/Heatmap';
import { ProgressRing } from '../components/focus/ProgressRing';
import {
  addDays,
  computeActiveDayStreak,
  dateKey,
  readDailyStats,
  readFocusSessionsCount,
  startOfDay,
  type DailyStatsMap,
} from '../components/focus/dailyStats';

const EXTRA: Record<string, Record<string, string>> = {
  stats_planned: { he: 'מתוכננות', en: 'Planned' },
  stats_completed: { he: 'הושלמו', en: 'Completed' },
  stats_completion_rate: { he: 'אחוז השלמה', en: 'Completion rate' },
  stats_focus_minutes_by_day: { he: '⏱️ דקות מיקוד ביום', en: '⏱️ Focus minutes per day' },
  stats_upcoming_title: { he: '📌 מבחנים והגשות קרובים', en: '📌 Upcoming exams & submissions' },
  stats_focus_sessions: { he: '🎯 סשני מיקוד שהושלמו', en: '🎯 Focus sessions completed' },
  stats_active_streak: { he: '🔥 ימי פעילות ברצף', en: '🔥 Active-day streak' },
  stats_by_course: { he: '📚 לפי קורס', en: '📚 By course' },
  stats_no_course_data: { he: 'אין עדיין נתונים לפי קורס בטווח הזה', en: 'No course data in this range yet' },
  stats_days_unit: { he: 'ימים', en: 'days' },
  stats_min_unit: { he: 'דק׳', en: 'min' },
};

type Range = 'week' | 'month';

export default function Stats() {
  const { t, lang, isRtl } = useI18n();
  const { tokens } = useSfTheme();
  const { tasks, scheduleItems, courseById } = useData();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);

  const [range, setRange] = useState<Range>('week');
  const [dailyStats, setDailyStats] = useState<DailyStatsMap>({});
  const [sessionsCount, setSessionsCount] = useState(0);

  useEffect(() => {
    setDailyStats(readDailyStats());
    setSessionsCount(readFocusSessionsCount());
  }, []);

  const rangeDays = range === 'week' ? 7 : 30;

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    const arr: Date[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) arr.push(addDays(today, -i));
    return arr;
  }, [rangeDays]);

  const dayKeys = useMemo(() => days.map(dateKey), [days]);
  const keySet = useMemo(() => new Set(dayKeys), [dayKeys]);

  const tasksCompletedByDay = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(dayKeys.map((k) => [k, 0]));
    for (const task of tasks) {
      if (!task.isCompleted || !task.completedAt) continue;
      const k = dateKey(new Date(task.completedAt));
      if (k in counts) counts[k] += 1;
    }
    return counts;
  }, [tasks, dayKeys]);

  const plannedInRange = useMemo(
    () => tasks.filter((task) => task.dueDateTime && keySet.has(dateKey(new Date(task.dueDateTime)))).length,
    [tasks, keySet],
  );
  const completedInRange = useMemo(
    () => dayKeys.reduce((sum, k) => sum + (tasksCompletedByDay[k] ?? 0), 0),
    [dayKeys, tasksCompletedByDay],
  );
  const completionRate = plannedInRange > 0 ? Math.round((completedInRange / plannedInRange) * 100) : 0;

  const focusMinutesByDay = useMemo(
    () => dayKeys.map((k) => dailyStats[k]?.focusMinutes ?? 0),
    [dayKeys, dailyStats],
  );
  const totalFocusMinutes = focusMinutesByDay.reduce((a, b) => a + b, 0);
  const totalFocusHours = Math.floor(totalFocusMinutes / 60);
  const totalFocusRemMinutes = totalFocusMinutes % 60;

  const upcomingCount = useMemo(() => {
    const now = Date.now();
    return scheduleItems.filter(
      (s) => (s.type === 'exam' || s.type === 'submission') && new Date(s.startDateTime).getTime() >= now,
    ).length;
  }, [scheduleItems]);

  const activeStreak = useMemo(() => computeActiveDayStreak(dailyStats), [dailyStats]);

  const courseBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      if (!task.isCompleted || !task.completedAt || !task.courseId) continue;
      const k = dateKey(new Date(task.completedAt));
      if (!keySet.has(k)) continue;
      counts.set(task.courseId, (counts.get(task.courseId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([courseId, count]) => ({ course: courseById(courseId), count }))
      .filter((row) => row.course)
      .sort((a, b) => b.count - a.count);
  }, [tasks, keySet, courseById]);

  const barLabels = useMemo(
    () =>
      days.map((d, i) => {
        if (range === 'week') return String(d.getDate());
        return i % 5 === 0 || i === days.length - 1 ? String(d.getDate()) : '';
      }),
    [days, range],
  );

  const tasksBarValues = dayKeys.map((k) => tasksCompletedByDay[k] ?? 0);

  const consistencyLevelFor = (key: string): number => {
    const minutes = dailyStats[key]?.focusMinutes ?? 0;
    if (minutes <= 0) return 0;
    if (minutes < 15) return 1;
    if (minutes < 30) return 2;
    if (minutes < 60) return 3;
    return 4;
  };

  return (
    <div className="max-w-3xl mx-auto pb-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-extrabold tracking-tight mb-4">{t('stats_title')}</h1>

      <div
        className="inline-flex p-1 rounded-[var(--sf-radius)] mb-5"
        style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}` }}
      >
        {(['week', 'month'] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="px-5 py-2 rounded-[var(--sf-radius-sm)] text-sm font-bold"
            style={{ background: range === r ? tokens.accent : 'transparent', color: range === r ? tokens.onAccent : tokens.textDim }}
          >
            {t(r === 'week' ? 'range_week' : 'range_month')}
          </button>
        ))}
      </div>

      {/* headline card */}
      <div
        className="rounded-[var(--sf-radius-lg)] p-5 mb-4"
        style={{ background: 'var(--sf-accent-gradient)', boxShadow: tokens.glow !== 'none' ? tokens.glow : undefined }}
      >
        <p className="text-xs font-bold" style={{ color: tokens.onAccent }}>
          {t('total_study_time')}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-4xl font-black" style={{ color: tokens.onAccent }}>
            {totalFocusHours > 0 ? `${totalFocusHours}:${String(totalFocusRemMinutes).padStart(2, '0')}` : `${totalFocusRemMinutes}`}
          </span>
          <span className="text-lg font-bold" style={{ color: tokens.onAccent }}>
            {totalFocusHours > 0 ? t('hours') : t('minutes')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatTile label={tt('stats_planned')} value={plannedInRange} tokens={tokens} />
        <StatTile label={tt('stats_completed')} value={completedInRange} tokens={tokens} />
        <StatTile label={tt('stats_upcoming_title')} value={upcomingCount} tokens={tokens} compact />
      </div>

      <div className="flex gap-4 mb-5">
        <div
          className="flex-1 rounded-[var(--sf-radius)] p-4 flex items-center gap-4"
          style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`, boxShadow: tokens.cardShadow }}
        >
          <ProgressRing size={64} stroke={7} progress={completionRate / 100} track={tokens.ringTrack} colorStart={tokens.accent} colorEnd={tokens.accent2}>
            <span className="text-sm font-extrabold">{completionRate}%</span>
          </ProgressRing>
          <div>
            <p className="text-xs font-bold" style={{ color: tokens.textDim }}>
              {tt('stats_completion_rate')}
            </p>
            <p className="text-xs" style={{ color: tokens.textFaint }}>
              {completedInRange}/{plannedInRange || 0}
            </p>
          </div>
        </div>
      </div>

      <Card title={tt('stats_focus_minutes_by_day')} tokens={tokens}>
        <BarChart values={focusMinutesByDay} labels={barLabels} color={tokens.accentSoft} highlightColor={tokens.accent} valueSuffix={` ${tt('stats_min_unit')}`} />
      </Card>

      <Card title={t('tasks_trend')} tokens={tokens}>
        <BarChart values={tasksBarValues} labels={barLabels} color={tokens.accent2} highlightColor={tokens.accent} />
      </Card>

      <Card title={t('study_consistency')} tokens={tokens}>
        <Heatmap weeks={12} accent={tokens.accent} track={tokens.ringTrack} levelFor={consistencyLevelFor} />
      </Card>

      <Card title={tt('stats_by_course')} tokens={tokens}>
        {courseBreakdown.length === 0 ? (
          <p className="text-sm" style={{ color: tokens.textFaint }}>
            {tt('stats_no_course_data')}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {courseBreakdown.map(({ course, count }) => (
              <div key={course!.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: argbToCss(course!.color) }} />
                  <span className="text-sm font-semibold truncate">{course!.name}</span>
                </div>
                <span className="text-sm font-bold shrink-0" style={{ color: tokens.textDim }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label={tt('stats_focus_sessions')} value={sessionsCount} tokens={tokens} />
        <StatTile label={tt('stats_active_streak')} value={activeStreak} unit={tt('stats_days_unit')} tokens={tokens} />
      </div>
    </div>
  );
}

function Card({ title, tokens, children }: { title: string; tokens: ReturnType<typeof useSfTheme>['tokens']; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[var(--sf-radius)] p-4 mb-5"
      style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`, boxShadow: tokens.cardShadow }}
    >
      <p className="text-sm font-extrabold mb-3">{title}</p>
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
  unit,
  tokens,
  compact,
}: {
  label: string;
  value: number;
  unit?: string;
  tokens: ReturnType<typeof useSfTheme>['tokens'];
  compact?: boolean;
}) {
  return (
    <div
      className="rounded-[var(--sf-radius)] p-3.5 text-center"
      style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}` }}
    >
      <p className="text-2xl font-black" style={{ color: tokens.accent }}>
        {value}
        {unit ? <span className="text-sm font-bold ms-1">{unit}</span> : null}
      </p>
      <p className={`font-semibold mt-1 ${compact ? 'text-[10px]' : 'text-xs'}`} style={{ color: tokens.textDim }}>
        {label}
      </p>
    </div>
  );
}
