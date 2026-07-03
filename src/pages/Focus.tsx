import { useEffect, useRef, useState } from 'react';
import { useData } from '../state/DataContext';
import { useI18n } from '../i18n/I18nProvider';
import { useSfTheme } from '../theme/ThemeProvider';
import { ProgressRing } from '../components/focus/ProgressRing';
import {
  MAX_FOCUS_MINUTES,
  MIN_FOCUS_MINUTES,
  clampMinutes,
  clampSeconds,
  consumePendingStartMinutes,
  FOCUS_START_EVENT,
  formatClock,
  loadFocusState,
  persistCompleted,
  persistLinkedTaskId,
  persistPause,
  persistResetOrPreset,
  persistStart,
  readLinkedTaskId,
  readRemainingWhileRunning,
} from '../components/focus/focusStore';
import { addFocusMinutesToday, bumpFocusSessionsCount } from '../components/focus/dailyStats';

const EXTRA: Record<string, Record<string, string>> = {
  focus_preset_classic: { he: '🍅 25 / 5', en: '🍅 25 / 5' },
  focus_preset_deep: { he: '🧠 50 / 10', en: '🧠 50 / 10' },
  focus_preset_short: { he: '☕ 15', en: '☕ 15' },
  focus_link_task_label: { he: '🎯 קשר למשימה (רשות)', en: '🎯 Link to a task (optional)' },
  focus_no_task: { he: 'ללא משימה מקושרת', en: 'No linked task' },
  focus_start_new: { he: '🔁 סשן חדש', en: '🔁 New session' },
  focus_sessions_completed: { he: 'סשנים שהושלמו', en: 'Sessions completed' },
  focus_ready: { he: 'מוכן להתחיל', en: 'Ready to start' },
  focus_running_status: { he: 'רץ עכשיו…', en: 'Running…' },
  focus_custom_range_hint: {
    he: `בין ${MIN_FOCUS_MINUTES} ל-${MAX_FOCUS_MINUTES} דקות (עד 8 שעות)`,
    en: `Between ${MIN_FOCUS_MINUTES} and ${MAX_FOCUS_MINUTES} minutes (up to 8 hours)`,
  },
  focus_from_ai: { he: '🤖 סשן שהתחיל דרך הצ׳אט', en: '🤖 Session started from chat' },
};

const PRESET_SECONDS = {
  classic: 25 * 60,
  deep: 50 * 60,
  short: 15 * 60,
} as const;

