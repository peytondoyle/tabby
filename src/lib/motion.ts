/**
 * Motion utilities for consistent animations across the application
 * Provides standard durations, easings, and spring configurations
 */

// Duration constants (in seconds)
export const duration = {
  /** Instant transitions - 50ms */
  instant: 0.05,
  /** Quick transitions - 150ms */
  fast: 0.15,
  /** Standard transitions - 250ms */
  normal: 0.25,
  /** Slower transitions - 400ms */
  slow: 0.4,
  /** Very slow transitions - 600ms */
  slower: 0.6,
} as const;

// Easing functions
export const ease = {
  /** Linear easing */
  linear: [0, 0, 1, 1],
  /** Standard ease out - most common */
  out: [0, 0, 0.2, 1],
  /** Ease in */
  in: [0.4, 0, 1, 1],
  /** Ease in and out */
  inOut: [0.4, 0, 0.2, 1],
  /** Sharp ease out for quick interactions */
  sharp: [0.4, 0, 0.6, 1],
  /** Gentle ease out for smooth transitions */
  gentle: [0.25, 0.46, 0.45, 0.94],
  /** Bounce effect */
  bounce: [0.68, -0.55, 0.265, 1.55],
  /** Back ease out */
  backOut: [0.34, 1.56, 0.64, 1],
} as const;

// Spring configurations for framer-motion
export const spring = {
  /** Gentle spring for subtle animations */
  gentle: {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
  },
  /** Standard spring for most interactions */
  standard: {
    type: "spring" as const,
    stiffness: 500,
    damping: 25,
  },
  /** Bouncy spring for playful interactions */
  bouncy: {
    type: "spring" as const,
    stiffness: 600,
    damping: 15,
    bounce: 0.6,
  },
  /** Stiff spring for quick, responsive interactions */
  stiff: {
    type: "spring" as const,
    stiffness: 800,
    damping: 30,
  },
  /** Wobbly spring for attention-grabbing animations */
  wobbly: {
    type: "spring" as const,
    stiffness: 180,
    damping: 12,
  },
} as const;

// Common transition presets
export const transition = {
  /** Quick fade transitions */
  fade: {
    duration: duration.fast,
    ease: ease.out,
  },
  /** Smooth scale transitions */
  scale: {
    duration: duration.normal,
    ease: ease.gentle,
  },
  /** Slide transitions */
  slide: {
    duration: duration.normal,
    ease: ease.out,
  },
  /** Button press transitions */
  press: {
    duration: duration.instant,
    ease: ease.sharp,
  },
} as const;

// Framer Motion variants using the utilities
export const variants = {
  /** Fade in/out */
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: transition.fade,
  },
  /** Scale in/out */
  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: transition.scale,
  },
  /** Slide up */
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
    transition: transition.slide,
  },
  /** Slide down */
  slideDown: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
    transition: transition.slide,
  },
  /** Slide left */
  slideLeft: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
    transition: transition.slide,
  },
  /** Slide right */
  slideRight: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
    transition: transition.slide,
  },
} as const;

// CSS-based animation classes using the utilities
export const cssAnimations = {
  /** Quick fade in */
  fadeIn: `transition-opacity duration-150 ease-out`,
  /** Quick fade out */
  fadeOut: `transition-opacity duration-150 ease-in`,
  /** Scale hover effect */
  scaleHover: `transition-transform duration-150 ease-out hover:scale-105`,
  /** Button press effect */
  buttonPress: `transition-transform duration-75 ease-sharp active:scale-95`,
  /** Smooth slide */
  slideTransition: `transition-transform duration-250 ease-out`,
  /** Loading pulse */
  pulse: `animate-pulse`,
  /** Loading spin */
  spin: `animate-spin`,
} as const;

// Utility functions
export const createTransition = (
  duration: number,
  easing: readonly [number, number, number, number]
) => ({
  duration,
  ease: easing,
});

export const createSpring = (
  stiffness: number,
  damping: number,
  bounce?: number
) => ({
  type: "spring" as const,
  stiffness,
  damping,
  ...(bounce && { bounce }),
});

// Export all as default for convenience
export default {
  duration,
  ease,
  spring,
  transition,
  variants,
  cssAnimations,
  createTransition,
  createSpring,
};