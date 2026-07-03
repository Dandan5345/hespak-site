import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useSfTheme } from '../theme/ThemeProvider';
import { Heatmap } from '../components/habits/Heatmap';
import {
  computeStreaks,
  deleteHabitLog,
  genHabitId,
  readHabitLog,
  readHabits,
  toggleToday,
  todayKey,
  writeHabits,
  type Habit,
} from '../components/habits/habitsStore';

const EXTRA: Record<string, Record<string, string>> = {
  habit_name_ph: { he: 'שם ההרגל…', en: 'Habit name…' },
  habit_emoji_ph: { he: '🔥', en: '🔥' },
  habit_add_confirm: { he: '✅ הוסף הרגל', en: '✅ Add habit' },
  habit_current_streak: { he: 'רצף נוכחי', en: 'Current streak' },
  habit_best_streak: { he: 'השיא', en: 'Best' },
  habit_mark_today: { he: 'סמן היום', en: 'Mark today' },
  habit_done_today: { he: 'בוצע היום ✓', en: 'Done today ✓' },
  habit_remove: { he: 'מחיקה', en: 'Delete' },
  habit_new_title: { he: '✨ הרגל חדש', en: '✨ New habit' },
  habit_days_unit: { he: 'ימים', en: 'days' },
};

const EMOJI_CHOICES = ['🔥', '📚', '💧', '🏃', '🧘', '🎯', '💤', '🥗'];

export default function Habits() {
  const { t, lang, isRtl } = useI18n();
  const { tokens } = useSfTheme();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Record<string, Record<string, boolean>>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);

  useEffect(() => {
    const loaded = readHabits();
    setHabits(loaded);
    const nextLogs: Record<string, Record<string, boolean>> = {};
    for (const h of loaded) nextLogs[h.id] = readHabitLog(h.id);
    setLogs(nextLogs);
  }, []);

  const addHabit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const habit: Habit = { id: genHabitId(), name: trimmed, emoji, createdAt: new Date().toISOString() };
    const next = [...habits, habit];
    setHabits(next);
    writeHabits(next);
    setLogs((prev) => ({ ...prev, [habit.id]: {} }));
    setName('');
    setEmoji(EMOJI_CHOICES[0]);
    setShowAdd(false);
  };

  const removeHabit = (id: string) => {
    const next = habits.filter((h) => h.id !== id);
    setHabits(next);
    writeHabits(next);
    deleteHabitLog(id);
    setLogs((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const toggle = (id: string) => {
    const nextLog = toggleToday(id);
    setLogs((prev) => ({ ...prev, [id]: nextLog }));
  };

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <h1 className="text-2xl font-extrabold tracking-tight mb-5">{t('my_habits')}</h1>

      {habits.length === 0 && (
        <div
          className="rounded-[var(--sf-radius-lg)] p-10 text-center mb-5"
          style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`, boxShadow: tokens.cardShadow }}
        >
          <div className="text-5xl mb-3">🔥</div>
          <p className="font-semibold" style={{ color: tokens.textDim }}>
            {t('empty_habits')}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 mb-5">
        {habits.map((habit) => {
          const log = logs[habit.id] ?? {};
          const { current, best } = computeStreaks(log);
          const doneToday = !!log[todayKey()];
          return (
            <div
              key={habit.id}
              className="rounded-[var(--sf-radius)] p-4"
              style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`, boxShadow: tokens.cardShadow }}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl shrink-0">{habit.emoji ?? '⭐'}</span>
                  <span className="font-bold truncate">{habit.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggle(habit.id)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold"
                    style={{
                      background: doneToday ? tokens.accent : tokens.accentSoft,
                      color: doneToday ? tokens.onAccent : tokens.accent,
                    }}
                  >
                    {doneToday ? tt('habit_done_today') : tt('habit_mark_today')}
                  </button>
                  <button
                    onClick={() => removeHabit(habit.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                    style={{ background: tokens.surface2, color: tokens.textFaint }}
                    aria-label={tt('habit_remove')}
                    title={tt('habit_remove')}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-3 text-xs font-semibold" style={{ color: tokens.textDim }}>
                <span>
                  🔥 {tt('habit_current_streak')}: <b style={{ color: tokens.accent }}>{current}</b> {tt('habit_days_unit')}
                </span>
                <span>
                  🏆 {tt('habit_best_streak')}: <b>{best}</b> {tt('habit_days_unit')}
                </span>
              </div>

              <Heatmap weeks={12} accent={tokens.accent} track={tokens.ringTrack} log={log} />
            </div>
          );
        })}
      </div>

      {showAdd ? (
        <div
          className="rounded-[var(--sf-radius)] p-4"
          style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`, boxShadow: tokens.cardShadow }}
        >
          <p className="font-bold mb-3">{tt('habit_new_title')}</p>
          <div className="flex gap-2 mb-3">
            <div className="flex gap-1.5 flex-wrap">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className="w-9 h-9 rounded-[var(--sf-radius-sm)] flex items-center justify-center text-lg"
                  style={{
                    background: emoji === e ? tokens.accentSoft : tokens.surface2,
                    border: emoji === e ? `2px solid ${tokens.accent}` : '2px solid transparent',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHabit()}
            placeholder={tt('habit_name_ph')}
            dir={isRtl ? 'rtl' : 'ltr'}
            className="w-full rounded-[var(--sf-radius-sm)] px-3 py-2.5 text-sm mb-3"
            style={{ background: tokens.surface2, border: `1px solid ${tokens.cardBorderColor}`, color: tokens.text }}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={addHabit}
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-[var(--sf-radius-sm)] font-bold text-sm disabled:opacity-50"
              style={{ background: tokens.accent, color: tokens.onAccent }}
            >
              {tt('habit_add_confirm')}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 py-2.5 rounded-[var(--sf-radius-sm)] font-bold text-sm"
              style={{ background: tokens.surface2, color: tokens.textDim }}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-4 rounded-[var(--sf-radius)] font-extrabold text-center"
          style={{ background: tokens.accentSoft, color: tokens.accent, border: `2px solid ${tokens.accent}` }}
        >
          {t('add_habit')}
        </button>
      )}
    </div>
  );
}
