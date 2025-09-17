import React, { useMemo, useCallback } from 'react'
import { 
  DndContext, 
  DragOverlay, 
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'

// Stable sensor configuration - created once at module level

interface OptimizedDnDProviderProps {
  children: React.ReactNode
  onDragStart?: (event: DragStartEvent) => void
  onDragEnd?: (event: DragEndEvent) => void
  activeId?: string | null
  activeItem?: React.ReactNode
}

export const OptimizedDnDProvider: React.FC<OptimizedDnDProviderProps> = ({
  children,
  onDragStart,
  onDragEnd,
  activeId,
  activeItem
}) => {
  // Memoize sensors to prevent recreation
  const sensors = useMemo(() => [
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  ], [])

  // Memoize collision detection
  const collisionDetection = useMemo(() => closestCenter, [])

  // Memoize handlers to prevent recreation
  const handleDragStart = useCallback((event: DragStartEvent) => {
    onDragStart?.(event)
  }, [onDragStart])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    onDragEnd?.(event)
  }, [onDragEnd])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      {activeId && activeItem && (
        <DragOverlay>
          {activeItem}
        </DragOverlay>
      )}
    </DndContext>
  )
}

// Hook for creating stable activation constraints
export const useStableActivationConstraints = () => {
  return useMemo(() => ({
    distance: 8,
    tolerance: 5,
    delay: 100,
    interval: 0
  }), [])
}

// Hook for creating stable sensors
export const useStableSensors = () => {
  const constraints = useStableActivationConstraints()
  
  return useMemo(() => [
    useSensor(PointerSensor, {
      activationConstraint: constraints
    }),
    useSensor(KeyboardSensor)
  ], [constraints])
}
