import React, { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useDraggable } from '@dnd-kit/core'
import { useMotionPreferences, getMotionVariants, getOptimizedTransform } from '@/lib/motionPreferences'

interface OptimizedDraggableItemProps {
  item: {
    id: string
    emoji?: string
    label: string
    price: number
    quantity?: number
  }
  isDragging?: boolean
  isAssigned?: boolean
  className?: string
  onClick?: (itemId: string) => void
}

export const OptimizedDraggableItem = memo<OptimizedDraggableItemProps>(({
  item,
  isDragging = false,
  isAssigned = false,
  className = '',
  onClick
}) => {
  const prefersReducedMotion = useMotionPreferences()
  const motionVariants = getMotionVariants(prefersReducedMotion)

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: { item }
  })

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(item.id)
  }, [item.id, onClick])

  // Get optimized transform styles
  const transformStyle = getOptimizedTransform(transform, prefersReducedMotion)

  // Get optimized styles based on drag state
  const getItemStyles = useCallback(() => {
    const baseStyles = {
      ...transformStyle,
      cursor: isDragging ? 'grabbing' : 'grab',
      userSelect: 'none' as const,
      // Disable text selection during drag
      WebkitUserSelect: 'none' as const,
      MozUserSelect: 'none' as const,
      msUserSelect: 'none' as const
    }

    if (isDragging) {
      return {
        ...baseStyles,
        // Reduce opacity during drag for performance
        opacity: prefersReducedMotion ? 0.8 : 0.6,
        // Disable shadows during drag
        boxShadow: 'none',
        // Use transform3d for hardware acceleration
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden' as const,
        perspective: '1000px'
      }
    }

    return baseStyles
  }, [transformStyle, isDragging, prefersReducedMotion])

  return (
    <motion.div
      ref={setNodeRef}
      style={getItemStyles()}
      {...attributes}
      {...listeners}
      className={`
        inline-flex items-center gap-2 px-4 py-3 rounded-full
        ${isAssigned 
          ? 'bg-surface-elevated border-2 border-border' 
          : 'bg-gradient-to-r from-accent/20 to-primary/20 border-2 border-accent/50'
        }
        ${isDragging ? 'opacity-50 z-50' : ''}
        hover:scale-105 transition-all
        ${className}
      `}
      // Use motion variants based on preferences
      initial={motionVariants.initial}
      animate={motionVariants.animate}
      exit={motionVariants.exit}
      whileHover={prefersReducedMotion ? {} : motionVariants.hover}
      whileTap={prefersReducedMotion ? {} : motionVariants.tap}
      layout={motionVariants.layout}
      // Disable layout animations during drag for performance
      layoutId={isDragging ? undefined : item.id}
      // Optimize for performance
      transition={{
        duration: prefersReducedMotion ? 0 : 0.2,
        ease: 'easeOut'
      }}
      onClick={handleClick}
    >
      <span className="text-2xl">{item.emoji || '🍽️'}</span>
      <span className="font-bold text-text-primary">{item.label}</span>
      {item.quantity && item.quantity > 1 && (
        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
          ×{item.quantity}
        </span>
      )}
      <span className="text-sm text-success font-mono">
        ${item.price.toFixed(2)}
      </span>
    </motion.div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isAssigned === nextProps.isAssigned
  )
})

OptimizedDraggableItem.displayName = 'OptimizedDraggableItem'