export default function Focus() {
  const { t, lang } = useI18n();
  const { tokens } = useSfTheme();
  const { tasks } = useData();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);

  const [totalSeconds, setTotalSeconds] = useState(PRESET_SECONDS.classic);
  const [remainingSeconds, setRemainingSeconds] = useState(PRESET_SECONDS.classic);
  const [running, setRunning] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [toast, setToast] = useState<string | null>(null);
  const [fromAi, setFromAi] = useState(false);
  const [sessionsCount, setSessionsCount] = useState(0);

  const completingRef = useRef(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 3200);
  };

  const startSession = (seconds: number) => {
    const clamped = clampSeconds(seconds);
    persistStart(clamped, clamped);
    setTotalSeconds(clamped);
    setRemainingSeconds(clamped);
    setRunning(true);
    setJustCompleted(false);
    completingRef.current = false;
  };

  function completeSession(totalAtCompletion: number) {
    if (completingRef.current) return;
    completingRef.current = true;
    setRunning(false);
    setRemainingSeconds(0);
    persistCompleted();
    setSessionsCount(bumpFocusSessionsCount());
    addFocusMinutesToday(Math.round(totalAtCompletion / 60));
    setJustCompleted(true);
    showToast(t('focus_complete'));
  }

  // Mount: reconstruct wall-clock state, consume any pending AI-triggered start.
  useEffect(() => {
    const n = Number(localStorage.getItem('sf_focus_sessions_count'));
    setSessionsCount(Number.isFinite(n) && n > 0 ? n : 0);
    setLinkedTaskId(readLinkedTaskId());

    const pendingMinutes = consumePendingStartMinutes();
    if (pendingMinutes) {
      setFromAi(true);
      startSession(pendingMinutes * 60);
      return;
    }
    const st = loadFocusState();
    setTotalSeconds(st.totalSeconds);
    setRemainingSeconds(st.remainingSeconds);
    setRunning(st.running);
    setCustomMinutes(clampMinutes(st.totalSeconds / 60));
    if (st.running && st.remainingSeconds <= 0) {
      completeSession(st.totalSeconds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chat page (mounted app-wide) may fire this while Focus is already open.
  useEffect(() => {
    const handler = () => {
      const minutes = consumePendingStartMinutes();
      if (minutes) {
        setFromAi(true);
        startSession(minutes * 60);
      }
    };
    window.addEventListener(FOCUS_START_EVENT, handler);
    return () => window.removeEventListener(FOCUS_START_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ticking interval, wall-clock based (recomputed from stored end timestamp each tick).
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const remaining = readRemainingWhileRunning();
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        completeSession(totalSeconds);
      }
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, totalSeconds]);

  const handleStart = () => {
    const secs = remainingSeconds > 0 ? remainingSeconds : totalSeconds;
    persistStart(totalSeconds, secs);
    setRemainingSeconds(secs);
    setRunning(true);
    setJustCompleted(false);
    completingRef.current = false;
  };

  const handlePause = () => {
    const remaining = readRemainingWhileRunning();
    persistPause(remaining);
    setRemainingSeconds(remaining);
    setRunning(false);
  };

  const handleReset = () => {
    persistResetOrPreset(totalSeconds, totalSeconds);
    setRemainingSeconds(totalSeconds);
    setRunning(false);
    setJustCompleted(false);
    completingRef.current = false;
  };

  const applyPreset = (seconds: number) => {
    persistResetOrPreset(seconds, seconds);
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    setCustomMinutes(clampMinutes(seconds / 60));
    setRunning(false);
    setJustCompleted(false);
    setShowCustom(false);
    completingRef.current = false;
  };

  const applyCustom = () => {
    applyPreset(clampMinutes(customMinutes) * 60);
  };

  const openTasks = tasks.filter((task) => !task.isCompleted);
  const linkedTask = openTasks.find((task) => task.id === linkedTaskId);

  const progress = totalSeconds === 0 ? 0 : 1 - remainingSeconds / totalSeconds;
  const isCustomActive = !(Object.values(PRESET_SECONDS) as number[]).includes(totalSeconds);

  return (
    <div className="max-w-md mx-auto pb-8">
      <h1 className="text-2xl font-extrabold tracking-tight mb-1 text-center">{t('focus_mode')}</h1>
      <p className="text-center text-sm mb-6 h-4" style={{ color: tokens.textDim }}>
        {fromAi ? tt('focus_from_ai') : running ? tt('focus_running_status') : !justCompleted ? tt('focus_ready') : ''}
      </p>

      {linkedTask && (
        <div className="flex justify-center mb-4">
          <span
            className="px-4 py-1.5 rounded-full text-xs font-bold"
            style={{ background: tokens.accentSoft, color: tokens.accent, border: `1px solid ${tokens.accent}` }}
          >
            🎯 {linkedTask.title}
          </span>
        </div>
      )}

      <div className="flex justify-center my-4">
        <ProgressRing
          size={280}
          stroke={16}
          progress={progress}
          track={tokens.ringTrack}
          colorStart={tokens.accent}
          colorEnd={tokens.accent2}
          glow={tokens.glow !== 'none' ? tokens.glow : undefined}
        >
          <div className="flex flex-col items-center">
            {justCompleted ? (
              <>
                <div className="text-5xl mb-1 animate-bounce">🎉</div>
                <span className="text-sm font-bold" style={{ color: tokens.accent }}>
                  {t('focus_complete')}
                </span>
              </>
            ) : (
              <>
                <span
                  className="text-6xl font-black tabular-nums tracking-tight"
                  style={{ color: running ? tokens.accent : tokens.text }}
                >
                  {formatClock(remainingSeconds)}
                </span>
                <span className="text-sm font-semibold mt-1" style={{ color: tokens.textDim }}>
                  {t('focus_minutes')}
                </span>
              </>
            )}
          </div>
        </ProgressRing>
      </div>

      <div className="flex justify-center items-center gap-4 my-6">
        <button
          onClick={handleReset}
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl"
          style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`, color: tokens.text }}
          aria-label={t('focus_reset')}
        >
          🔄
        </button>
        {justCompleted ? (
          <button
            onClick={() => applyPreset(totalSeconds)}
            className="px-10 py-4 rounded-full font-extrabold text-lg"
            style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent, boxShadow: tokens.glow !== 'none' ? tokens.glow : '0 6px 20px rgba(0,0,0,0.25)' }}
          >
            {tt('focus_start_new')}
          </button>
        ) : (
          <button
            onClick={running ? handlePause : handleStart}
            className="px-10 py-4 rounded-full font-extrabold text-lg"
            style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent, boxShadow: tokens.glow !== 'none' ? tokens.glow : '0 6px 20px rgba(0,0,0,0.25)' }}
          >
            {running ? t('focus_stop') : t('focus_start')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        <PresetChip
          label={tt('focus_preset_classic')}
          active={totalSeconds === PRESET_SECONDS.classic && !isCustomActive}
          onClick={() => applyPreset(PRESET_SECONDS.classic)}
          tokens={tokens}
        />
        <PresetChip
          label={tt('focus_preset_deep')}
          active={totalSeconds === PRESET_SECONDS.deep}
          onClick={() => applyPreset(PRESET_SECONDS.deep)}
          tokens={tokens}
        />
        <PresetChip
          label={tt('focus_preset_short')}
          active={totalSeconds === PRESET_SECONDS.short}
          onClick={() => applyPreset(PRESET_SECONDS.short)}
          tokens={tokens}
        />
        <PresetChip
          label={t('focus_custom')}
          active={isCustomActive}
          onClick={() => setShowCustom((s) => !s)}
          tokens={tokens}
        />
      </div>

      {showCustom && (
        <div
          className="rounded-[var(--sf-radius)] p-4 mb-5"
          style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}` }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">{t('focus_custom_title')}</span>
            <span className="text-sm font-extrabold" style={{ color: tokens.accent }}>
              {customMinutes} {t('minutes')}
            </span>
          </div>
          <input
            type="range"
            min={MIN_FOCUS_MINUTES}
            max={MAX_FOCUS_MINUTES}
            step={5}
            value={customMinutes}
            onChange={(e) => setCustomMinutes(clampMinutes(Number(e.target.value)))}
            className="w-full"
            style={{ accentColor: tokens.accent }}
          />
          <input
            type="number"
            min={MIN_FOCUS_MINUTES}
            max={MAX_FOCUS_MINUTES}
            value={customMinutes}
            onChange={(e) => setCustomMinutes(clampMinutes(Number(e.target.value)))}
            className="w-full mt-2 rounded-[var(--sf-radius-sm)] px-3 py-2 text-sm"
            style={{ background: tokens.surface2, border: `1px solid ${tokens.cardBorderColor}`, color: tokens.text }}
          />
          <p className="text-xs mt-1" style={{ color: tokens.textFaint }}>
            {tt('focus_custom_range_hint')}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={applyCustom}
              className="flex-1 py-2 rounded-[var(--sf-radius-sm)] font-bold text-sm"
              style={{ background: tokens.accent, color: tokens.onAccent }}
            >
              {t('focus_apply')}
            </button>
            <button
              onClick={() => setShowCustom(false)}
              className="flex-1 py-2 rounded-[var(--sf-radius-sm)] font-bold text-sm"
              style={{ background: tokens.surface2, color: tokens.textDim }}
            >
              {t('focus_cancel')}
            </button>
          </div>
        </div>
      )}

      <div
        className="rounded-[var(--sf-radius)] p-4"
        style={{ background: tokens.surface, border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}` }}
      >
        <label className="text-xs font-bold block mb-2" style={{ color: tokens.textDim }}>
          {tt('focus_link_task_label')}
        </label>
        <select
          value={linkedTaskId ?? ''}
          onChange={(e) => {
            const id = e.target.value || null;
            setLinkedTaskId(id);
            persistLinkedTaskId(id);
          }}
          className="w-full rounded-[var(--sf-radius-sm)] px-3 py-2 text-sm"
          style={{ background: tokens.surface2, border: `1px solid ${tokens.cardBorderColor}`, color: tokens.text }}
        >
          <option value="">{tt('focus_no_task')}</option>
          {openTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </div>

      <p className="text-center text-xs mt-4" style={{ color: tokens.textFaint }}>
        {tt('focus_sessions_completed')}: {sessionsCount}
      </p>

      {toast && (
        <div
          className="fixed left-1/2 bottom-24 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-bold z-50 shadow-lg"
          style={{ background: tokens.accent, color: tokens.onAccent }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function PresetChip({
  label,
  active,
  onClick,
  tokens,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tokens: ReturnType<typeof useSfTheme>['tokens'];
}) {
  return (
    <button
      onClick={onClick}
      className="py-2.5 rounded-[var(--sf-radius-sm)] text-xs font-bold text-center truncate"
      style={{
        background: active ? tokens.accent : tokens.surface,
        color: active ? tokens.onAccent : tokens.textDim,
        border: `${tokens.cardBorderWidth}px solid ${active ? tokens.accent : tokens.cardBorderColor}`,
      }}
    >
      {label}
    </button>
  );
}
