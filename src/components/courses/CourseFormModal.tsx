import { useEffect, useState, type CSSProperties } from 'react';
import { useData } from '../../state/DataContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useSfTheme } from '../../theme/ThemeProvider';
import { cssToArgb } from '../../state/types';
import type { Course } from '../../state/types';

const PRESET_COLORS = [
  '#6366F1',
  '#A855F7',
  '#EC4899',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#14B8A6',
  '#3B82F6',
  '#8B5CF6',
  '#F97316',
  '#84CC16',
  '#64748B',
];

const EXTRA: Record<string, Record<string, string>> = {
  edit_course_title: { he: '✏️ עריכת קורס', en: '✏️ Edit course' },
  course_color_label: { he: '🎨 צבע', en: '🎨 Color' },
  custom_color: { he: 'צבע מותאם אישית', en: 'Custom color' },
};

interface Props {
  open: boolean;
  onClose: () => void;
  course?: Course | null;
}

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

function argbToHex(argb: number): string {
  const r = (argb >>> 16) & 0xff;
  const g = (argb >>> 8) & 0xff;
  const b = argb & 0xff;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Add/edit form for a Course, standing in for the "create course" sheet
 * reachable from lib/screens/course_screen.dart / tasks_courses_screen.dart. */
export function CourseFormModal({ open, onClose, course }: Props) {
  const { t, lang, dir } = useI18n();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);
  const { tokens } = useSfTheme();
  const { addCourse, updateCourse } = useData();

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (course) {
      setName(course.name);
      setColor(argbToHex(course.color));
      setDescription(course.description ?? '');
      setStartDate(course.startDate ? toDateInput(course.startDate) : '');
      setEndDate(course.endDate ? toDateInput(course.endDate) : '');
    } else {
      setName('');
      setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
      setDescription('');
      setStartDate('');
      setEndDate('');
    }
    setError('');
  }, [open, course]);

  if (!open) return null;

  const fieldStyle: CSSProperties = {
    background: tokens.surface2,
    border: `var(--sf-card-border-width) solid var(--sf-card-border-color)`,
    color: tokens.text,
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('course_need_title'));
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setError(t('course_end_before_start'));
      return;
    }
    const patch = {
      name: trimmed,
      color: cssToArgb(color),
      description: description.trim() || null,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
    };
    if (course) {
      updateCourse(course.id, patch);
    } else {
      addCourse(patch);
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
            {course ? tt('edit_course_title') : t('add_course')}
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('course_title_ph')}
            className="w-full rounded-[var(--sf-radius-sm)] px-3.5 py-2.5 text-sm font-semibold outline-none"
            style={fieldStyle}
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('course_desc_ph')}
            rows={2}
            className="w-full rounded-[var(--sf-radius-sm)] px-3.5 py-2.5 text-sm font-medium outline-none resize-none"
            style={fieldStyle}
          />

          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: tokens.textDim }}>
              {tt('course_color_label')}
            </label>
            <div className="flex items-center flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className="w-7 h-7 rounded-full shrink-0"
                  style={{
                    background: c,
                    outline: color.toLowerCase() === c.toLowerCase() ? `2px solid ${tokens.text}` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label={tt('custom_color')}
                className="w-7 h-7 rounded-full overflow-hidden border-0 p-0 shrink-0"
                style={{ background: 'transparent' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: tokens.textDim }}>
              {t('course_dates')}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <span className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textFaint }}>
                  {t('course_start')}
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-[var(--sf-radius-sm)] px-3 py-2 text-sm font-semibold outline-none"
                  style={fieldStyle}
                />
              </div>
              <div className="flex-1">
                <span className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textFaint }}>
                  {t('course_end')}
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-[var(--sf-radius-sm)] px-3 py-2 text-sm font-semibold outline-none"
                  style={fieldStyle}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold" style={{ color: '#EF4444' }}>
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
              {course ? t('save_changes') : t('add_course')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
