/**
 * Accessibility Utilities
 * Motion, focus, and contrast helpers
 */

import React from 'react'

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check if device supports hover
 */
export const supportsHover = (): boolean => {
  return window.matchMedia('(hover: hover)').matches
}

/**
 * Check if device is touch-capable
 */
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Get appropriate animation duration based on user preferences
 */
export const getAnimationDuration = (baseDuration: number = 200): number => {
  return prefersReducedMotion() ? 0 : baseDuration
}

/**
 * Get appropriate spring configuration based on user preferences
 */
export const getSpringConfig = (baseDamping: number = 26, baseStiffness: number = 280) => {
  if (prefersReducedMotion()) {
    return { type: 'tween' as const, duration: 0.1 }
  }
  return { type: 'spring' as const, damping: baseDamping, stiffness: baseStiffness }
}

/**
 * Focus trap for modals and sheets
 */
export class FocusTrap {
  private container: HTMLElement
  private firstFocusable: HTMLElement | null = null
  private lastFocusable: HTMLElement | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.setupFocusableElements()
  }

  private setupFocusableElements() {
    const focusableElements = this.container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    this.firstFocusable = focusableElements[0] || null
    this.lastFocusable = focusableElements[focusableElements.length - 1] || null
  }

  trap(event: KeyboardEvent) {
    if (event.key !== 'Tab') return

    if (event.shiftKey) {
      if (document.activeElement === this.firstFocusable) {
        event.preventDefault()
        this.lastFocusable?.focus()
      }
    } else {
      if (document.activeElement === this.lastFocusable) {
        event.preventDefault()
        this.firstFocusable?.focus()
      }
    }
  }

  activate() {
    this.container.addEventListener('keydown', this.trap.bind(this))
    this.firstFocusable?.focus()
  }

  deactivate() {
    this.container.removeEventListener('keydown', this.trap.bind(this))
  }
}

/**
 * WCAG AA contrast checker
 */
export const checkContrast = (foreground: string, background: string): boolean => {
  // Simple contrast check - in production, use a proper contrast library
  const getLuminance = (color: string): number => {
    const rgb = color.match(/\d+/g)
    if (!rgb) return 0
    
    const [r, g, b] = rgb.map(c => {
      const val = parseInt(c) / 255
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const fgLum = getLuminance(foreground)
  const bgLum = getLuminance(background)
  
  const contrast = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05)
  
  return contrast >= 4.5 // WCAG AA standard
}

/**
 * Generate focus ring styles
 */
export const getFocusRingStyles = () => ({
  outline: '2px solid #0A84FF',
  outlineOffset: '3px'
})

/**
 * Assign feedback animation
 */
export const triggerAssignFeedback = (element: HTMLElement): void => {
  element.classList.add('assign-feedback')
  
  setTimeout(() => {
    element.classList.remove('assign-feedback')
  }, 240)
}

/**
 * React hook for reduced motion preference
 */
export const useReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  return prefersReducedMotion
}

/**
 * Get motion variants based on user preferences
 */
export const getMotionVariants = (baseVariants: any) => {
  return {
    ...baseVariants,
    transition: getSpringConfig()
  }
}

/**
 * Get optimized transform for performance
 */
export const getOptimizedTransform = (x: number, y: number) => ({
  transform: `translate3d(${x}px, ${y}px, 0)`,
  willChange: 'transform'
})

/**
 * Get shadow styles for depth
 */
export const getShadowStyles = (depth: number = 1) => {
  const shadows = [
    '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
    '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
    '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
    '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)'
  ]
  
  return {
    boxShadow: shadows[Math.min(depth - 1, shadows.length - 1)]
  }
}

/**
 * Aria Live Region component for screen reader announcements
 */
export const AriaLiveRegion: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return React.createElement('div', {
    className: `sr-only ${className}`,
    'aria-live': 'polite',
    'aria-atomic': 'true'
  }, children)
}

/**
 * Hook for managing aria live region announcements
 */
export const useAriaLiveRegion = () => {
  const [announcement, setAnnouncement] = React.useState('')
  
  const announce = React.useCallback((message: string) => {
    setAnnouncement('')
    // Force re-render for screen readers
    setTimeout(() => setAnnouncement(message), 10)
  }, [])
  
  return { announcement, announce }
}
