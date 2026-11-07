import type { TextStyle } from 'react-native';

export const colors = {
  background: '#FFFFFF',
  surface: '#F2F5F9',
  text: '#14202E',
  textMuted: '#4A5A6B',
  primary: '#0F62B8',
  primaryPressed: '#0B4C8F',
  primarySoft: '#D6E8FB',
  onPrimary: '#FFFFFF',
  danger: '#B3261E',
  masteryGrey: '#4A5A6B',
  masteryGreySoft: '#E6EAEF',
  masteryYellow: '#6B4A00',
  masteryYellowSoft: '#FCE9A8',
  masteryGreen: '#17692B',
  masteryGreenSoft: '#CDEFD6',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  md: 12,
};

/** Smallest size, in dp, of anything the user taps. */
export const minTouchTarget = 64;

export const typography = {
  caption: { fontSize: 16, lineHeight: 22 },
  body: { fontSize: 18, lineHeight: 26 },
  label: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  display: { fontSize: 40, lineHeight: 48, fontWeight: '700' },
} satisfies Record<string, TextStyle>;
