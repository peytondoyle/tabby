import { memo, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useMotionPreferences, getMotionVariants } from '@/lib/motionPreferences'
import { OptimizedDraggableItem } from './OptimizedDraggableItem'
import { OptimizedDroppablePerson } from './OptimizedDroppablePerson'

interface VirtualizedDnDContainerProps {
  items: Array<{
    id: string
    emoji?: string
    label: string
    price: number
    quantity?: number
  }>
  people: Array<{
    id: string
    name: string
    avatar?: string
    color?: string
  }>
  assignedItems: Record<string, string[]> // personId -> itemIds[]
  onItemClick?: (itemId: string) => void
  className?: string
  isVirtualized?: boolean
}

export const VirtualizedDnDContainer = memo<VirtualizedDnDContainerProps>(({
  items,
  people,
  assignedItems,
  onItemClick,
  className = '',
  isVirtualized = false
}) => {
  const prefersReducedMotion = useMotionPreferences()
  const motionVariants = getMotionVariants(prefersReducedMotion)

  // Memoize assigned items lookup for performance
  const assignedItemsByPerson = useMemo(() => {
    const lookup = new Map<string, Array<{ id: string; label: string; price: number }>>()
    
    for (const [personId, itemIds] of Object.entries(assignedItems)) {
      const personItems = itemIds
        .map(itemId => items.find(item => item.id === itemId))
        .filter(Boolean) as Array<{ id: string; label: string; price: number }>
      
      lookup.set(personId, personItems)
    }
    
    return lookup
  }, [assignedItems, items])

  // Memoize unassigned items for performance
  const unassignedItems = useMemo(() => {
    const assignedItemIds = new Set(Object.values(assignedItems).flat())
    return items.filter(item => !assignedItemIds.has(item.id))
  }, [items, assignedItems])


  // Handle item click
  const handleItemClick = useCallback((itemId: string) => {
    onItemClick?.(itemId)
  }, [onItemClick])

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
    <div 
      className={`virtualized-dnd-container ${className}`}
      style={getContainerStyles()}
    >
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
              onClick={handleItemClick}
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
                onDrop={(personId) => {
                  // Handle drop logic here
                  console.log('Dropped on person:', personId)
                }}
              />
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  return (
    prevProps.items.length === nextProps.items.length &&
    prevProps.people.length === nextProps.people.length &&
    prevProps.isVirtualized === nextProps.isVirtualized &&
    // Deep compare assigned items
    JSON.stringify(prevProps.assignedItems) === JSON.stringify(nextProps.assignedItems)
  )
})

VirtualizedDnDContainer.displayName = 'VirtualizedDnDContainer'
