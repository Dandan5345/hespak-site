import type { Course, Task } from '../../state/types';
import { argbToCss } from '../../state/types';
import { useI18n } from '../../i18n/I18nProvider';
import { useSfTheme } from '../../theme/ThemeProvider';
import { urgencyMeta } from './urgencyMeta';

function fmtDue(iso: string, todayLabel: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const dateLabel = isToday ? todayLabel : `${dd}/${mm}`;
  return `${dateLabel} · ${hh}:${mi}`;
}

interface Props {
  task: Task;
  course?: Course;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Web analogue of lib/widgets/task_row.dart's "tasks" variant: colored side
 * bar, course chip, due label, urgency pill. Swipe-to-delete is replaced with
 * explicit edit/delete icon buttons since swipe gestures aren't native on web. */
export function TaskRow({ task, course, onToggle, onEdit, onDelete }: Props) {
  const { t } = useI18n();
  const { tokens } = useSfTheme();
  const urg = urgencyMeta(task.urgency);
  const courseColor = course ? argbToCss(course.color) : tokens.accent;
  const due = task.dueDateTime ? fmtDue(task.dueDateTime, t('due_today')) : null;
  const overdue = !task.isCompleted && !!task.dueDateTime && new Date(task.dueDateTime) < new Date();

  return (
    <div
      className="relative flex items-start gap-3 rounded-[var(--sf-radius)] py-3.5 ps-3.5 pe-4 overflow-hidden"
      style={{
        background: 'var(--sf-surface)',
        border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)',
        boxShadow: 'var(--sf-card-shadow)',
      }}
    >
      <span
        className="absolute inset-y-0"
        style={{ insetInlineEnd: 0, width: 5, background: courseColor }}
        aria-hidden
      />

      <button
        type="button"
        onClick={onToggle}
        aria-label={t('task_done')}
        className="mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
        style={{
          border: `2px solid ${task.isCompleted ? tokens.accent : tokens.textFaint}`,
          background: task.isCompleted ? tokens.accent : 'transparent',
        }}
      >
        {task.isCompleted && (
          <span style={{ fontSize: 12, color: tokens.onAccent, lineHeight: 1 }}>✓</span>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className="font-bold text-[15px] truncate"
          style={{
            color: task.isCompleted ? tokens.textFaint : tokens.text,
            textDecoration: task.isCompleted ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {course && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full truncate max-w-[140px]"
              style={{ background: tokens.accentSoft, color: courseColor }}
            >
              {course.name}
            </span>
          )}
          {due && (
            <span
              className="text-xs font-semibold whitespace-nowrap"
              style={{ color: overdue ? urgencyMeta('veryUrgent').color : tokens.textDim }}
            >
              📅 {due}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <span
          className="text-[11px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ background: urg.bg, color: urg.color }}
        >
          {t(urg.labelKey)}
        </span>
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
