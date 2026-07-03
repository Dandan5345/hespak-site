// Ported 1:1 from lib/theme/sf_tokens.dart (StudyFlow.dc.html design source).
// Six themes x two modes. Every value here must stay in sync with the Dart
// file — if the mobile app's design changes, update both.

export type SfTheme = 'glass' | 'min' | 'pastel' | 'brutal' | 'nature' | 'cyber';
export type SfMode = 'light' | 'dark';

export interface SfThemeMeta {
  theme: SfTheme;
  nameKey: string;
  emoji: string;
  preview: [string, string];
}

export const THEME_METAS: SfThemeMeta[] = [
  { theme: 'glass', nameKey: 'theme_glass', emoji: '🪟', preview: ['#A5B4FC', '#F0ABFC'] },
  { theme: 'min', nameKey: 'theme_min', emoji: '🌙', preview: ['#1C1C28', '#7C5CFF'] },
  { theme: 'pastel', nameKey: 'theme_pastel', emoji: '🌸', preview: ['#FF9EC7', '#92E6D2'] },
  { theme: 'brutal', nameKey: 'theme_brutal', emoji: '🏛️', preview: ['#FFD400', '#2B6FFF'] },
  { theme: 'nature', nameKey: 'theme_nature', emoji: '🌿', preview: ['#6E8B54', '#CBA36E'] },
  { theme: 'cyber', nameKey: 'theme_cyber', emoji: '⚡', preview: ['#FF2BD6', '#00F0FF'] },
];

export interface SfTokens {
  bgColor: string;
  bgGradient?: [string, string, string];
  bg2: string;
  surface: string;
  surface2: string;
  cardBorderColor: string;
  cardBorderWidth: number;
  cardShadow: string; // CSS box-shadow value, or 'none'
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accent2: string;
  accentSoft: string;
  onAccent: string;
  radius: number;
  radiusSm: number;
  radiusLg: number;
  navBg: string;
  navBorderColor: string;
  navBorderWidth: number;
  glow: string; // CSS box-shadow value, or 'none'
  ringTrack: string;
}

const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

