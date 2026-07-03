import { useEffect, useState, type CSSProperties } from 'react';
import { useData } from '../../state/DataContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useSfTheme } from '../../theme/ThemeProvider';
import type { Task, Urgency } from '../../state/types';
import { URGENCY_OPTIONS, urgencyMeta } from './urgencyMeta';

const EXTRA: Record<string, Record<string, string>> = {
  edit_task_title: { he: '✏️ עריכת משימה', en: '✏️ Edit task' },
  remove_due: { he: '✕ הסר מועד', en: '✕ Remove due date' },
  estimate_unit_hint: { he: 'בדקות', en: 'in minutes' },
};

interface Props {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultCourseId?: string | null;
}

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function toTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Add/edit form for a Task, standing in for lib/screens onboarding's manual
 * task sheet + task_detail_screen.dart's edit flow. Rendered as a bottom
 * sheet on mobile widths, a centered modal above that. */
export function TaskFormModal({ open, onClose, task, defaultCourseId }: Props) {
  const { t, lang, dir } = useI18n();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);
  const { tokens } = useSfTheme();
  const { courses, addTask, updateTask } = useData();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [hasDue, setHasDue] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('09:00');
  const [urgency, setUrgency] = useState<Urgency>('not_urgent');
  const [estimate, setEstimate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setCourseId(task.courseId ?? '');
      if (task.dueDateTime) {
        const d = new Date(task.dueDateTime);
        setHasDue(true);
        setDueDate(toDateInput(d));
        setDueTime(toTimeInput(d));
      } else {
        setHasDue(false);
        setDueDate('');
        setDueTime('09:00');
      }
      setUrgency(task.urgency);
      setEstimate(task.estimatedDurationMinutes ? String(task.estimatedDurationMinutes) : '');
    } else {
      setTitle('');
      setDescription('');
      setCourseId(defaultCourseId ?? '');
      setHasDue(false);
      setDueDate('');
      setDueTime('09:00');
      setUrgency('not_urgent');
      setEstimate('');
    }
    setError('');
  }, [open, task, defaultCourseId]);

  if (!open) return null;

  const fieldStyle: CSSProperties = {
    background: tokens.surface2,
    border: `var(--sf-card-border-width) solid var(--sf-card-border-color)`,
    color: tokens.text,
  };

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError(t('task_need_title'));
      return;
    }
    const dueDateTime = hasDue && dueDate ? new Date(`${dueDate}T${dueTime || '00:00'}`).toISOString() : null;
    const parsedEstimate = estimate.trim() ? Math.max(0, parseInt(estimate, 10) || 0) : null;
    const patch = {
      title: trimmed,
      description: description.trim() || null,
      courseId: courseId || null,
      dueDateTime,
      urgency,
      estimatedDurationMinutes: parsedEstimate,
    };
    if (task) {
      updateTask(task.id, patch);
    } else {
      addTask(patch);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(10, 10, 20, 0.5)' }}
      onClick={onClose}
    >
      <div
        dir={dir}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-[var(--sf-radius-lg)] sm:rounded-[var(--sf-radius-lg)] p-5"
        style={{
          background: tokens.surface,
          border: `var(--sf-card-border-width) solid var(--sf-card-border-color)`,
          boxShadow: 'var(--sf-card-shadow)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold" style={{ color: tokens.text }}>
            {task ? tt('edit_task_title') : t('new_task')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('cancel')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{ color: tokens.textDim, background: tokens.surface2 }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('task_title_ph')}
            className="w-full rounded-[var(--sf-radius-sm)] px-3.5 py-2.5 text-sm font-semibold outline-none"
            style={fieldStyle}
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('task_desc_ph')}
            rows={2}
            className="w-full rounded-[var(--sf-radius-sm)] px-3.5 py-2.5 text-sm font-medium outline-none resize-none"
            style={fieldStyle}
          />

          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: tokens.textDim }}>
              {t('course')}
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-[var(--sf-radius-sm)] px-3.5 py-2.5 text-sm font-semibold outline-none"
              style={fieldStyle}
            >
              <option value="">{t('tc_no_course')}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: tokens.textDim }}>
              {t('urgency')}
            </label>
            <div className="flex items-center gap-2">
              {URGENCY_OPTIONS.map((u) => {
                const meta = urgencyMeta(u);
                const active = urgency === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u)}
                    className="flex-1 rounded-full py-2 text-xs font-extrabold"
                    style={{
                      background: active ? meta.bg : tokens.surface2,
                      color: active ? meta.color : tokens.textDim,
                      border: `1.5px solid ${active ? meta.color : 'transparent'}`,
                    }}
                  >
                    {t(meta.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: tokens.textDim }}>
              {t('task_due')}
            </label>
            {hasDue ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 rounded-[var(--sf-radius-sm)] px-3 py-2 text-sm font-semibold outline-none"
                  style={fieldStyle}
                />
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-28 rounded-[var(--sf-radius-sm)] px-3 py-2 text-sm font-semibold outline-none"
                  style={fieldStyle}
                />
                <button
                  type="button"
                  onClick={() => {
                    setHasDue(false);
                    setDueDate('');
                  }}
                  className="text-xs font-bold shrink-0"
                  style={{ color: tokens.textFaint }}
                >
                  {tt('remove_due')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setHasDue(true);
                  setDueDate(toDateInput(new Date()));
                }}
                className="rounded-[var(--sf-radius-sm)] px-3.5 py-2 text-sm font-bold"
                style={{ ...fieldStyle, color: tokens.accent }}
              >
                {t('task_add_due')}
              </button>
            )}
          </div>

          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: tokens.textDim }}>
              {t('task_estimate')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="60"
                className="w-28 rounded-[var(--sf-radius-sm)] px-3.5 py-2.5 text-sm font-semibold outline-none"
                style={fieldStyle}
              />
              <span className="text-xs font-semibold" style={{ color: tokens.textFaint }}>
                {t('unit_m')} · {tt('estimate_unit_hint')}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold" style={{ color: urgencyMeta('very_urgent').color }}>
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full py-2.5 text-sm font-bold"
              style={{ background: tokens.surface2, color: tokens.textDim }}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={submit}
              className="flex-1 rounded-full py-2.5 text-sm font-bold"
              style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
            >
              {task ? t('save_changes') : t('add_task')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
