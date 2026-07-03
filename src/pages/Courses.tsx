import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../state/DataContext';
import { useI18n } from '../i18n/I18nProvider';
import { useSfTheme } from '../theme/ThemeProvider';
import { CourseCard } from '../components/courses/CourseCard';
import { CourseFormModal } from '../components/courses/CourseFormModal';
import type { Course } from '../state/types';

const EXTRA: Record<string, Record<string, string>> = {
  delete_course_confirm: {
    he: 'למחוק את הקורס "{name}"? המשימות המקושרות לא יימחקו — הן פשוט יהפכו לבלי קורס.',
    en: 'Delete course "{name}"? Linked tasks won\'t be deleted — they\'ll just become course-less.',
  },
};

/** Web analogue of lib/screens/course_screen.dart's course grid + create/edit
 * sheet. Tapping a card routes into Tasks pre-filtered by courseId instead of
 * an inline expand, matching the "simplest" option called out in the spec. */
export default function Courses() {
  const { t, lang } = useI18n();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);
  const { tokens } = useSfTheme();
  const navigate = useNavigate();
  const { courses, tasks, deleteCourse } = useData();
  const [modalCourse, setModalCourse] = useState<Course | 'new' | null>(null);

  const openCourseTasks = (c: Course) => navigate(`/tasks?courseId=${c.id}`);

  const handleDelete = (c: Course) => {
    if (!window.confirm(tt('delete_course_confirm').replace('{name}', c.name))) return;
    deleteCourse(c.id);
  };

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[27px] font-extrabold" style={{ color: tokens.text }}>
          {t('course_name')}
        </h1>
        <button
          type="button"
          onClick={() => setModalCourse('new')}
          className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap"
          style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
        >
          {t('add_course')}
        </button>
      </div>

      {courses.length === 0 ? (
        <div
          className="rounded-[var(--sf-radius-lg)] p-10 text-center"
          style={{
            background: 'var(--sf-surface)',
            border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)',
            boxShadow: 'var(--sf-card-shadow)',
          }}
        >
          <div className="text-5xl mb-3">📚</div>
          <p className="font-semibold mb-4" style={{ color: tokens.textDim }}>
            {t('empty_courses')}
          </p>
          <button
            type="button"
            onClick={() => setModalCourse('new')}
            className="px-5 py-2.5 rounded-full text-sm font-bold"
            style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
          >
            {t('add_course')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {courses.map((c) => {
            const courseTasks = tasks.filter((x) => x.courseId === c.id);
            const openCount = courseTasks.filter((x) => !x.isCompleted).length;
            const doneCount = courseTasks.length - openCount;
            return (
              <CourseCard
                key={c.id}
                course={c}
                openCount={openCount}
                totalCount={courseTasks.length}
                doneCount={doneCount}
                onOpenTasks={() => openCourseTasks(c)}
                onEdit={() => setModalCourse(c)}
                onDelete={() => handleDelete(c)}
              />
            );
          })}
        </div>
      )}

      <CourseFormModal
        open={modalCourse !== null}
        onClose={() => setModalCourse(null)}
        course={modalCourse === 'new' ? null : modalCourse}
      />
    </div>
  );
}
