/**
 * Glidy design tokens. The palette is taken from the Glidy web project (amber on warm
 * cream, with a warm dark mode), so the app and the site feel like one product.
 *
 * Token meaning (names kept stable so components do not care about the palette):
 *   background          page
 *   backgroundElement   cards and inputs (web: --card)
 *   backgroundSelected  secondary surfaces, chips, pressed states (web: --secondary / --muted)
 *   primary             brand amber: buttons, badges, active tab (web: --primary / --amber)
 *   primaryDark         deeper amber for text on light surfaces (web: --amber-dark)
 *   accent              soft amber tint for highlights (web: --accent / --amber-light)
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#212121',
    background: '#F9F6F0',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F0EBE0',
    textSecondary: '#737373',
    primary: '#EFB708',
    primaryDark: '#C07A10',
    onPrimary: '#212121',
    accent: '#FDEFC3',
    onAccent: '#212121',
    border: '#E8DFC8',
    danger: '#EF4444',
    /** Floating tab bar and other "ink" surfaces. */
    ink: '#212121',
    onInk: '#F9F6F0',
    /** Strokes of drawn art (route lines): readable on the soft amber tile in either theme. */
    line: '#212121',
  },
  dark: {
    text: '#F9F6F0',
    background: '#1A1814',
    backgroundElement: '#242018',
    backgroundSelected: '#2E2920',
    textSecondary: '#A3A3A3',
    primary: '#EFB708',
    primaryDark: '#EFB708',
    onPrimary: '#212121',
    accent: '#3D3528',
    onAccent: '#F9F6F0',
    border: '#3D3528',
    danger: '#EF4444',
    ink: '#0F0D0A',
    onInk: '#F9F6F0',
    line: '#EFB708',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export type Language = 'en' | 'km';
export type FontWeight = 400 | 500 | 600 | 700 | 800;

/**
 * Exo 2 for English and Kantumruy Pro for Khmer (the same pairing as the web project).
 * On native each weight is its own font family, so the weight is part of the family name
 * and `fontWeight` must not be set on text that uses these.
 */
const FONT_FAMILIES: Record<Language, Record<FontWeight, string>> = {
  en: {
    400: 'Exo2_400Regular',
    500: 'Exo2_500Medium',
    600: 'Exo2_600SemiBold',
    700: 'Exo2_700Bold',
    800: 'Exo2_800ExtraBold',
  },
  km: {
    400: 'KantumruyPro_400Regular',
    500: 'KantumruyPro_500Medium',
    600: 'KantumruyPro_600SemiBold',
    700: 'KantumruyPro_700Bold',
    // Kantumruy Pro tops out at 700.
    800: 'KantumruyPro_700Bold',
  },
};

export function fontFamilyFor(language: Language, weight: FontWeight | string | number | undefined): string {
  const w = Number(weight) || 400;
  const nearest: FontWeight = w >= 800 ? 800 : w >= 700 ? 700 : w >= 600 ? 600 : w >= 500 ? 500 : 400;
  return FONT_FAMILIES[language][nearest];
}

/**
 * Display (headline) fonts: heavy Exo 2 for English, and Moul, the ornate Khmer headline face from
 * the Glidy web project, for Khmer. Moul has a single weight and is much wider than Kantumruy Pro,
 * so use it only for short headlines.
 */
export const DISPLAY_FONT: Record<Language, string> = {
  en: 'Exo2_800ExtraBold',
  km: 'Moul_400Regular',
};

/** Khmer glyphs are taller than Latin ones and need more line height to avoid clipping. */
export const KHMER_LINE_HEIGHT_SCALE = 1.2;

/**
 * A font size or line height multiplied by the user's text-size setting. Large display numbers
 * (32 and up) only grow half as much, so headings and big figures do not overflow their cards.
 */
export function scaleText(size: number, scale: number): number {
  const factor = size >= 32 ? 1 + (scale - 1) * 0.5 : scale;
  return Math.round(size * factor * 10) / 10;
}

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Web project uses --radius: 1rem as its base. */
export const Radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/** Space to keep clear under scrolling content for the floating tab bar. */
export const BottomTabInset = 112;
export const MaxContentWidth = 800;
