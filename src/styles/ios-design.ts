/**
 * iOS 26-Inspired Design System
 * Light mode only, minimal, gorgeous design tokens
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Neutral Grays (iOS style)
  gray: {
    50: '#fafafa',
    100: '#f5f5f5', 
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Primary Blue (iOS #007AFF)
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    primary: '#007AFF', // iOS blue
  },
  
  // Semantic Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  
  // Base Colors
  white: '#ffffff',
  black: '#000000',
} as const

// ============================================================================
// SEMANTIC TOKENS
// ============================================================================

export const semantic = {
  // Backgrounds (Billy dark theme)
  background: {
    primary: '#0C0D10', // graphite canvas
    secondary: '#121317', // slightly lighter for panels
    tertiary: '#15171C',
    elevated: '#1C1F27', // dark cards/pills
  },
  
  // Text (Billy dark theme)
  text: {
    primary: '#FFFFFF',
    secondary: '#C9CDD6',
    tertiary: '#8D93A3',
    disabled: colors.gray[400],
    inverse: '#000000',
  },
  
  // Borders (Billy dark theme)
  border: {
    subtle: 'rgba(255,255,255,0.08)',
    default: 'rgba(255,255,255,0.14)',
    strong: 'rgba(255,255,255,0.24)',
    focus: '#0A84FF',
  },
  
  // Interactive (Billy dark theme)
  interactive: {
    primary: '#0A84FF',
    primaryHover: '#3394FF',
    primaryActive: '#0874E6',
    secondary: 'rgba(255,255,255,0.06)',
    secondaryHover: 'rgba(255,255,255,0.12)',
    secondaryActive: 'rgba(255,255,255,0.18)',
  },
  
  // Pill variants - locked to prevent drift
  pill: {
    mine: {
      background: '#6A5C50',
      border: 'rgba(255,255,255,0.12)',
    },
    unassigned: {
      background: 'rgba(136,120,180,0.35)',
      border: 'rgba(255,255,255,0.2)',
    },
    assigned: {
      background: 'rgba(255,255,255,0.04)',
      border: 'rgba(255,255,255,0.14)',
    },
  },
  
  // Status
  status: {
    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],
  },
} as const

// ============================================================================
// SPACING SCALE (4px base)
// ============================================================================

export const spacing = {
  0: '0px',
  1: '4px',   // 0.25rem
  2: '8px',   // 0.5rem
  3: '12px',  // 0.75rem
  4: '16px',  // 1rem
  5: '20px',  // 1.25rem
  6: '24px',  // 1.5rem
  8: '32px',  // 2rem
  10: '40px', // 2.5rem
  12: '48px', // 3rem
  16: '64px', // 4rem
  20: '80px', // 5rem
  24: '96px', // 6rem
  32: '128px', // 8rem
} as const

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font Families
  fontFamily: {
    sans: [
      '-apple-system',
      'BlinkMacSystemFont',
      'SF Pro Display',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(', '),
    mono: [
      'SF Mono',
      'Monaco',
      'Inconsolata',
      'Fira Code',
      'monospace',
    ].join(', '),
  },
  
  // Font Sizes
  fontSize: {
    xs: '12px',    // 0.75rem
    sm: '14px',    // 0.875rem
    base: '16px',  // 1rem
    lg: '18px',    // 1.125rem
    xl: '20px',    // 1.25rem
    '2xl': '24px', // 1.5rem
    '3xl': '30px', // 1.875rem
    '4xl': '36px', // 2.25rem
    '5xl': '48px', // 3rem
  },
  
  // Font Weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
  },
} as const

// ============================================================================
// BORDER RADIUS (iOS Standard)
// ============================================================================

export const borderRadius = {
  none: '0px',
  sm: '6px',    // 0.375rem
  md: '10px',   // 0.625rem - iOS standard
  lg: '12px',   // 0.75rem - iOS standard
  xl: '16px',   // 1rem - iOS standard
  '2xl': '20px', // 1.25rem - iOS standard
  '3xl': '24px', // 1.5rem
  full: '9999px',
} as const

// ============================================================================
// SHADOWS (iOS Style - Subtle)
// ============================================================================

export const shadows = {
  none: 'none',
  sm: '0 12px 24px rgba(0,0,0,0.25)',
  md: '0 18px 36px rgba(0,0,0,0.32)',
  lg: '0 24px 48px rgba(0,0,0,0.45)',
  xl: '0 32px 64px rgba(0,0,0,0.55)',
  inner: 'inset 0 1px 0 rgba(255,255,255,0.08)',
} as const

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modalBackdrop: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
} as const

// ============================================================================
// TRANSITIONS (iOS Style - Subtle)
// ============================================================================

export const transitions = {
  fast: '100ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  spring: '400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', // iOS spring
} as const

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// ============================================================================
// ALPHA VALUES (for glass/blur effects)
// ============================================================================

export const alpha = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  25: '0.25',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  75: '0.75',
  80: '0.8',
  90: '0.9',
  95: '0.95',
  100: '1',
} as const

// ============================================================================
// EXPORT ALL TOKENS
// ============================================================================

export const designTokens = {
  colors,
  semantic,
  spacing,
  typography,
  borderRadius,
  shadows,
  zIndex,
  transitions,
  breakpoints,
  alpha,
} as const

export type DesignTokens = typeof designTokens
export type ColorScale = keyof typeof colors.gray
export type SpacingScale = keyof typeof spacing
export type FontSize = keyof typeof typography.fontSize
export type BorderRadius = keyof typeof borderRadius
export type Shadow = keyof typeof shadows
