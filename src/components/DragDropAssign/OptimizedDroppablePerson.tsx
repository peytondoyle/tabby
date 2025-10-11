import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import { useMotionPreferences, getMotionVariants } from '@/lib/motionPreferences'

interface OptimizedDroppablePersonProps {
  person: {
    id: string
    name: string
    avatar?: string
    color?: string
  }
  assignedItems: Array<{
    id: string
    label: string
    price: number
  }>
  isOver?: boolean
  className?: string
  onDrop?: (personId: string) => void
}

export const OptimizedDroppablePerson = memo<OptimizedDroppablePersonProps>(({
  person,
  assignedItems,
  isOver = false,
  className = '',
  onDrop
}) => {
  const prefersReducedMotion = useMotionPreferences()
  const motionVariants = getMotionVariants(prefersReducedMotion)

  const { setNodeRef } = useDroppable({
    id: person.id,
    data: { person }
  })

  const handleDrop = useCallback(() => {
    onDrop?.(person.id)
  }, [person.id, onDrop])

  // Calculate total amount for assigned items
  const totalAmount = assignedItems.reduce((sum, item) => sum + item.price, 0)

  // Get optimized styles based on hover state
  const getPersonStyles = useCallback(() => {
    const baseStyles = {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      borderRadius: '16px',
      transition: 'all 0.2s ease-out',
      cursor: 'pointer'
    }

    if (isOver) {
      return {
        ...baseStyles,
        // Enhanced feedback for drop target
        ...(prefersReducedMotion ? {
          opacity: 0.9,
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: 'var(--ui-primary)'
        } : {
          opacity: 0.95,
          transform: 'scale(1.02)',
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: 'var(--ui-primary)',
          boxShadow: '0 0 20px rgba(var(--ui-primary-rgb), 0.3)'
        })
      }
    }

    return {
      ...baseStyles,
      backgroundColor: 'var(--ui-surface-elevated)',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: 'transparent'
    }
  }, [isOver, prefersReducedMotion])

  return (
    <motion.div
      ref={setNodeRef}
      style={getPersonStyles()}
      className={`
        flex flex-col items-center gap-3 p-4 rounded-2xl transition-all
        ${isOver ? 'bg-primary/10 scale-105 border-2 border-primary' : 'bg-surface-elevated'}
        ${className}
      `}
      // Use motion variants based on preferences
      initial={motionVariants.initial}
      animate={motionVariants.animate}
      whileHover={prefersReducedMotion ? {} : motionVariants.hover}
      whileTap={prefersReducedMotion ? {} : motionVariants.tap}
      layout={motionVariants.layout}
      // Optimize for performance
      transition={{
        duration: prefersReducedMotion ? 0 : 0.2,
        ease: 'easeOut'
      }}
      onClick={handleDrop}
    >
      {/* Avatar */}
      <motion.div
        className={`
          w-20 h-20 ${person.color || 'bg-primary'} rounded-full flex items-center justify-center 
          text-white font-bold text-2xl shadow-xl relative
          ${isOver ? 'ring-4 ring-primary ring-offset-2 ring-offset-background' : ''}
        `}
        animate={prefersReducedMotion ? {} : { scale: isOver ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {person.avatar ? (
          <img 
            src={person.avatar} 
            alt={person.name} 
            className="w-full h-full rounded-full object-cover" 
          />
        ) : (
          person.name.charAt(0).toUpperCase()
        )}
        
        {/* Item count badge */}
        {assignedItems.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-success text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-lg"
          >
            {assignedItems.length}
          </motion.div>
        )}
      </motion.div>

      {/* Name */}
      <span className="font-semibold text-text-primary text-center">
        {person.name}
      </span>

      {/* Total Amount */}
      {totalAmount > 0 && (
        <motion.div
          className="text-sm text-success font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          ${totalAmount.toFixed(2)}
        </motion.div>
      )}

      {/* Drop indicator */}
      {isOver && (
        <motion.div
          className="text-xs text-primary font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          Drop here to assign
        </motion.div>
      )}
    </motion.div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  return (
    prevProps.person.id === nextProps.person.id &&
    prevProps.assignedItems.length === nextProps.assignedItems.length &&
    prevProps.isOver === nextProps.isOver &&
    prevProps.assignedItems.every((item, index) => 
      nextProps.assignedItems[index]?.id === item.id &&
      nextProps.assignedItems[index]?.price === item.price
    )
  )
})

OptimizedDroppablePerson.displayName = 'OptimizedDroppablePerson'
