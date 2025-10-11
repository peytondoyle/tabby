/**
 * Motion utility functions for framer-motion components
 * Provides safe transitions and motion configurations
 */

import type { Transition } from "framer-motion";
import { durations, easing, variants } from "./motion";

export interface MotionConfig {
  initial: any;
  animate: any;
  exit: any;
  transition?: Transition;
}

/**
 * Creates a safe transition that respects user preferences
 */
export const safeTransition = (config: Transition): Transition => ({
  ...config,
  // Respect reduced motion preference
  duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : config.duration,
});

/**
 * Get predefined motion configurations
 */
export const getMotionConfig = (variant: keyof typeof variants): MotionConfig => {
  const config = variants[variant];
  return {
    initial: config.initial,
    animate: config.animate,
    exit: config.exit,
    transition: safeTransition(config.transition),
  };
};

/**
 * Common hover animations
 */
export const hoverEffects = {
  scale: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: safeTransition({ duration: durations.fast / 1000, ease: easing.easeOut }),
  },
  lift: {
    whileHover: { y: -2 },
    whileTap: { y: 0 },
    transition: safeTransition({ duration: durations.fast / 1000, ease: easing.easeOut }),
  },
  glow: {
    whileHover: { boxShadow: "0 0 20px rgba(var(--ui-primary), 0.3)" },
    transition: safeTransition({ duration: durations.base / 1000 }),
  },
};

/**
 * Layout animation presets
 */
export const layoutTransitions = {
  default: safeTransition({
    type: "spring",
    stiffness: 400,
    damping: 25,
  }),
  fast: safeTransition({
    type: "spring", 
    stiffness: 600,
    damping: 30,
  }),
  smooth: safeTransition({
    type: "spring",
    stiffness: 300,
    damping: 30,
  }),
};

export default {
  safeTransition,
  getMotionConfig,
  hoverEffects,
  layoutTransitions,
};