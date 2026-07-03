import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../state/DataContext';
import { useI18n } from '../i18n/I18nProvider';
import { useSfTheme } from '../theme/ThemeProvider';
import { TaskRow } from '../components/tasks/TaskRow';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import type { Task } from '../state/types';

type Filter = 'all' | 'high' | 'today' | 'done';

const EXTRA: Record<string, Record<string, string>> = {
  delete_task_confirm: {
    he: 'למחוק את המשימה "{title}"? הפעולה לא ניתנת לביטול.',
    en: 'Delete task "{title}"? This cannot be undone.',
  },
  filtered_by_course: { he: 'מסונן לפי: {name}', en: 'Filtered by: {name}' },
  clear_filter: { he: '✕ נקה', en: '✕ Clear' },
};

function isDueToday(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/** Web analogue of lib/screens/tasks_screen.dart: filter chips + task list,
 * plus lib/screens/task_detail_screen.dart's edit affordance folded into the
 * same add/edit modal (no separate detail route on web). */
export default function Tasks() {
  const { t, lang } = useI18n();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);
  const { tokens } = useSfTheme();
  const { tasks, courseById, updateTask, deleteTask } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const courseFilterId = searchParams.get('courseId');
  const [filter, setFilter] = useState<Filter>('all');
  const [modalTask, setModalTask] = useState<Task | 'new' | null>(null);

  const filterCourse = courseFilterId ? courseById(courseFilterId) : undefined;

  const filtered = useMemo(() => {
    let list = tasks;
    if (courseFilterId) list = list.filter((x) => x.courseId === courseFilterId);
    if (filter === 'high') list = list.filter((x) => x.urgency === 'urgent' || x.urgency === 'veryUrgent');
    else if (filter === 'today') list = list.filter((x) => isDueToday(x.dueDateTime));
    else if (filter === 'done') list = list.filter((x) => x.isCompleted);

    return [...list].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      if (a.isCompleted) return (b.completedAt ?? '').localeCompare(a.completedAt ?? '');
      if (a.dueDateTime && b.dueDateTime) return a.dueDateTime.localeCompare(b.dueDateTime);
      if (a.dueDateTime) return -1;
      if (b.dueDateTime) return 1;
      return 0;
    });
  }, [tasks, filter, courseFilterId]);

  const activeCount = tasks.filter((x) => !x.isCompleted).length;

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filter_all') },
    { key: 'high', label: t('filter_urgent') },
    { key: 'today', label: t('filter_today') },
    { key: 'done', label: t('filter_done') },
  ];

  const toggleTask = (task: Task) => {
    updateTask(task.id, {
      isCompleted: !task.isCompleted,
      completedAt: !task.isCompleted ? new Date().toISOString() : null,
    });
  };

  const removeTask = (task: Task) => {
    if (!window.confirm(tt('delete_task_confirm').replace('{title}', task.title))) return;
    deleteTask(task.id);
  };

  const clearCourseFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('courseId');
    setSearchParams(next);
  };

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[27px] font-extrabold" style={{ color: tokens.text }}>
          {t('my_tasks')}
        </h1>
        <span className="text-sm font-semibold whitespace-nowrap" style={{ color: tokens.textDim }}>
          {t('active_count').replace('{count}', String(activeCount))}
        </span>
      </div>

      {filterCourse && (
        <div className="flex items-center gap-2 mt-3">
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: tokens.accentSoft, color: tokens.accent }}
          >
            🎯 {tt('filtered_by_course').replace('{name}', filterCourse.name)}
          </span>
          <button
            type="button"
            onClick={clearCourseFilter}
            className="text-xs font-bold"
            style={{ color: tokens.textDim }}
          >
            {tt('clear_filter')}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className="shrink-0 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap"
            style={{
              background: filter === f.key ? 'var(--sf-accent-gradient)' : 'var(--sf-surface)',
              color: filter === f.key ? tokens.onAccent : tokens.textDim,
              border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)',
            }}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setModalTask('new')}
          className="shrink-0 ms-auto px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap"
          style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
        >
          {t('add_task')}
        </button>
      </div>

      <div className="flex flex-col gap-2.5 mt-4">
        {tasks.length === 0 ? (
          <div
            className="rounded-[var(--sf-radius-lg)] p-10 text-center mt-4"
            style={{
              background: 'var(--sf-surface)',
              border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)',
              boxShadow: 'var(--sf-card-shadow)',
            }}
          >
            <div className="text-5xl mb-3">✅</div>
            <p className="font-semibold mb-4" style={{ color: tokens.textDim }}>
              {t('tc_empty')}
            </p>
            <button
              type="button"
              onClick={() => setModalTask('new')}
              className="px-5 py-2.5 rounded-full text-sm font-bold"
              style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
            >
              {t('add_task')}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-[var(--sf-radius-lg)] p-8 text-center mt-2"
            style={{
              background: 'var(--sf-surface)',
              border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)',
            }}
          >
            <p className="font-semibold" style={{ color: tokens.textDim }}>
              {t('tc_no_results')}
            </p>
          </div>
        ) : (
          filtered.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              course={courseById(task.courseId)}
              onToggle={() => toggleTask(task)}
              onEdit={() => setModalTask(task)}
              onDelete={() => removeTask(task)}
            />
          ))
        )}
      </div>

      <TaskFormModal
        open={modalTask !== null}
        onClose={() => setModalTask(null)}
        task={modalTask === 'new' ? null : modalTask}
        defaultCourseId={courseFilterId}
      />
    </div>
  );
}
