import { memo, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useMotionPreferences, getMotionVariants } from '@/lib/motionPreferences'
import { OptimizedDraggableItem } from './OptimizedDraggableItem'
import { OptimizedDroppablePerson } from './OptimizedDroppablePerson'
import { deviceDetector } from '@/lib/deviceCapabilities'

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
  
  // Device capability detection for performance optimization
  const device = deviceDetector.detect()
  
  // Device-aware motion variants
  const deviceAwareMotionVariants = useMemo(() => {
    const baseVariants = motionVariants
    
    if (device.processingPower === 'low' || prefersReducedMotion) {
      return {
        ...baseVariants,
        // Simplified animations for low-end devices
        transition: {
          duration: 0.2,
          ease: 'easeOut'
        }
      }
    }
    
    if (device.processingPower === 'medium') {
      return {
        ...baseVariants,
        transition: {
          duration: 0.3,
          ease: 'easeInOut'
        }
      }
    }
    
    // High-end devices get full animations
    return baseVariants
  }, [motionVariants, device.processingPower, prefersReducedMotion])

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

  // Get device-aware optimized container styles
  const getContainerStyles = useCallback(() => {
    const baseStyles = {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: device.isMobile ? '16px' : '24px',
      padding: device.isMobile ? '12px' : '16px'
    }

    // Device-aware virtualization decision
    const shouldUseVirtualization = isVirtualized && device.processingPower !== 'low'

    if (shouldUseVirtualization) {
      if (device.processingPower === 'high') {
        return {
          ...baseStyles,
          // High-end device optimizations
          contain: 'layout style paint',
          willChange: 'transform',
          transform: 'translateZ(0)', // Force GPU acceleration
          // Disable expensive properties during virtualization
          boxShadow: 'none',
          filter: 'none'
        }
      } else {
        // Medium-end device optimizations
        return {
          ...baseStyles,
          contain: 'layout style',
          willChange: 'transform',
          // Disable expensive properties during virtualization
          boxShadow: 'none',
          filter: 'none'
        }
      }
    }

    // Low-end devices or non-virtualized
    return {
      ...baseStyles,
      willChange: 'auto',
      contain: 'layout'
    }
  }, [isVirtualized, device])

  return (
    <div 
      className={`virtualized-dnd-container ${className}`}
      style={getContainerStyles()}
    >
      {/* Unassigned Items Section */}
      <motion.div
        className="space-y-4"
        initial={deviceAwareMotionVariants.initial}
        animate={deviceAwareMotionVariants.animate}
        layout={deviceAwareMotionVariants.layout}
        transition={deviceAwareMotionVariants.transition}
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
        initial={deviceAwareMotionVariants.initial}
        animate={deviceAwareMotionVariants.animate}
        layout={deviceAwareMotionVariants.layout}
        transition={deviceAwareMotionVariants.transition}
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
