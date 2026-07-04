import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useData } from '../../state/DataContext';
import { argbToCss } from '../../state/types';
import type { SfTokens } from '../../theme/tokens';
import { BottomSheet } from './BottomSheet';
import { CheckIcon } from './icons';

/** The 📎 sheet: pick existing tasks and hand them to the AI to weave into the
 * schedule. Mirrors _showTaskPicker in chat_screen.dart. */
export function TaskPickerSheet({ tokens, onAttach, onClose }: { tokens: SfTokens; onAttach: (ids: string[]) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { tasks, courseById } = useData();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const open = tasks.filter((task) => !task.isCompleted);

  return (
    <BottomSheet tokens={tokens} onClose={onClose}>
      <h2 className="text-lg font-extrabold mb-3">{t('chat_pick_tasks')}</h2>
      {open.length === 0 ? (
        <div className="text-sm py-8 text-center" style={{ color: tokens.textDim }}>
          {t('tc_empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {open.map((task) => {
            const isSel = selected.has(task.id);
            const course = courseById(task.courseId);
            return (
              <button
                key={task.id}
                onClick={() => toggle(task.id)}
                className="flex items-center gap-2.5 rounded-[var(--sf-radius-sm)] px-3.5 py-3 text-start transition-colors"
                style={{
                  background: isSel ? tokens.accentSoft : tokens.surface,
                  border: `1px solid ${isSel ? tokens.accent : tokens.navBorderColor}`,
                }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    background: isSel ? 'var(--sf-accent-gradient)' : 'transparent',
                    border: isSel ? 'none' : `2px solid ${tokens.textFaint}`,
                    color: tokens.onAccent,
                  }}
                >
                  {isSel && <CheckIcon size={12} />}
                </span>
                <span className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: tokens.text }}>
                  {task.title}
                </span>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: course ? argbToCss(course.color) : tokens.accent }} />
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => {
          onAttach([...selected]);
          onClose();
        }}
        disabled={selected.size === 0}
        className="w-full h-11 rounded-[var(--sf-radius-sm)] font-extrabold disabled:opacity-45 transition-opacity"
        style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent, boxShadow: tokens.glow !== 'none' ? tokens.glow : undefined }}
      >
        {t('chat_attach_send')}
      </button>
    </BottomSheet>
  );
}
