// Add / edit modal for a ScheduleItem — mirrors the "New event" quick-add
// sheet + schedule_detail_screen.dart's edit flow in the Flutter app, adapted
// to a single web form (create and edit share layout).
import { useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useData } from '../../state/DataContext';
import type { EventType, ScheduleItem } from '../../state/types';
import { fromDatetimeLocalValue, toDatetimeLocalValue, toLocalIso } from './dateUtils';
import { useTt } from './i18n';
import { Chip, FieldBox, FieldLabel, GhostButton, ModalShell, PrimaryButton, Switch } from './ui';

const TYPES: EventType[] = ['class', 'exam', 'submission', 'personal'];
const TYPE_KEY: Record<EventType, string> = {
  class: 'event_type_class',
  exam: 'event_type_exam',
  submission: 'event_type_submission',
  personal: 'event_type_personal',
};

export function EventModal({
  mode,
  item,
  initialStart,
  onClose,
}: {
  mode: 'new' | 'edit';
  item?: ScheduleItem;
  initialStart?: Date;
  onClose: () => void;
}) {
  const { t, isRtl } = useI18n();
  const tt = useTt();
  const { tasks, addScheduleItem, updateScheduleItem, deleteScheduleItem } = useData();

  const initStart = item ? new Date(item.startDateTime) : (initialStart ?? new Date());
  const initEnd = item ? new Date(item.endDateTime) : new Date(initStart.getTime() + 60 * 60000);

  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [type, setType] = useState<EventType>(item?.type ?? 'personal');
  const [taskId, setTaskId] = useState<string>(item?.taskId ?? '');
  const [allDay, setAllDay] = useState(item?.allDay ?? false);
  const [weeklyRepeat, setWeeklyRepeat] = useState(item?.weeklyRepeat ?? false);
  const [start, setStart] = useState(toDatetimeLocalValue(initStart));
  const [end, setEnd] = useState(toDatetimeLocalValue(initEnd));
  const [error, setError] = useState<string | null>(null);

  const linkedTask = taskId ? tasks.find((tk) => tk.id === taskId) : undefined;

  function handleTaskChange(id: string) {
    setTaskId(id);
    if (id && !title.trim()) {
      const tk = tasks.find((x) => x.id === id);
      if (tk) setTitle(tk.title);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const finalTitle = title.trim() || linkedTask?.title || '';
    if (!finalTitle) {
      setError(t('event_need_title'));
      return;
    }
    const s = fromDatetimeLocalValue(start);
    let en = fromDatetimeLocalValue(end);
    if (en.getTime() <= s.getTime()) {
      if (allDay) {
        en = new Date(s.getTime() + 24 * 60 * 60000);
      } else {
        setError(t('event_end_after_start'));
        return;
      }
    }
    const patch = {
      title: finalTitle,
      description: description.trim() || null,
      taskId: taskId || null,
      type,
      allDay,
      weeklyRepeat,
      startDateTime: toLocalIso(s),
      endDateTime: toLocalIso(en),
    };
    if (mode === 'edit' && item) updateScheduleItem(item.id, patch);
    else addScheduleItem(patch);
    onClose();
  }

  function handleDelete() {
    if (!item) return;
    if (!window.confirm(tt('cal_delete_event_confirm'))) return;
    deleteScheduleItem(item.id);
    onClose();
  }

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={handleSubmit} dir={isRtl ? 'rtl' : 'ltr'} className="flex flex-col gap-4">
        <h2 className="text-lg font-extrabold">{t(mode === 'edit' ? 'edit_event_title' : 'event_title')}</h2>

        <div>
          <FieldLabel>{t('event_type')}</FieldLabel>
          <div className="flex gap-2 flex-wrap">
            {TYPES.map((tp) => (
              <Chip key={tp} label={t(TYPE_KEY[tp])} selected={type === tp} onClick={() => setType(tp)} />
            ))}
          </div>
        </div>

        <FieldBox>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('event_title_ph')}
            className="w-full bg-transparent outline-none py-2 font-semibold"
            style={{ color: 'var(--sf-text)' }}
          />
        </FieldBox>

        <FieldBox>
          <textarea
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('event_desc_ph')}
            rows={2}
            className="w-full bg-transparent outline-none py-2 resize-none"
            style={{ color: 'var(--sf-text)' }}
          />
        </FieldBox>

        <div>
          <FieldLabel>{t('event_link_q')}</FieldLabel>
          <FieldBox>
            <select
              value={taskId}
              onChange={(e) => handleTaskChange(e.target.value)}
              className="w-full bg-transparent outline-none py-2"
              style={{ color: 'var(--sf-text)' }}
            >
              <option value="">{t('event_source_free')}</option>
              {tasks.length === 0 && <option disabled>{t('event_no_tasks')}</option>}
              {tasks.map((tk) => (
                <option key={tk.id} value={tk.id}>
                  {tk.title}
                </option>
              ))}
            </select>
          </FieldBox>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>{t('event_start')}</FieldLabel>
            <FieldBox>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full bg-transparent outline-none py-2"
                style={{ color: 'var(--sf-text)' }}
              />
            </FieldBox>
          </div>
          <div>
            <FieldLabel>{t('event_end')}</FieldLabel>
            <FieldBox>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full bg-transparent outline-none py-2"
                style={{ color: 'var(--sf-text)' }}
              />
            </FieldBox>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-semibold text-[14px]">{t('event_all_day')}</span>
          <Switch checked={allDay} onChange={setAllDay} />
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[14px]">{t('event_weekly_repeat')}</span>
          <Switch checked={weeklyRepeat} onChange={setWeeklyRepeat} />
        </div>

        {error && (
          <div className="text-[13px] font-semibold" style={{ color: '#EF4444' }}>
            {error}
          </div>
        )}

        <PrimaryButton type="submit" label={t(mode === 'edit' ? 'save_changes' : 'event_add')} />
        {mode === 'edit' && <GhostButton label={t('delete')} onClick={handleDelete} danger />}
      </form>
    </ModalShell>
  );
}
