/**
 * Glidy design tokens. Greens are the brand colour, yellow is the accent used for
 * highlights (selected states, badges), and surfaces are soft neutral cards.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#10201A',
    background: '#E4E7E3',
    backgroundElement: '#F2F4F1',
    backgroundSelected: '#D5DAD4',
    textSecondary: '#5B6A62',
    primary: '#2F7A4F',
    primaryDark: '#1F5C3A',
    onPrimary: '#FFFFFF',
    accent: '#F4C430',
    onAccent: '#1B1B12',
    border: '#CBD1CA',
    danger: '#C8402E',
    tabBar: '#0E1511',
  },
  dark: {
    text: '#F1F5F2',
    background: '#0C120F',
    backgroundElement: '#17201B',
    backgroundSelected: '#223029',
    textSecondary: '#9DB0A5',
    primary: '#4C9F6B',
    primaryDark: '#2F7A4F',
    onPrimary: '#06120B',
    accent: '#F4C430',
    onAccent: '#1B1B12',
    border: '#2B3A32',
    danger: '#E8604C',
    tabBar: '#050806',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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

export const Radius = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

/** Space to keep clear under scrolling content for the floating tab bar. */
export const BottomTabInset = Platform.select({ ios: 96, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