const TABLE: Record<SfTheme, Record<SfMode, SfTokens>> = {
  glass: {
    light: {
      bgColor: '#EEF0FB',
      bgGradient: ['#DFE7FF', '#F3E8FF', '#FFE4F0'],
      bg2: '#EEF0FB',
      surface: rgba(255, 255, 255, 0.6),
      surface2: rgba(255, 255, 255, 0.4),
      cardBorderColor: rgba(255, 255, 255, 0.7),
      cardBorderWidth: 1,
      cardShadow: `0 8px 30px 0 ${rgba(80, 80, 160, 0.16)}`,
      text: '#1F1B3D',
      textDim: '#5B557E',
      textFaint: '#9590B8',
      accent: '#6366F1',
      accent2: '#A855F7',
      accentSoft: rgba(99, 102, 241, 0.15),
      onAccent: '#FFFFFF',
      radius: 22, radiusSm: 14, radiusLg: 30,
      navBg: rgba(255, 255, 255, 0.6),
      navBorderColor: rgba(255, 255, 255, 0.5),
      navBorderWidth: 1,
      glow: 'none',
      ringTrack: rgba(99, 102, 241, 0.18),
    },
    dark: {
      bgColor: '#241C46',
      bgGradient: ['#1B1740', '#2A1F55', '#3B1D52'],
      bg2: '#241C46',
      surface: rgba(255, 255, 255, 0.09),
      surface2: rgba(255, 255, 255, 0.05),
      cardBorderColor: rgba(255, 255, 255, 0.14),
      cardBorderWidth: 1,
      cardShadow: `0 8px 30px 0 ${rgba(0, 0, 0, 0.32)}`,
      text: '#F1EDFF',
      textDim: '#BDB4E6',
      textFaint: '#8A82B8',
      accent: '#8B8CF8',
      accent2: '#C084FC',
      accentSoft: rgba(139, 140, 248, 0.2),
      onAccent: '#FFFFFF',
      radius: 22, radiusSm: 14, radiusLg: 30,
      navBg: rgba(30, 25, 60, 0.55),
      navBorderColor: rgba(255, 255, 255, 0.1),
      navBorderWidth: 1,
      glow: 'none',
      ringTrack: rgba(255, 255, 255, 0.13),
    },
  },
  min: {
    light: {
      bgColor: '#F7F7FB',
      bg2: '#FFFFFF',
      surface: '#FFFFFF',
      surface2: '#F1F1F7',
      cardBorderColor: '#ECECF3',
      cardBorderWidth: 1,
      cardShadow: `0 2px 12px 0 ${rgba(20, 20, 40, 0.06)}`,
      text: '#14141F',
      textDim: '#6B6B80',
      textFaint: '#A0A0B2',
      accent: '#6D4DFF',
      accent2: '#3A6FFF',
      accentSoft: rgba(109, 77, 255, 0.1),
      onAccent: '#FFFFFF',
      radius: 18, radiusSm: 12, radiusLg: 24,
      navBg: rgba(255, 255, 255, 0.9),
      navBorderColor: '#ECECF3',
      navBorderWidth: 1,
      glow: 'none',
      ringTrack: '#ECECF3',
    },
    dark: {
      bgColor: '#0A0A10',
      bg2: '#0F0F17',
      surface: '#15151F',
      surface2: '#1C1C28',
      cardBorderColor: '#23233A',
      cardBorderWidth: 1,
      cardShadow: 'none',
      text: '#F5F5FA',
      textDim: '#9A9AB0',
      textFaint: '#5E5E72',
      accent: '#7C5CFF',
      accent2: '#4F8CFF',
      accentSoft: rgba(124, 92, 255, 0.18),
      onAccent: '#FFFFFF',
      radius: 18, radiusSm: 12, radiusLg: 24,
      navBg: rgba(12, 12, 18, 0.85),
      navBorderColor: '#20202E',
      navBorderWidth: 1,
      glow: 'none',
      ringTrack: '#23233A',
    },
  },
  pastel: {
    light: {
      bgColor: '#FFF4FA',
      bg2: '#FFEAF4',
      surface: '#FFFFFF',
      surface2: '#FFF0F7',
      cardBorderColor: '#FFE0EE',
      cardBorderWidth: 1,
      cardShadow: `0 10px 26px 0 ${rgba(255, 143, 177, 0.18)}`,
      text: '#6A4A5C',
      textDim: '#A07E8F',
      textFaint: '#C9AEBB',
      accent: '#FF7EB3',
      accent2: '#7FD8C4',
      accentSoft: rgba(255, 126, 179, 0.16),
      onAccent: '#FFFFFF',
      radius: 28, radiusSm: 18, radiusLg: 36,
      navBg: rgba(255, 255, 255, 0.92),
      navBorderColor: '#FFE0EE',
      navBorderWidth: 1,
      glow: 'none',
      ringTrack: '#FFD9EA',
    },
    dark: {
      bgColor: '#2A2230',
      bg2: '#332A3B',
      surface: '#3A3043',
      surface2: '#443A4E',
      cardBorderColor: '#4D4257',
      cardBorderWidth: 1,
      cardShadow: `0 10px 26px 0 ${rgba(0, 0, 0, 0.3)}`,
      text: '#F6E9F1',
      textDim: '#C9B6C6',
      textFaint: '#9A8A98',
      accent: '#FF9EC7',
      accent2: '#92E6D2',
      accentSoft: rgba(255, 158, 199, 0.18),
      onAccent: '#3A2230',
      radius: 28, radiusSm: 18, radiusLg: 36,
      navBg: rgba(42, 34, 48, 0.9),
      navBorderColor: '#4D4257',
      navBorderWidth: 1,
      glow: 'none',
      ringTrack: '#4D4257',
    },
  },
  brutal: {
    light: {
      bgColor: '#FAF4E6',
      bg2: '#FFFDF5',
      surface: '#FFFFFF',
      surface2: '#FFF7D6',
      cardBorderColor: '#111111',
      cardBorderWidth: 2.5,
      cardShadow: '4px 4px 0 0 #111111',
      text: '#141414',
      textDim: '#444444',
      textFaint: '#777777',
      accent: '#FFD400',
      accent2: '#2B6FFF',
      accentSoft: '#FFE98A',
      onAccent: '#111111',
      radius: 4, radiusSm: 3, radiusLg: 6,
      navBg: '#FFFFFF',
      navBorderColor: '#111111',
      navBorderWidth: 2.5,
      glow: 'none',
      ringTrack: '#E7DCC0',
    },
    dark: {
      bgColor: '#161616',
      bg2: '#1E1E1E',
      surface: '#222222',
      surface2: '#2A2A2A',
      cardBorderColor: '#F4F4F4',
      cardBorderWidth: 2.5,
      cardShadow: '4px 4px 0 0 #FFD400',
      text: '#F7F7F2',
      textDim: '#B8B8B0',
      textFaint: '#888888',
      accent: '#FFD400',
      accent2: '#5B8BFF',
      accentSoft: '#3A3514',
      onAccent: '#111111',
      radius: 4, radiusSm: 3, radiusLg: 6,
      navBg: '#1E1E1E',
      navBorderColor: '#F4F4F4',
      navBorderWidth: 2.5,
      glow: 'none',
      ringTrack: '#3A3A3A',
    },
  },
  nature: {
    light: {
      bgColor: '#F1ECE0',
      bg2: '#F7F3EA',
      surface: '#FBF8F1',
      surface2: '#EFE9DA',
      cardBorderColor: '#E2D8C4',
      cardBorderWidth: 1,
      cardShadow: `0 6px 20px 0 ${rgba(90, 80, 50, 0.1)}`,
      text: '#3B3A2E',
      textDim: '#6F6A55',
      textFaint: '#9C9580',
      accent: '#6E8B54',
      accent2: '#B08453',
      accentSoft: rgba(110, 139, 84, 0.16),
      onAccent: '#FFFFFF',
      radius: 20, radiusSm: 14, radiusLg: 26,
      navBg: rgba(251, 248, 241, 0.92),
      navBorderColor: '#E2D8C4',
      navBorderWidth: 1,
      glow: 'none',
      ringTrack: '#DDD3BF',
    },
    dark: {
      bgColor: '#1E231C',
      bg2: '#242B22',
      surface: '#2A3227',
      surface2: '#323B2E',
      cardBorderColor: '#3C4636',
      cardBorderWidth: 1,
      cardShadow: `0 6px 20px 0 ${rgba(0, 0, 0, 0.3)}`,
      text: '#EBF0E2',
      textDim: '#B3BDA6',
      textFaint: '#82906F',
      accent: '#9CBB7E',
      accent2: '#CBA36E',
      accentSoft: rgba(156, 187, 126, 0.18),
      onAccent: '#1E231C',
      radius: 20, radiusSm: 14, radiusLg: 26,
      navBg: rgba(30, 35, 28, 0.92),
      navBorderColor: '#3C4636',
      navBorderWidth: 1,
      glow: 'none',
      ringTrack: '#3C4636',
    },
  },
  cyber: {
    light: {
      bgColor: '#EEF0FF',
      bg2: '#FFFFFF',
      surface: '#FFFFFF',
      surface2: '#F3F2FF',
      cardBorderColor: rgba(212, 0, 168, 0.22),
      cardBorderWidth: 1,
      cardShadow: `0 4px 18px 0 ${rgba(212, 0, 168, 0.14)}`,
      text: '#1A0F28',
      textDim: '#6A5A80',
      textFaint: '#9B8AAE',
      accent: '#D400A8',
      accent2: '#00A7BF',
      accentSoft: rgba(212, 0, 168, 0.1),
      onAccent: '#FFFFFF',
      radius: 12, radiusSm: 8, radiusLg: 16,
      navBg: rgba(255, 255, 255, 0.92),
      navBorderColor: rgba(212, 0, 168, 0.18),
      navBorderWidth: 1,
      glow: `0 0 12px 0 ${rgba(212, 0, 168, 0.4)}`,
      ringTrack: rgba(212, 0, 168, 0.18),
    },
    dark: {
      bgColor: '#070710',
      bg2: '#0C0C1A',
      surface: '#10101F',
      surface2: '#16162A',
      cardBorderColor: rgba(0, 240, 255, 0.22),
      cardBorderWidth: 1,
      cardShadow: `0 0 24px 0 ${rgba(255, 43, 214, 0.12)}`,
      text: '#E8FBFF',
      textDim: '#86B9D6',
      textFaint: '#5A6B88',
      accent: '#FF2BD6',
      accent2: '#00F0FF',
      accentSoft: rgba(255, 43, 214, 0.16),
      onAccent: '#0A0014',
      radius: 12, radiusSm: 8, radiusLg: 16,
      navBg: rgba(8, 8, 18, 0.85),
      navBorderColor: rgba(0, 240, 255, 0.2),
      navBorderWidth: 1,
      glow: `0 0 16px 0 ${rgba(255, 43, 214, 0.6)}`,
      ringTrack: rgba(0, 240, 255, 0.16),
    },
  },
};

