/**
 * iOS-Inspired Motion System
 * Minimal motion with subtle springs and gentle easing
 */

import { designTokens } from './styled'

// ============================================================================
// SPRING PRESETS
// ============================================================================

export const springs = {
  // Subtle spring for gentle interactions
  subtle: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  },
  
  // Standard spring for normal interactions
  standard: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25,
    mass: 0.6,
  },
  
  // Gentle spring for modal/sheet animations
  gentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 35,
    mass: 1.0,
  },
} as const

// ============================================================================
// EASING CURVES
// ============================================================================

export const easing = {
  // iOS-style easing curves
  easeInOut: [0.4, 0, 0.2, 1] as const,
  easeOut: [0, 0, 0.2, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
  
  // Custom iOS-inspired curves
  gentle: [0.25, 0.46, 0.45, 0.94] as const,
  smooth: [0.25, 0.1, 0.25, 1] as const,
} as const

// ============================================================================
// DURATION PRESETS
// ============================================================================

export const durations = {
  fast: 150,
  base: 200,
  slow: 300,
  slower: 400,
} as const

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

export const variants = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: durations.base / 1000,
      ease: easing.easeOut,
    },
  },
  
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: {
      duration: durations.base / 1000,
      ease: easing.easeOut,
    },
  },
  
  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: {
      duration: durations.base / 1000,
      ease: easing.easeOut,
    },
  },
  
  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: {
      duration: durations.fast / 1000,
      ease: easing.easeOut,
    },
  },
  
  // Slide animations
  slideUp: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    transition: springs.gentle,
  },
  
  slideDown: {
    initial: { y: '-100%' },
    animate: { y: 0 },
    exit: { y: '-100%' },
    transition: springs.gentle,
  },
  
  slideLeft: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: springs.gentle,
  },
  
  slideRight: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
    transition: springs.gentle,
  },
  
  // Button press animation
  buttonPress: {
    scale: 0.98,
    transition: {
      duration: durations.fast / 1000,
      ease: easing.easeOut,
    },
  },
  
  // Card hover animation
  cardHover: {
    y: -2,
    transition: {
      duration: durations.base / 1000,
      ease: easing.easeOut,
    },
  },
} as const

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a staggered animation for lists
 */
export const createStaggeredVariants = (staggerDelay = 0.05) => ({
  animate: {
    transition: {
      staggerChildren: staggerDelay,
    },
  },
})

/**
 * Create a simple fade transition
 */
export const createFadeTransition = (duration = durations.base) => ({
  duration: duration / 1000,
  ease: easing.easeOut,
})

/**
 * Create a spring transition
 */
export const createSpringTransition = (preset: keyof typeof springs = 'standard') => ({
  ...springs[preset],
})

/**
 * Create a custom transition with iOS-style easing
 */
export const createCustomTransition = (
  duration: number,
  ease: readonly [number, number, number, number] = easing.easeOut
) => ({
  duration: duration / 1000,
  ease,
})

// ============================================================================
// ACCESSIBILITY HELPERS
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get appropriate transition based on user preferences
 */
export const getAccessibleTransition = (
  normalTransition: any,
  reducedMotionTransition?: any
) => {
  if (prefersReducedMotion()) {
    return reducedMotionTransition || { duration: 0 }
  }
  return normalTransition
}

// ============================================================================
// COMMON ANIMATION PATTERNS
// ============================================================================

export const patterns = {
  // Modal backdrop fade
  modalBackdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: createFadeTransition(durations.base),
  },
  
  // Modal content slide up
  modalContent: {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 20, scale: 0.95 },
    transition: springs.gentle,
  },
  
  // List item stagger
  listItem: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: createFadeTransition(durations.fast),
  },
  
  // Button interaction
  button: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: createSpringTransition('subtle'),
  },
  
  // Card interaction
  card: {
    whileHover: { y: -2 },
    whileTap: { scale: 0.99 },
    transition: createSpringTransition('subtle'),
  },
} as const

// ============================================================================
// EXPORTS
// ============================================================================

export type SpringPreset = keyof typeof springs
export type EasingCurve = keyof typeof easing
export type Duration = keyof typeof durations
export type Variant = keyof typeof variants
export type Pattern = keyof typeof patterns