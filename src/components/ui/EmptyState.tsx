import React from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from './GlassCard'

interface EmptyStateProps {
  icon?: React.ReactNode
  emoji?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  emoji,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <GlassCard className={className}>
      <motion.div
        className="flex flex-col items-center justify-center py-12 px-6 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Icon or Emoji */}
        {emoji && (
          <div className="text-5xl mb-4" role="img" aria-label={emoji}>
            {emoji}
          </div>
        )}
        {icon && (
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--text)/0.05)] flex items-center justify-center mb-4">
            {icon}
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg font-semibold text-[hsl(var(--text))] mb-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-[hsl(var(--muted))] max-w-md mb-6">
            {description}
          </p>
        )}

        {/* Action Button */}
        {action && (
          <motion.button
            className="
              px-4 py-2 rounded-xl
              bg-[hsl(var(--accent))] text-white font-medium
              hover:opacity-90
              transition-opacity
            "
            onClick={action.onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {action.label}
          </motion.button>
        )}
      </motion.div>
    </GlassCard>
  )
}

export default EmptyState
