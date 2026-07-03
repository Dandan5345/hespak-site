import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n, LANGUAGES } from '../i18n/I18nProvider';
import { useSfTheme } from '../theme/ThemeProvider';
import { useAuth } from '../state/AuthContext';
import { useData } from '../state/DataContext';
import { ThemeGrid, DarkModeToggle, Switch } from '../components/settings/ThemePicker';

// Local strings not yet in src/i18n/strings.ts (see project convention).
const EXTRA: Record<string, Record<string, string>> = {
  agent_section_title: { he: '🤖 הסוכן האישי', en: '🤖 Your AI agent' },
  mobile_only_hint: { he: 'זמין באפליקציית המובייל', en: 'Available in the mobile app' },
  about_title: { he: 'ℹ️ אודות', en: 'ℹ️ About' },
  about_body: { he: 'הספק — ניהול לימודים, לו״ז וסוכן AI במקום אחד.', en: 'Hespek — task, schedule and AI agent management in one place.' },
  danger_zone_title: { he: '⚠️ אזור מסוכן', en: '⚠️ Danger zone' },
  delete_requires_recent_login: {
    he: 'מטעמי אבטחה צריך להתחבר מחדש לפני מחיקת החשבון. התנתק/י והתחבר/י שוב ונסה/י שוב.',
    en: 'For security, please sign in again before deleting your account, then retry.',
  },
  delete_account_error: {
    he: 'משהו השתבש במחיקת החשבון, נסה/י שוב',
    en: 'Something went wrong deleting your account, please try again',
  },
};

