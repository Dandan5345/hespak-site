// A handful of copy strings this feature needs that aren't already ported to
// src/i18n/strings.ts. Per CLAUDE.md scope rules we do NOT edit that shared
// file — everything else this page needs (event_*, smart_notif_*, cal_*, ...)
// already exists there and is read straight through useI18n().t().
import { useI18n } from '../../i18n/I18nProvider';

const EXTRA: Record<string, Record<string, string>> = {
  cal_delete_event_confirm: { he: 'למחוק את האירוע?', en: 'Delete this event?' },
  cal_delete_reminder_confirm: { he: 'למחוק את ההתראה?', en: 'Delete this reminder?' },
  cal_all_day_section: { he: '🗓️ כל היום', en: '🗓️ All day' },
  cal_reminders_hide: { he: 'הסתר', en: 'Hide' },
  cal_reminders_show: { he: 'הצג', en: 'Show' },
};

/** `tt('key')` — extra copy first, falls back to the shared translation map. */
export function useTt() {
  const { t, lang } = useI18n();
  return (key: string) => EXTRA[key]?.[lang] ?? t(key);
}
