/**
 * Optimized motion components for LazyMotion
 * Reduces framer-motion bundle size by ~40KB
 */
import { m, AnimatePresence } from 'framer-motion'

// Re-export for convenience
export { m as motion, AnimatePresence }
export type { Variants, Transition, MotionProps } from 'framer-motion'
