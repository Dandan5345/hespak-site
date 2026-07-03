// Local-only approximation of lib/state/app_controller.dart's
// appOpenCount/currentStreak/bestStreak (which the mobile app persists to
// SharedPreferences on the device). The web has no equivalent server-tracked
// value, so we reproduce the same day-diff streak logic against
// localStorage, scoped to this browser. Bumped at most once per tab session
// (sessionStorage guard) so refreshing Home mid-session doesn't double-count.

const OPEN_COUNT_KEY = 'sf_stat_open_count';
const STREAK_KEY = 'sf_stat_current_streak';
const BEST_STREAK_KEY = 'sf_stat_best_streak';
const LAST_OPEN_KEY = 'sf_stat_last_open_date';
const SESSION_BUMPED_KEY = 'sf_stat_bumped_session';

export interface AppStats {
  appOpenCount: number;
  currentStreak: number;
  bestStreak: number;
}

function dateOnlyIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function readAppStats(): AppStats {
  return {
    appOpenCount: Number(localStorage.getItem(OPEN_COUNT_KEY) ?? '0'),
    currentStreak: Number(localStorage.getItem(STREAK_KEY) ?? '0'),
    bestStreak: Number(localStorage.getItem(BEST_STREAK_KEY) ?? '0'),
  };
}

export function bumpAppOpenStatsOnce(): AppStats {
  const stats = readAppStats();
  if (sessionStorage.getItem(SESSION_BUMPED_KEY) === '1') return stats;
  sessionStorage.setItem(SESSION_BUMPED_KEY, '1');

  const today = dateOnlyIso(new Date());
  const lastOpenStr = localStorage.getItem(LAST_OPEN_KEY);
  let { currentStreak, bestStreak, appOpenCount } = stats;
  appOpenCount += 1;

  if (lastOpenStr !== today) {
    if (!lastOpenStr) {
      currentStreak = 1;
    } else {
      const diffDays = Math.round(
        (new Date(today).getTime() - new Date(lastOpenStr).getTime()) / 86_400_000,
      );
      currentStreak = diffDays === 1 ? currentStreak + 1 : 1;
    }
    if (currentStreak > bestStreak) bestStreak = currentStreak;
    localStorage.setItem(LAST_OPEN_KEY, today);
  }

  localStorage.setItem(OPEN_COUNT_KEY, String(appOpenCount));
  localStorage.setItem(STREAK_KEY, String(currentStreak));
  localStorage.setItem(BEST_STREAK_KEY, String(bestStreak));

  return { appOpenCount, currentStreak, bestStreak };
}
