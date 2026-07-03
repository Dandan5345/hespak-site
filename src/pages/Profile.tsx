import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useSfTheme } from '../theme/ThemeProvider';
import { useAuth } from '../state/AuthContext';
import { useData } from '../state/DataContext';
import { readAppStats, type AppStats } from '../components/home/appStats';
import { SignInPanel } from '../components/onboarding/SignInPanel';

// Local strings not yet in src/i18n/strings.ts (see project convention).
const EXTRA: Record<string, Record<string, string>> = {
  guest_title: { he: 'אורח/ת', en: 'Guest' },
  delete_requires_recent_login: {
    he: 'מטעמי אבטחה צריך להתחבר מחדש לפני מחיקת החשבון. התנתק/י והתחבר/י שוב ונסה/י שוב.',
    en: 'For security, please sign in again before deleting your account, then retry.',
  },
  delete_account_error: {
    he: 'משהו השתבש במחיקת החשבון, נסה/י שוב',
    en: 'Something went wrong deleting your account, please try again',
  },
  profile_hours_note: {
    he: 'זמן מיקוד נספר באפליקציית המובייל',
    en: 'Focus time is tracked in the mobile app',
  },
  menu_delete_account_signed_out_hint: {
    he: 'התחבר/י כדי לנהל את החשבון',
    en: 'Sign in to manage your account',
  },
};

const SHORTCUTS: { to: string; emoji: string; labelKey: string }[] = [
  { to: '/', emoji: '🏠', labelKey: 'nav_home' },
  { to: '/calendar', emoji: '📅', labelKey: 'nav_calendar' },
  { to: '/tasks', emoji: '✅', labelKey: 'nav_tasks' },
  { to: '/stats', emoji: '📊', labelKey: 'nav_stats' },
];

interface MenuEntry {
  emoji: string;
  color: string;
  title: string;
  sub?: string;
  onClick: () => void;
}

