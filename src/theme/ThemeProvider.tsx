import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyTokensToCss, tokensOf, type SfMode, type SfTheme, type SfTokens } from './tokens';

interface ThemeCtx {
  theme: SfTheme;
  mode: SfMode;
  tokens: SfTokens;
  setTheme: (t: SfTheme) => void;
  setMode: (m: SfMode) => void;
  toggleDark: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const THEME_KEY = 'sf_theme';
const MODE_KEY = 'sf_mode';
const VALID_THEMES: SfTheme[] = ['glass', 'min', 'pastel', 'brutal', 'nature', 'cyber'];

function readTheme(): SfTheme {
  const v = localStorage.getItem(THEME_KEY);
  return (VALID_THEMES as string[]).includes(v ?? '') ? (v as SfTheme) : 'glass';
}
function readMode(): SfMode {
  return localStorage.getItem(MODE_KEY) === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SfTheme>(readTheme);
  const [mode, setModeState] = useState<SfMode>(readMode);

  const tokens = useMemo(() => tokensOf(theme, mode), [theme, mode]);

  useEffect(() => {
    applyTokensToCss(tokens);
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [tokens, mode]);

  const setTheme = (t: SfTheme) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
  };
  const setMode = (m: SfMode) => {
    setModeState(m);
    localStorage.setItem(MODE_KEY, m);
  };
  const toggleDark = () => setMode(mode === 'dark' ? 'light' : 'dark');

  return (
    <Ctx.Provider value={{ theme, mode, tokens, setTheme, setMode, toggleDark }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSfTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSfTheme must be used within ThemeProvider');
  return ctx;
}
