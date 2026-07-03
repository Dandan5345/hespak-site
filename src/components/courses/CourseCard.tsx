import type { Course } from '../../state/types';
import { argbToCss } from '../../state/types';
import { useI18n } from '../../i18n/I18nProvider';
import { useSfTheme } from '../../theme/ThemeProvider';

const EXTRA: Record<string, Record<string, string>> = {
  open_tasks_count: { he: '{count} משימות פתוחות', en: '{count} open tasks' },
};

interface Props {
  course: Course;
  openCount: number;
  totalCount: number;
  doneCount: number;
  onOpenTasks: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatDateRange(course: Course, t: (k: string) => string): string | null {
  if (!course.startDate && !course.endDate) return null;
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  const start = course.startDate ? fmt(course.startDate) : null;
  const end = course.endDate ? fmt(course.endDate) : null;
  if (start && end) return `${t('course_start')}: ${start} · ${t('course_end')}: ${end}`;
  if (start) return `${t('course_start')}: ${start}`;
  return `${t('course_end')}: ${end}`;
}

/** Web analogue of lib/screens/course_screen.dart's _CourseCard: color dot,
 * name, description, date range and a done/total progress bar, plus an
 * explicit open-task count (spec'd for the web card). */
export function CourseCard({ course, openCount, totalCount, doneCount, onOpenTasks, onEdit, onDelete }: Props) {
  const { t, lang } = useI18n();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);
  const { tokens } = useSfTheme();
  const color = argbToCss(course.color);
  const progress = totalCount === 0 ? 0 : doneCount / totalCount;
  const dateRange = formatDateRange(course, t);

  return (
    <div
      className="rounded-[var(--sf-radius)] p-4 flex flex-col gap-2.5"
      style={{
        background: 'var(--sf-surface)',
        border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)',
        boxShadow: 'var(--sf-card-shadow)',
      }}
    >
      <button type="button" onClick={onOpenTasks} className="flex items-center gap-2.5 text-start">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} aria-hidden />
        <h3 className="flex-1 min-w-0 font-extrabold text-[16px] truncate" style={{ color: tokens.text }}>
          {course.name}
        </h3>
        <span className="text-xs font-bold shrink-0 whitespace-nowrap" style={{ color: tokens.textDim }}>
          {tt('open_tasks_count').replace('{count}', String(openCount))}
        </span>
      </button>

      {course.description?.trim() && (
        <p className="text-[13px] font-medium" style={{ color: tokens.textDim }}>
          {course.description.trim()}
        </p>
      )}
      {dateRange && (
        <p className="text-xs font-bold" style={{ color: tokens.textDim }}>
          {dateRange}
        </p>
      )}

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: tokens.ringTrack }}>
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${Math.round(progress * 100)}%`, background: color }}
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onOpenTasks} className="text-xs font-bold" style={{ color: tokens.accent }}>
          {t('course_tasks')}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={t('edit')}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ color: tokens.textDim }}
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('delete')}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ color: tokens.textDim }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
