
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  family: {
    regular: undefined as string | undefined, // falls back to system font per-platform
    medium: undefined as string | undefined,
    bold: undefined as string | undefined,
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 22,
    lg: 24,
    xl: 28,
    xxl: 34,
    display: 40,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

const palette = {
  blue: {
    500: '#0B5FFF',
    600: '#0847CC',
  },
  green: {
    500: '#1FAA59',
    600: '#158A46',
  },
  amber: {
    500: '#D98A11',
    600: '#B5720C',
  },
  pink: {
    100: '#FFE3EE',
    500: '#FF3380',
    600: '#E0226B',
    700: '#C2185B',
    900: '#4A1029',
  },
  teal: {
    300: '#4FC3B0',
    500: '#17A99B',
    700: '#0B5F52',
  },
  red: {
    500: '#E3453B',
    600: '#C0362D',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F5F6F8',
    100: '#E9EBEF',
    200: '#D3D7DE',
    300: '#AFB5C0',
    400: '#7C828F',
    500: '#5A6270',
    600: '#3F4652',
    700: '#2A2F38',
    800: '#1B1F26',
    900: '#12151A',
    950: '#0B0D12',
  },
} as const;

export type ColorScheme = 'light' | 'dark';

export interface SemanticColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  tint: string;
  tintPressed: string;
  /** High-emphasis call to action (e.g. auth screen submit). */
  accent: string;
  accentPressed: string;
  /** Text/icons drawn on top of `accent`. */
  onAccent: string;
  accentSoft: string;
  /** Inline text links. */
  link: string;
  /** Drill target markers and the path between them. */
  target: string;
  success: string;
  warning: string;
  danger: string;
  dangerPressed: string;
  overlay: string;
  skeleton: string;
}

/** Semantic color tokens. Never reference `palette` directly outside this file. */
export const colors: Record<ColorScheme, SemanticColors> = {
  light: {
    background: palette.neutral[50],
    surface: palette.neutral[0],
    surfaceRaised: palette.neutral[0],
    border: palette.neutral[200],
    textPrimary: palette.neutral[900],
    textSecondary: palette.neutral[500],
    textInverse: palette.neutral[0],
    tint: palette.blue[500],
    tintPressed: palette.blue[600],
    accent: palette.pink[600],
    accentPressed: palette.pink[700],
    onAccent: palette.neutral[0],
    accentSoft: palette.pink[100],
    link: palette.teal[700],
    target: palette.teal[500],
    success: palette.green[500],
    warning: palette.amber[500],
    danger: palette.red[500],
    dangerPressed: palette.red[600],
    overlay: 'rgba(11, 13, 18, 0.5)',
    skeleton: palette.neutral[100],
  },
  dark: {
    background: palette.neutral[950],
    surface: palette.neutral[900],
    surfaceRaised: palette.neutral[800],
    border: palette.neutral[700],
    textPrimary: palette.neutral[50],
    textSecondary: palette.neutral[400],
    textInverse: palette.neutral[950],
    tint: palette.blue[500],
    tintPressed: palette.blue[600],
    accent: palette.pink[600],
    accentPressed: palette.pink[700],
    onAccent: palette.neutral[0],
    accentSoft: palette.pink[900],
    link: palette.teal[300],
    target: palette.teal[500],
    success: palette.green[500],
    warning: palette.amber[500],
    danger: palette.red[500],
    dangerPressed: palette.red[600],
    overlay: 'rgba(0, 0, 0, 0.6)',
    skeleton: palette.neutral[800],
  },
};

export const shadow = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;

/** Minimum interactive touch target, per WCAG / platform HIG guidance. */
export const minTouchTarget = 44;
