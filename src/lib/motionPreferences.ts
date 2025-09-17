import { useState, useEffect } from 'react'

/**
 * Hook to detect user's motion preferences
 * Returns true if user prefers reduced motion
 */
export function useMotionPreferences(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if the browser supports the media query
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      
      // Set initial value
      setPrefersReducedMotion(mediaQuery.matches)
      
      // Listen for changes
      const handleChange = (event: MediaQueryListEvent) => {
        setPrefersReducedMotion(event.matches)
      }
      
      mediaQuery.addEventListener('change', handleChange)
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
  }, [])

  return prefersReducedMotion
}

/**
 * Get motion variants based on user preferences
 * Returns reduced motion variants if user prefers reduced motion
 */
export function getMotionVariants(prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    return {
      // Minimal motion for accessibility
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      hover: {},
      tap: {},
      drag: {},
      layout: false
    }
  }

  return {
    // Full motion for users who want it
    initial: { opacity: 0, scale: 0.8, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.8, y: -20 },
    hover: { scale: 1.05, y: -2 },
    tap: { scale: 0.98 },
    drag: { scale: 1.1, rotate: 5 },
    layout: true
  }
}

/**
 * Get drag overlay styles based on motion preferences
 */
export function getDragOverlayStyles(prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    return {
      // Minimal styling for reduced motion
      opacity: 0.8,
      transform: 'none',
      boxShadow: 'none',
      filter: 'none'
    }
  }

  return {
    // Enhanced styling for full motion
    opacity: 0.9,
    transform: 'rotate(5deg) scale(1.05)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
    filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2))'
  }
}

/**
 * Check if animations should be disabled based on motion preferences
 */
export function shouldDisableAnimations(prefersReducedMotion: boolean): boolean {
  return prefersReducedMotion
}

/**
 * Get optimized transform styles for drag operations
 */
export function getOptimizedTransform(transform: { x: number; y: number } | null, prefersReducedMotion: boolean) {
  if (!transform) return undefined

  if (prefersReducedMotion) {
    // Use 2D transforms for better performance
    return {
      transform: `translate(${transform.x}px, ${transform.y}px)`,
      willChange: 'transform'
    }
  }

  // Use 3D transforms for smooth animations
  return {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    willChange: 'transform'
  }
}