export default function Profile() {
  const { t, lang } = useI18n();
  const { tokens } = useSfTheme();
  const { isSignedIn, displayName, email, photoUrl, signOut, deleteAccount, authBusy } = useAuth();
  const { tasks, tokenQuota, deleteAllCloudData } = useData();
  const navigate = useNavigate();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);

  const [stats, setStats] = useState<AppStats>({ appOpenCount: 0, currentStreak: 0, bestStreak: 0 });
  useEffect(() => setStats(readAppStats()), []);

  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const completedTasksCount = tasks.filter((task) => task.isCompleted).length;
  const initial = displayName?.trim() ? displayName.trim()[0].toUpperCase() : null;

  const handleLogout = async () => {
    setShowLogout(false);
    await signOut();
    navigate('/');
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteAllCloudData();
      await deleteAccount();
      localStorage.removeItem('sf_onboarded');
      navigate('/onboarding');
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setDeleteError(code === 'auth/requires-recent-login' ? tt('delete_requires_recent_login') : tt('delete_account_error'));
      setShowDelete(false);
    } finally {
      setDeleteBusy(false);
    }
  };

  const menu: MenuEntry[] = [
    { emoji: '🔥', color: '#FF6B35', title: t('menu_habits'), sub: t('menu_habits_sub'), onClick: () => navigate('/habits') },
    { emoji: '🎯', color: '#6366F1', title: t('menu_focus'), sub: t('menu_focus_sub'), onClick: () => navigate('/focus') },
    { emoji: '📚', color: '#10B981', title: t('menu_courses'), sub: t('menu_courses_sub'), onClick: () => navigate('/courses') },
    { emoji: '🧠', color: '#14B8A6', title: t('menu_agent_memory'), sub: t('menu_agent_memory_sub'), onClick: () => navigate('/settings') },
    { emoji: '⚙️', color: '#8B5CF6', title: t('menu_settings'), sub: t('menu_settings_sub'), onClick: () => navigate('/settings') },
  ];
  if (isSignedIn) {
    menu.push({ emoji: '🚪', color: '#EF4444', title: t('menu_logout'), onClick: () => setShowLogout(true) });
    menu.push({
      emoji: '🗑️',
      color: '#EF4444',
      title: t('menu_delete_account'),
      sub: t('menu_delete_account_sub'),
      onClick: () => setShowDelete(true),
    });
  }

  return (
    <div className="pb-8 pt-2 flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Avatar / identity */}
      <div className="flex flex-col items-center text-center gap-1">
        <div
          className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden"
          style={{
            background: 'var(--sf-accent-gradient)',
            color: tokens.onAccent,
            boxShadow: tokens.glow !== 'none' ? tokens.glow : undefined,
          }}
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            initial ?? '👤'
          )}
        </div>
        <p className="mt-2 text-xl font-extrabold">{isSignedIn ? (displayName ?? t('profile_name_placeholder')) : tt('guest_title')}</p>
        {isSignedIn && email && (
          <p className="text-sm font-medium" style={{ color: tokens.textDim }}>
            {email}
          </p>
        )}
      </div>

      {!isSignedIn && (
        <div
          className="rounded-[var(--sf-radius-lg)] p-5"
          style={{ background: tokens.accentSoft, border: `1px solid ${tokens.accent}4d` }}
        >
          <p className="font-extrabold text-base mb-1">{t('almost_ready')}</p>
          <p className="text-sm font-medium mb-4" style={{ color: tokens.textDim }}>
            {t('almost_ready_sub')}
          </p>
          <SignInPanel />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatTile emoji="🔥" value={String(stats.currentStreak)} label={t('profile_streak')} />
        <StatTile emoji="🕒" value="0" label={t('profile_hours')} hint={tt('profile_hours_note')} />
        <StatTile emoji="✅" value={String(completedTasksCount)} label={t('profile_tasks')} />
      </div>

      {/* Token quota */}
      <Card>
        <p className="text-sm font-bold" style={{ color: tokens.accent }}>
          {t('purchases_balance').replace('{n}', String(tokenQuota?.remainingTokens ?? 0))}
        </p>
      </Card>

      {/* Shortcuts */}
      <div>
        <p className="text-[15px] font-extrabold mb-2.5" style={{ color: tokens.textDim }}>
          {t('profile_shortcuts')}
        </p>
        <div className="grid grid-cols-4 gap-2.5">
          {SHORTCUTS.map((s) => (
            <button
              key={s.to}
              type="button"
              onClick={() => navigate(s.to)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-[var(--sf-radius)] py-3"
              style={{
                background: 'var(--sf-surface)',
                borderWidth: tokens.cardBorderWidth,
                borderStyle: 'solid',
                borderColor: tokens.cardBorderColor,
              }}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="text-xs font-extrabold truncate">{t(s.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="flex flex-col gap-2.5">
        {menu.map((m) => (
          <button
            key={m.title}
            type="button"
            onClick={m.onClick}
            className="flex items-center gap-3.5 rounded-[var(--sf-radius)] p-[15px] text-start transition-transform active:scale-[0.99]"
            style={{
              background: 'var(--sf-surface)',
              borderWidth: tokens.cardBorderWidth,
              borderStyle: 'solid',
              borderColor: tokens.cardBorderColor,
              boxShadow: tokens.cardShadow !== 'none' ? tokens.cardShadow : undefined,
            }}
          >
            <span
              className="w-[38px] h-[38px] rounded-[13px] flex items-center justify-center shrink-0 text-lg"
              style={{ background: `${m.color}1f`, border: `1px solid ${m.color}38` }}
            >
              {m.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold truncate">{m.title}</p>
              {m.sub && (
                <p className="text-xs font-medium truncate" style={{ color: tokens.textDim }}>
                  {m.sub}
                </p>
              )}
            </div>
            <span style={{ color: tokens.textFaint }}>{lang === 'he' ? '‹' : '›'}</span>
          </button>
        ))}
      </div>

      {deleteError && (
        <p className="text-sm font-semibold text-center" style={{ color: '#EF4444' }}>
          {deleteError}
        </p>
      )}

      <ConfirmDialog
        open={showLogout}
        title={t('logout_confirm_title')}
        body={t('logout_confirm_body')}
        confirmLabel={t('menu_logout')}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogout}
        busy={authBusy}
      />
      <ConfirmDialog
        open={showDelete}
        title={t('delete_account_confirm_title')}
        body={t('delete_account_confirm_body')}
        confirmLabel={t('delete_account_cta')}
        onCancel={() => setShowDelete(false)}
        onConfirm={handleDelete}
        busy={deleteBusy}
      />
    </div>
  );
}

function StatTile({ emoji, value, label, hint }: { emoji: string; value: string; label: string; hint?: string }) {
  const { tokens } = useSfTheme();
  return (
    <div
      className="flex flex-col items-center rounded-[var(--sf-radius)] py-3.5 px-2"
      style={{
        background: 'var(--sf-surface)',
        borderWidth: tokens.cardBorderWidth,
        borderStyle: 'solid',
        borderColor: tokens.cardBorderColor,
      }}
      title={hint}
    >
      <span className="text-xl">{emoji}</span>
      <span className="text-[22px] font-black mt-0.5">{value}</span>
      <span className="text-xs font-semibold text-center truncate w-full" style={{ color: tokens.textDim }}>
        {label}
      </span>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  const { tokens } = useSfTheme();
  return (
    <div
      className="rounded-[var(--sf-radius)] p-4"
      style={{
        background: 'var(--sf-surface)',
        borderWidth: tokens.cardBorderWidth,
        borderStyle: 'solid',
        borderColor: tokens.cardBorderColor,
      }}
    >
      {children}
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const { t } = useI18n();
  const { tokens } = useSfTheme();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[20px] p-5"
        style={{ background: tokens.bg2, borderWidth: tokens.cardBorderWidth, borderStyle: 'solid', borderColor: tokens.cardBorderColor }}
      >
        <h3 className="text-[17px] font-extrabold mb-2">{title}</h3>
        <p className="text-sm font-medium leading-relaxed mb-5" style={{ color: tokens.textDim }}>
          {body}
        </p>
        <div className="flex items-center justify-end gap-4">
          <button type="button" onClick={onCancel} className="text-sm font-bold" style={{ color: tokens.textDim }}>
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="text-sm font-extrabold disabled:opacity-50"
            style={{ color: '#EF4444' }}
          >
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
