// Add / edit modal for a SmartReminder — web port of the alarm-clock-style
// sheet in smart_notifications_screen.dart (showReminderSheet / _ReminderForm).
import { useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useData } from '../../state/DataContext';
import type { SmartReminder } from '../../state/types';
import { fromDatetimeLocalValue, toDatetimeLocalValue, toLocalIso } from './dateUtils';
import { useTt } from './i18n';
import { Chip, FieldBox, FieldLabel, GhostButton, ModalShell, PrimaryButton } from './ui';

type LinkKind = 'none' | 'task' | 'schedule';

export function ReminderModal({ reminder, onClose }: { reminder?: SmartReminder; onClose: () => void }) {
  const { t, isRtl } = useI18n();
  const tt = useTt();
  const { tasks, scheduleItems, addSmartReminder, updateSmartReminder, deleteSmartReminder } = useData();

  const initWhen = reminder ? new Date(reminder.dateTime) : new Date(Date.now() + 60 * 60000);
  const [title, setTitle] = useState(reminder?.title ?? '');
  const [description, setDescription] = useState(reminder?.description ?? '');
  const [when, setWhen] = useState(toDatetimeLocalValue(initWhen));
  const [link, setLink] = useState<LinkKind>(reminder?.linkedTaskId ? 'task' : reminder?.linkedScheduleId ? 'schedule' : 'none');
  const [taskId, setTaskId] = useState(reminder?.linkedTaskId ?? '');
  const [scheduleId, setScheduleId] = useState(reminder?.linkedScheduleId ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const finalTitle = title.trim();
    if (!finalTitle) {
      setError(t('smart_notif_need_title'));
      return;
    }
    const patch = {
      title: finalTitle,
      description: description.trim() || null,
      dateTime: toLocalIso(fromDatetimeLocalValue(when)),
      linkedTaskId: link === 'task' ? taskId || null : null,
      linkedScheduleId: link === 'schedule' ? scheduleId || null : null,
    };
    if (reminder) updateSmartReminder(reminder.id, patch);
    else addSmartReminder(patch);
    onClose();
  }

  function handleDelete() {
    if (!reminder) return;
    if (!window.confirm(tt('cal_delete_reminder_confirm'))) return;
    deleteSmartReminder(reminder.id);
    onClose();
  }

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={handleSubmit} dir={isRtl ? 'rtl' : 'ltr'} className="flex flex-col gap-4">
        <h2 className="text-lg font-extrabold">{t(reminder ? 'smart_notif_edit' : 'smart_notif_new')}</h2>

        <div>
          <FieldLabel>{t('smart_notif_when')}</FieldLabel>
          <FieldBox>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full bg-transparent outline-none py-2"
              style={{ color: 'var(--sf-text)' }}
            />
          </FieldBox>
        </div>

        <FieldBox>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('smart_notif_title_ph')}
            className="w-full bg-transparent outline-none py-2 font-semibold"
            style={{ color: 'var(--sf-text)' }}
          />
        </FieldBox>

        <FieldBox>
          <textarea
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('smart_notif_desc_ph')}
            rows={2}
            className="w-full bg-transparent outline-none py-2 resize-none"
            style={{ color: 'var(--sf-text)' }}
          />
        </FieldBox>

        <div>
          <FieldLabel>{t('smart_notif_link_q')}</FieldLabel>
          <div className="flex gap-2">
            <Chip label={t('smart_notif_link_none')} selected={link === 'none'} onClick={() => setLink('none')} />
            <Chip label={t('smart_notif_link_task')} selected={link === 'task'} onClick={() => setLink('task')} />
            <Chip label={t('smart_notif_link_schedule')} selected={link === 'schedule'} onClick={() => setLink('schedule')} />
          </div>
        </div>

        {link === 'task' && (
          <FieldBox>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full bg-transparent outline-none py-2"
              style={{ color: 'var(--sf-text)' }}
            >
              <option value="">{t('smart_notif_pick_task')}</option>
              {tasks.length === 0 && <option disabled>{t('smart_notif_no_tasks')}</option>}
              {tasks.map((tk) => (
                <option key={tk.id} value={tk.id}>
                  {tk.title}
                </option>
              ))}
            </select>
          </FieldBox>
        )}
        {link === 'schedule' && (
          <FieldBox>
            <select
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
              className="w-full bg-transparent outline-none py-2"
              style={{ color: 'var(--sf-text)' }}
            >
              <option value="">{t('smart_notif_pick_schedule')}</option>
              {scheduleItems.length === 0 && <option disabled>{t('smart_notif_no_schedule')}</option>}
              {scheduleItems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </FieldBox>
        )}

        {error && (
          <div className="text-[13px] font-semibold" style={{ color: '#EF4444' }}>
            {error}
          </div>
        )}

        <PrimaryButton type="submit" label={t(reminder ? 'save_changes' : 'smart_notif_save')} />
        {reminder && <GhostButton label={t('smart_notif_delete')} onClick={handleDelete} danger />}
      </form>
    </ModalShell>
  );
}