export default function Settings() {
  const { t, lang } = useI18n();
  const { tokens } = useSfTheme();
  const navigate = useNavigate();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);

  return (
    <div className="pb-8 pt-2 flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--sf-surface)', border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}` }}
          aria-label={t('back')}
        >
          {lang === 'he' ? '›' : '‹'}
        </button>
        <h1 className="text-[26px] font-extrabold tracking-tight">{t('settings_title')}</h1>
      </div>

      <Section label={t('settings_language')}>
        <div className="grid grid-cols-2 gap-2.5">
          {LANGUAGES.map((l) => (
            <LangCard key={l.code} code={l.code} label={l.label} />
          ))}
        </div>
      </Section>

      <Section label={t('settings_theme')}>
        <ThemeGrid columns={3} />
        <div className="mt-3">
          <DarkModeToggle />
        </div>
      </Section>

      <AgentSection sectionTitle={tt('agent_section_title')} />

      <Section label={t('settings_notifications')}>
        <Row emoji="🔔" title={t('notif_enable')} sub={tt('mobile_only_hint')}>
          <Switch value={false} onClick={() => {}} label={t('notif_enable')} />
        </Row>
      </Section>

      <Section label={t('cal_sync_title')}>
        <Row emoji="🗓️" title={t('cal_sync_label')} sub={tt('mobile_only_hint')}>
          <Switch value={false} onClick={() => {}} label={t('cal_sync_label')} />
        </Row>
      </Section>

      <Section label={tt('danger_zone_title')}>
        <DangerZone />
      </Section>

      <Section label={tt('about_title')}>
        <p className="text-sm font-medium leading-relaxed" style={{ color: tokens.textDim }}>
          {tt('about_body')}
        </p>
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const { tokens } = useSfTheme();
  return (
    <div>
      <p className="text-[13px] font-extrabold mb-2.5" style={{ color: tokens.textDim }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Row({ emoji, title, sub, children }: { emoji: string; title: string; sub?: string; children?: React.ReactNode }) {
  const { tokens } = useSfTheme();
  return (
    <div
      className="flex items-center gap-3 rounded-[var(--sf-radius)] p-[15px]"
      style={{ background: 'var(--sf-surface)', borderWidth: tokens.cardBorderWidth, borderStyle: 'solid', borderColor: tokens.cardBorderColor }}
    >
      <span className="text-xl shrink-0">{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold truncate">{title}</p>
        {sub && (
          <p className="text-xs font-medium truncate" style={{ color: tokens.textFaint }}>
            {sub}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function LangCard({ code, label }: { code: string; label: string }) {
  const { lang, setLang } = useI18n();
  const { tokens } = useSfTheme();
  const selected = lang === code;
  return (
    <button
      type="button"
      onClick={() => setLang(code)}
      className="flex items-center justify-center gap-1.5 rounded-[var(--sf-radius)] p-3.5 text-sm font-bold"
      style={{
        background: selected ? tokens.accentSoft : 'var(--sf-surface)',
        color: selected ? tokens.accent : tokens.text,
        borderWidth: selected ? 2 : tokens.cardBorderWidth,
        borderStyle: 'solid',
        borderColor: selected ? tokens.accent : tokens.cardBorderColor,
      }}
    >
      {label}
      {selected && ' ✓'}
    </button>
  );
}

function AgentSection({ sectionTitle }: { sectionTitle: string }) {
  const { t } = useI18n();
  const { tokens } = useSfTheme();
  const { agentName, agentMemory, setAgentName, setAgentMemory } = useData();
  const [name, setName] = useState(agentName);
  const [memory, setMemory] = useState(agentMemory);
  const [savedFlash, setSavedFlash] = useState<'name' | 'memory' | null>(null);

  const estimate = Math.ceil(memory.length / 4);

  const saveName = () => {
    setAgentName(name);
    setSavedFlash('name');
    window.setTimeout(() => setSavedFlash(null), 1800);
  };
  const saveMemory = () => {
    setAgentMemory(memory);
    setSavedFlash('memory');
    window.setTimeout(() => setSavedFlash(null), 1800);
  };
  const clearMemory = () => {
    setMemory('');
    setAgentMemory('');
  };

  return (
    <Section label={sectionTitle}>
      <div className="flex flex-col gap-4">
        <div
          className="rounded-[var(--sf-radius)] p-4"
          style={{ background: 'var(--sf-surface)', borderWidth: tokens.cardBorderWidth, borderStyle: 'solid', borderColor: tokens.cardBorderColor }}
        >
          <p className="text-sm font-bold mb-2">{t('agent_rename_title')}</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('agent_rename_hint')}
              className="flex-1 min-w-0 rounded-[var(--sf-radius-sm)] px-3.5 py-2.5 text-sm font-medium outline-none"
              style={{ background: 'var(--sf-surface2)', color: tokens.text }}
            />
            <button
              type="button"
              onClick={saveName}
              className="rounded-[var(--sf-radius-sm)] px-4 py-2.5 text-sm font-bold shrink-0"
              style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
            >
              {t('agent_rename_save')}
            </button>
          </div>
          {savedFlash === 'name' && (
            <p className="mt-2 text-xs font-bold" style={{ color: tokens.accent }}>
              {t('saved')}
            </p>
          )}
        </div>

        <div
          className="rounded-[var(--sf-radius)] p-4"
          style={{ background: 'var(--sf-surface)', borderWidth: tokens.cardBorderWidth, borderStyle: 'solid', borderColor: tokens.cardBorderColor }}
        >
          <p className="text-sm font-bold">{t('agent_memory_title')}</p>
          <p className="text-xs font-medium mt-1 mb-3 leading-relaxed" style={{ color: tokens.textDim }}>
            {t('agent_memory_desc')}
          </p>
          <textarea
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            placeholder={t('agent_memory_empty')}
            rows={5}
            maxLength={1400}
            className="w-full rounded-[var(--sf-radius-sm)] px-3.5 py-3 text-sm font-medium outline-none resize-none"
            style={{ background: 'var(--sf-surface2)', color: tokens.text }}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] font-semibold" style={{ color: estimate > 350 ? '#EF4444' : tokens.textFaint }}>
              {t('agent_memory_limit').replace('{count}', String(estimate))}
            </p>
            {savedFlash === 'memory' && (
              <p className="text-xs font-bold" style={{ color: tokens.accent }}>
                {t('agent_memory_saved')}
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={clearMemory} className="text-sm font-extrabold" style={{ color: '#EF4444' }}>
              {t('agent_memory_clear')}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={saveMemory}
              className="rounded-[var(--sf-radius-sm)] px-4 py-2 text-sm font-bold"
              style={{ background: 'var(--sf-accent-gradient)', color: tokens.onAccent }}
            >
              {t('agent_memory_save')}
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

function DangerZone() {
  const { t, lang } = useI18n();
  const tt = (k: string) => EXTRA[k]?.[lang] ?? t(k);
  const { tokens } = useSfTheme();
  const { signOut, deleteAccount } = useAuth();
  const { deleteAllCloudData } = useData();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setShowLogout(false);
    await signOut();
    navigate('/');
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAllCloudData();
      await deleteAccount();
      localStorage.removeItem('sf_onboarded');
      navigate('/onboarding');
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setError(code === 'auth/requires-recent-login' ? tt('delete_requires_recent_login') : tt('delete_account_error'));
      setShowDelete(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => setShowLogout(true)}
        className="rounded-[var(--sf-radius)] p-[15px] text-start text-sm font-bold"
        style={{ background: 'var(--sf-surface)', borderWidth: tokens.cardBorderWidth, borderStyle: 'solid', borderColor: tokens.cardBorderColor }}
      >
        🚪 {t('menu_logout')}
      </button>
      <button
        type="button"
        onClick={() => setShowDelete(true)}
        className="rounded-[var(--sf-radius)] p-[15px] text-start text-sm font-bold"
        style={{ color: '#EF4444', background: 'var(--sf-surface)', borderWidth: tokens.cardBorderWidth, borderStyle: 'solid', borderColor: tokens.cardBorderColor }}
      >
        🗑️ {t('menu_delete_account')}
      </button>
      {error && (
        <p className="text-xs font-semibold text-center" style={{ color: '#EF4444' }}>
          {error}
        </p>
      )}

      <ConfirmDialog
        open={showLogout}
        title={t('logout_confirm_title')}
        body={t('logout_confirm_body')}
        confirmLabel={t('menu_logout')}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogout}
      />
      <ConfirmDialog
        open={showDelete}
        title={t('delete_account_confirm_title')}
        body={t('delete_account_confirm_body')}
        confirmLabel={t('delete_account_cta')}
        onCancel={() => setShowDelete(false)}
        onConfirm={handleDelete}
        busy={busy}
      />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onCancel}>
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
          <button type="button" onClick={onConfirm} disabled={busy} className="text-sm font-extrabold disabled:opacity-50" style={{ color: '#EF4444' }}>
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
