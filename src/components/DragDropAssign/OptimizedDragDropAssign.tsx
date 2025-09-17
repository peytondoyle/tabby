import React, { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { HighPerformanceDnDProvider } from './HighPerformanceDnDProvider'
import { OptimizedDraggableItem } from './OptimizedDraggableItem'
import { OptimizedDroppablePerson } from './OptimizedDroppablePerson'
import { useMotionPreferences, getMotionVariants } from '@/lib/motionPreferences'
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core'

interface Person {
  id: string
  name: string
  avatar?: string
  color: string
}

interface Item {
  id: string
  label: string
  price: number
  emoji: string
  quantity?: number
  assignedTo?: string[]
}

interface OptimizedDragDropAssignProps {
  people: Person[]
  items: Item[]
  onItemAssign: (itemId: string, personId: string) => void
  isVirtualized?: boolean
}

export const OptimizedDragDropAssign: React.FC<OptimizedDragDropAssignProps> = ({
  people,
  items,
  onItemAssign,
  isVirtualized = false
}) => {
  const prefersReducedMotion = useMotionPreferences()
  const motionVariants = getMotionVariants(prefersReducedMotion)
  
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})

  // Memoize assigned items lookup for performance
  const assignedItemsByPerson = useMemo(() => {
    const lookup = new Map<string, Item[]>()
    
    for (const [itemId, personIds] of Object.entries(assignments)) {
      const item = items.find(i => i.id === itemId)
      if (!item) continue
      
      for (const personId of personIds) {
        if (!lookup.has(personId)) {
          lookup.set(personId, [])
        }
        lookup.get(personId)!.push(item)
      }
    }
    
    return lookup
  }, [assignments, items])

  // Memoize unassigned items for performance
  const unassignedItems = useMemo(() => {
    const assignedItemIds = new Set(Object.keys(assignments))
    return items.filter(item => !assignedItemIds.has(item.id))
  }, [items, assignments])

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const itemId = active.id as string
      const personId = over.id as string
      
      // Update local state
      setAssignments(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), personId]
      }))
      
      // Call parent handler
      onItemAssign(itemId, personId)
    }
    
    setActiveId(null)
    setOverId(null)
  }, [onItemAssign])

  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id as string || null)
  }, [])

  // Get active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId) return null
    
    const item = items.find(i => i.id === activeId)
    if (!item) return null
    
    return (
      <OptimizedDraggableItem
        item={item}
        isDragging={true}
        isAssigned={false}
      />
    )
  }, [activeId, items])

  // Get optimized container styles
  const getContainerStyles = useCallback(() => {
    const baseStyles = {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
      padding: '16px'
    }

    if (isVirtualized) {
      return {
        ...baseStyles,
        // Optimize for virtualized rendering
        contain: 'layout style paint',
        willChange: 'transform',
        // Disable expensive properties during virtualization
        boxShadow: 'none',
        filter: 'none'
      }
    }

    return baseStyles
  }, [isVirtualized])

  return (
    <HighPerformanceDnDProvider
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      activeId={activeId}
      activeItem={activeItem}
    >
      <div style={getContainerStyles()}>
        {/* Unassigned Items Section */}
        <motion.div
          className="space-y-4"
          initial={motionVariants.initial}
          animate={motionVariants.animate}
          layout={motionVariants.layout}
        >
          <h3 className="text-lg font-semibold text-text-primary">
            Items to Assign
          </h3>
          <div className="flex flex-wrap gap-3">
            {unassignedItems.map((item) => (
              <OptimizedDraggableItem
                key={item.id}
                item={item}
                isAssigned={false}
              />
            ))}
          </div>
        </motion.div>

        {/* People Section */}
        <motion.div
          className="space-y-4"
          initial={motionVariants.initial}
          animate={motionVariants.animate}
          layout={motionVariants.layout}
        >
          <h3 className="text-lg font-semibold text-text-primary">
            Assign to People
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {people.map((person) => {
              const personItems = assignedItemsByPerson.get(person.id) || []
              
              return (
                <OptimizedDroppablePerson
                  key={person.id}
                  person={person}
                  assignedItems={personItems}
                  isOver={overId === person.id}
                />
              )
            })}
          </div>
        </motion.div>
      </div>
    </HighPerformanceDnDProvider>
  )
}
