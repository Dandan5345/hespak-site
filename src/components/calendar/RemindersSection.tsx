// Collapsible "Smart reminders" section shown below the calendar views — the
// web home for what's a dedicated screen (smart_notifications_screen.dart) in
// the mobile app. There's no separate route for it here, so it lives inline.
import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useData } from '../../state/DataContext';
import type { SmartReminder } from '../../state/types';
import { useTt } from './i18n';
import { Card, PrimaryButton } from './ui';
import { ReminderModal } from './ReminderModal';

function two(v: number) {
  return v.toString().padStart(2, '0');
}

export function RemindersSection() {
  const { t } = useI18n();
  const tt = useTt();
  const { tasks, scheduleItems, smartReminders } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SmartReminder | null | undefined>(undefined); // undefined = closed, null = new

  // Nice-to-have: browser notifications for reminders due soon in this
  // session. Degrades silently if unsupported or permission is denied.
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const now = Date.now();
    const timers = smartReminders
      .map((r) => {
        const delay = new Date(r.dateTime).getTime() - now;
        if (delay <= 0 || delay > 6 * 60 * 60 * 1000) return null;
        return window.setTimeout(() => {
          try {
            new Notification(r.title, { body: r.description || t('smart_notif_default_body') });
          } catch {
            /* ignore — best-effort only */
          }
        }, delay);
      })
      .filter((id): id is number => id !== null);
    return () => timers.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smartReminders]);

  const sorted = [...smartReminders].sort((a, b) => a.dateTime.localeCompare(b.dateTime));

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-[var(--sf-radius)] px-4 py-3"
        style={{ background: 'var(--sf-surface)', border: 'var(--sf-card-border-width) solid var(--sf-card-border-color)' }}
      >
        <span className="font-extrabold text-[15px]">{t('smart_notif_title')}</span>
        <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--sf-text-dim)' }}>
          {smartReminders.length > 0 && <span>{smartReminders.length}</span>}
          <span style={{ transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 150ms' }}>▾</span>
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {sorted.length === 0 && (
            <Card className="p-6 text-center">
              <span className="text-[14px] font-semibold" style={{ color: 'var(--sf-text-dim)' }}>
                {t('smart_notif_empty')}
              </span>
            </Card>
          )}
          {sorted.map((r) => {
            const when = new Date(r.dateTime);
            const linked = tasks.find((tk) => tk.id === r.linkedTaskId)?.title ?? scheduleItems.find((s) => s.id === r.linkedScheduleId)?.title;
            const dateLabel = `${two(when.getDate())}/${two(when.getMonth() + 1)}/${when.getFullYear()}`;
            return (
              <Card key={r.id} onClick={() => setEditing(r)} className="p-3 flex items-center gap-3">
                <div className="text-[24px] font-black shrink-0" style={{ color: 'var(--sf-accent)' }}>
                  {two(when.getHours())}:{two(when.getMinutes())}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-extrabold truncate">{r.title}</div>
                  <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--sf-text-dim)' }}>
                    {linked ? `${dateLabel} · ${linked}` : dateLabel}
                  </div>
                </div>
              </Card>
            );
          })}
          <div className="mt-1">
            <PrimaryButton label={tt('smart_notif_add')} onClick={() => setEditing(null)} />
          </div>
        </div>
      )}

      {editing !== undefined && <ReminderModal reminder={editing ?? undefined} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
