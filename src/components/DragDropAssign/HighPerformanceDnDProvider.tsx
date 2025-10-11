import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  DndContext, 
  DragOverlay, 
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent
} from '@dnd-kit/core'
import { useMotionPreferences, getDragOverlayStyles, getOptimizedTransform } from '@/lib/motionPreferences'

// Optimized sensor configuration with better activation constraints

interface HighPerformanceDnDProviderProps {
  children: React.ReactNode
  onDragStart?: (event: DragStartEvent) => void
  onDragEnd?: (event: DragEndEvent) => void
  onDragOver?: (event: DragOverEvent) => void
  activeId?: string | null
  activeItem?: React.ReactNode
}

export const HighPerformanceDnDProvider: React.FC<HighPerformanceDnDProviderProps> = ({
  children,
  onDragStart,
  onDragEnd,
  onDragOver,
  activeId,
  activeItem
}) => {
  const prefersReducedMotion = useMotionPreferences()
  const [isDragging, setIsDragging] = useState(false)
  const overlayRef = useRef<HTMLElement | null>(null)

  // Create overlay portal target
  useEffect(() => {
    if (typeof document !== 'undefined') {
      let overlayElement = document.getElementById('drag-overlay-portal')
      if (!overlayElement) {
        overlayElement = document.createElement('div')
        overlayElement.id = 'drag-overlay-portal'
        overlayElement.style.position = 'fixed'
        overlayElement.style.top = '0'
        overlayElement.style.left = '0'
        overlayElement.style.width = '100%'
        overlayElement.style.height = '100%'
        overlayElement.style.pointerEvents = 'none'
        overlayElement.style.zIndex = '9999'
        document.body.appendChild(overlayElement)
      }
      overlayRef.current = overlayElement
    }
  }, [])

  // Memoize sensors to prevent recreation
  const sensors = useMemo(() => [
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
        delay: 100,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor, {})
  ], [])

  // Use lightweight collision detection
  const collisionDetection = useMemo(() => closestCenter, [])

  // Memoize handlers to prevent recreation
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setIsDragging(true)
    onDragStart?.(event)
  }, [onDragStart])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setIsDragging(false)
    onDragEnd?.(event)
  }, [onDragEnd])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    onDragOver?.(event)
  }, [onDragOver])

  // Render drag overlay in portal for better performance
  const renderDragOverlay = () => {
    if (!activeId || !activeItem || !overlayRef.current) return null

    const overlayStyles = getDragOverlayStyles(prefersReducedMotion)
    
    return createPortal(
      <DragOverlay
        style={overlayStyles}
        dropAnimation={prefersReducedMotion ? null : {
          duration: 200,
          easing: 'ease-out'
        }}
      >
        <div
          style={{
            ...overlayStyles,
            // Disable shadows during drag for performance
            boxShadow: isDragging && !prefersReducedMotion ? '0 20px 40px rgba(0, 0, 0, 0.3)' : 'none',
            // Use transform3d for hardware acceleration
            transform: prefersReducedMotion ? 'none' : 'rotate(5deg) scale(1.05)',
            // Optimize for performance
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
            perspective: '1000px'
          }}
        >
          {activeItem}
        </div>
      </DragOverlay>,
      overlayRef.current
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      {children}
      {renderDragOverlay()}
    </DndContext>
  )
}

// Hook for creating optimized draggable items
export function useOptimizedDraggable() {
  const prefersReducedMotion = useMotionPreferences()
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  const getOptimizedStyle = useCallback((transform: { x: number; y: number } | null) => {
    const baseStyle = getOptimizedTransform(transform, prefersReducedMotion)
    
    if (isDragging) {
      return {
        ...baseStyle,
        // Reduce opacity during drag for performance
        opacity: prefersReducedMotion ? 0.8 : 0.6,
        // Disable shadows during drag
        boxShadow: 'none',
        // Use transform3d for hardware acceleration
        transform: baseStyle?.transform || 'none',
        willChange: 'transform, opacity'
      }
    }

    return baseStyle
  }, [isDragging, prefersReducedMotion])

  return {
    isDragging,
    handleDragStart,
    handleDragEnd,
    getOptimizedStyle
  }
}

// Hook for creating optimized droppable areas
export function useOptimizedDroppable() {
  const prefersReducedMotion = useMotionPreferences()
  const [isOver, setIsOver] = useState(false)

  const handleDragOver = useCallback(() => {
    setIsOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsOver(false)
  }, [])

  const getDroppableStyles = useCallback(() => {
    if (!isOver) return {}

    return {
      // Minimal visual feedback for reduced motion
      ...(prefersReducedMotion ? {
        opacity: 0.9,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: 'var(--ui-primary)'
      } : {
        // Enhanced feedback for full motion
        opacity: 0.95,
        transform: 'scale(1.02)',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: 'var(--ui-primary)',
        boxShadow: '0 0 20px rgba(var(--ui-primary-rgb), 0.3)',
        transition: 'all 0.2s ease-out'
      })
    }
  }, [isOver, prefersReducedMotion])

  return {
    isOver,
    handleDragOver,
    handleDragLeave,
    getDroppableStyles
  }
}
