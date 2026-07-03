import type { Urgency } from '../../state/types';

// Fixed severity palette (red/amber/green) — matches lib/widgets/task_row.dart's
// _urgMeta exactly. Urgency needs a stable semantic color across all 6 themes,
// so this is one of the few places we intentionally don't use theme tokens.
export interface UrgencyMeta {
  color: string;
  bg: string;
  labelKey: string;
}

const META: Record<Urgency, UrgencyMeta> = {
  very_urgent: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.16)', labelKey: 'urgency_very_urgent' },
  urgent: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.18)', labelKey: 'urgency_urgent' },
  not_urgent: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.16)', labelKey: 'urgency_not_urgent' },
};

export function urgencyMeta(u: Urgency): UrgencyMeta {
  return META[u];
}

export const URGENCY_OPTIONS: Urgency[] = ['not_urgent', 'urgent', 'very_urgent'];
