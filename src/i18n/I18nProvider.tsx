import { createContext, useContext, useState, type ReactNode } from 'react';
import { LANGUAGES, translate } from './strings';

interface I18nCtx {
  lang: string;
  isRtl: boolean;
  dir: 'rtl' | 'ltr';
  setLang: (code: string) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);
const LANG_KEY = 'sf_lang';

function readLang(): string {
  return localStorage.getItem(LANG_KEY) ?? 'he';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(readLang);
  const meta = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const dir: 'rtl' | 'ltr' = meta.isRtl ? 'rtl' : 'ltr';

  const setLang = (code: string) => {
    setLangState(code);
    localStorage.setItem(LANG_KEY, code);
  };

  const t = (key: string) => translate(key, lang);

  return (
    <Ctx.Provider value={{ lang, isRtl: meta.isRtl, dir, setLang, t }}>
      <div dir={dir} lang={lang} style={{ minHeight: '100%' }}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export { LANGUAGES };