export function tokensOf(theme: SfTheme, mode: SfMode): SfTokens {
  return TABLE[theme][mode];
}

/** Applies a token set to CSS custom properties on the given element (default :root). */
export function applyTokensToCss(tokens: SfTokens, el: HTMLElement = document.documentElement) {
  const bgImage = tokens.bgGradient
    ? `linear-gradient(160deg, ${tokens.bgGradient[0]}, ${tokens.bgGradient[1]}, ${tokens.bgGradient[2]})`
    : 'none';
  const vars: Record<string, string> = {
    '--sf-bg-color': tokens.bgColor,
    '--sf-bg-image': bgImage,
    '--sf-bg2': tokens.bg2,
    '--sf-surface': tokens.surface,
    '--sf-surface2': tokens.surface2,
    '--sf-card-border-color': tokens.cardBorderColor,
    '--sf-card-border-width': `${tokens.cardBorderWidth}px`,
    '--sf-card-shadow': tokens.cardShadow,
    '--sf-text': tokens.text,
    '--sf-text-dim': tokens.textDim,
    '--sf-text-faint': tokens.textFaint,
    '--sf-accent': tokens.accent,
    '--sf-accent2': tokens.accent2,
    '--sf-accent-soft': tokens.accentSoft,
    '--sf-on-accent': tokens.onAccent,
    '--sf-radius': `${tokens.radius}px`,
    '--sf-radius-sm': `${tokens.radiusSm}px`,
    '--sf-radius-lg': `${tokens.radiusLg}px`,
    '--sf-nav-bg': tokens.navBg,
    '--sf-nav-border-color': tokens.navBorderColor,
    '--sf-nav-border-width': `${tokens.navBorderWidth}px`,
    '--sf-glow': tokens.glow,
    '--sf-ring-track': tokens.ringTrack,
    '--sf-accent-gradient': `linear-gradient(to bottom left, ${tokens.accent}, ${tokens.accent2})`,
  };
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}
