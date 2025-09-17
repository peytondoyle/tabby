import { useEffect, useRef, useState } from 'react'

/**
 * Hook for managing ARIA live regions
 */
export function useAriaLiveRegion() {
  const [announcements, setAnnouncements] = useState<string[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const announce = (message: string, _priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, message])
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Clear announcements after a delay
    timeoutRef.current = setTimeout(() => {
      setAnnouncements([])
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { announcements, announce }
}

/**
 * Hook for detecting reduced motion preference
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

/**
 * Get motion variants based on reduced motion preference
 */
export function getMotionVariants(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      // Minimal animations for reduced motion
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      hover: {},
      tap: {},
      drag: {},
    }
  }

  return {
    // Full animations for normal motion
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
    drag: { scale: 1.1, rotate: 5 },
  }
}

/**
 * Get optimized transform styles based on reduced motion preference
 */
export function getOptimizedTransform(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      transform: 'translateZ(0)', // Hardware acceleration without 3D transforms
      willChange: 'auto',
    }
  }

  return {
    transform: 'translate3d(0, 0, 0)', // Full 3D acceleration
    willChange: 'transform',
  }
}

/**
 * Get shadow styles based on reduced motion preference
 */
export function getShadowStyles(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      boxShadow: 'none',
      filter: 'none',
    }
  }

  return {
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
  }
}

/**
 * ARIA Live Region component for announcements
 */
export interface AriaLiveRegionProps {
  announcements: string[]
  priority?: 'polite' | 'assertive'
  className?: string
}

export function AriaLiveRegion({ 
  announcements, 
  priority = 'polite',
  className = ''
}: AriaLiveRegionProps) {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
      role="status"
    >
      {announcements.map((announcement, index) => (
        <div key={index}>{announcement}</div>
      ))}
    </div>
  )
}

/**
 * Screen reader only utility class
 */
export const srOnly = 'sr-only'

/**
 * Focus management utilities
 */
export function focusElement(element: HTMLElement | null) {
  if (element) {
    element.focus()
  }
}

export function focusFirstFocusable(container: HTMLElement | null) {
  if (!container) return
  
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  if (focusableElements.length > 0) {
    focusElement(focusableElements[0] as HTMLElement)
  }
}

export function trapFocus(container: HTMLElement | null) {
  if (!container) return

  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)
  
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Accessibility constants
 */
export const ACCESSIBILITY = {
  ROLES: {
    GRID: 'grid',
    GRIDCELL: 'gridcell',
    BUTTON: 'button',
    LIST: 'list',
    LISTITEM: 'listitem',
    STATUS: 'status',
    ALERT: 'alert',
  },
  ARIA_LABELS: {
    ITEMS_GRID: 'Items grid - use arrow keys to navigate, Enter to select, Space for assign mode',
    PEOPLE_DOCK: 'People dock - use arrow keys to navigate, Enter to assign selected items',
    ASSIGN_MODE: 'Assign mode - select a person to assign items',
    TOTALS_UPDATE: 'Totals updated',
    ITEM_ASSIGNED: 'Item assigned to person',
    ITEM_UNASSIGNED: 'Item unassigned',
    SELECTION_CLEARED: 'Selection cleared',
  },
  KEYBOARD_SHORTCUTS: {
    SELECT: 'Enter',
    ASSIGN_MODE: 'Space',
    CANCEL: 'Escape',
    NAVIGATE_UP: 'ArrowUp',
    NAVIGATE_DOWN: 'ArrowDown',
    NAVIGATE_LEFT: 'ArrowLeft',
    NAVIGATE_RIGHT: 'ArrowRight',
    FIRST_ITEM: 'Home',
    LAST_ITEM: 'End',
  },
} as const
