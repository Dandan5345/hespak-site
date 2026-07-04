import { type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useSfTheme } from '../theme/ThemeProvider';

interface NavItem {
  to: string;
  emoji: string;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', emoji: '🏠', labelKey: 'nav_home' },
  { to: '/calendar', emoji: '📅', labelKey: 'nav_calendar' },
  { to: '/tasks', emoji: '✅', labelKey: 'nav_tasks' },
  { to: '/stats', emoji: '📊', labelKey: 'nav_stats' },
  { to: '/profile', emoji: '👤', labelKey: 'nav_profile' },
];

/** Shared app chrome: side rail on desktop, bottom nav on mobile — the web
 * analogue of lib/widgets/app_shell.dart's bottom nav + floating quick-add +
 * floating chat button, present on every screen. */
export function AppShell({ children }: { children: ReactNode }) {
  const { t, isRtl } = useI18n();
  const { tokens } = useSfTheme();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full" style={{ color: tokens.text }}>
      {/* Desktop side rail */}
      <nav
        className="hidden md:flex md:flex-col md:justify-between w-20 lg:w-56 shrink-0 h-screen sticky top-0 p-3 lg:p-4"
        style={{
          background: 'var(--sf-nav-bg)',
          borderInlineEnd: isRtl ? undefined : `var(--sf-nav-border-width) solid var(--sf-nav-border-color)`,
          borderInlineStart: isRtl ? `var(--sf-nav-border-width) solid var(--sf-nav-border-color)` : undefined,
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex flex-col gap-1">
          <div className="px-2 py-3 mb-2 font-extrabold text-lg lg:text-xl truncate" style={{ color: tokens.accent }}>
            <span className="lg:hidden">📘</span>
            <span className="hidden lg:inline">📘 הספק</span>
          </div>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="sf-navlink flex items-center gap-3 rounded-[var(--sf-radius-sm)] px-3 py-2.5 transition-colors font-medium"
              style={({ isActive }) => ({
                background: isActive ? 'var(--sf-accent-soft)' : undefined,
                color: isActive ? tokens.accent : tokens.textDim,
                fontWeight: isActive ? 700 : undefined,
              })}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="hidden lg:inline">{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-3 rounded-[var(--sf-radius-sm)] px-3 py-2.5 font-medium sf-press"
            style={{ background: tokens.accentSoft, color: tokens.accent }}
          >
            <span className="text-xl">💬</span>
            <span className="hidden lg:inline">{t('nav_chat')}</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 pb-24 md:pb-8 px-3 sm:px-5 lg:px-8 pt-4 max-w-5xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around px-1 py-2"
        style={{
          background: 'var(--sf-nav-bg)',
          borderTop: `var(--sf-nav-border-width) solid var(--sf-nav-border-color)`,
          backdropFilter: 'blur(16px)',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        }}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-[var(--sf-radius-sm)] flex-1"
          >
            {({ isActive }) => (
              <>
                <span className="text-xl" style={{ opacity: isActive ? 1 : 0.55 }}>
                  {item.emoji}
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? tokens.accent : tokens.textFaint }}
                >
                  {t(item.labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Floating chat button (mobile) */}
      <button
        onClick={() => navigate('/chat')}
        className="md:hidden fixed bottom-20 z-40 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg sf-press"
        style={{
          insetInlineEnd: '1rem',
          background: 'var(--sf-accent-gradient)',
          color: tokens.onAccent,
          boxShadow: tokens.glow !== 'none' ? tokens.glow : '0 6px 20px rgba(0,0,0,0.25)',
        }}
        aria-label={t('nav_chat')}
      >
        💬
      </button>
    </div>
  );
}
