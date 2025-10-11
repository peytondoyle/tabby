/**
 * @deprecated Use ProgressStepsV2 instead. This component will be removed in a future version.
 * ProgressStepsV2 provides better accessibility, improved animations, and enhanced keyboard navigation.
 */
import React from 'react'
import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressStepsProps {
  current: number
  labels?: string[]
  onStepClick?: (step: number) => void
  className?: string
}

const defaultLabels = ['Upload', 'Scanning', 'Assign', 'Review']

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  current,
  labels = defaultLabels,
  onStepClick,
  className = ''
}) => {
  return (
    <div className={cn('w-full', className)} role="list">
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-[hsl(var(--text)/0.1)]" />

        {/* Progress line */}
        <motion.div
          className="absolute top-3 left-0 h-0.5 bg-[hsl(var(--accent))]"
          initial={{ width: '0%' }}
          animate={{
            width: `${(current / (labels.length - 1)) * 100}%`
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {labels.map((label, index) => {
            const isActive = index === current
            const isPast = index < current
            const isFuture = index > current

            return (
              <button
                key={index}
                className="flex flex-col items-center group"
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${label}${isActive ? ' (current)' : ''}${isPast ? ' (completed)' : ''}`}
                onClick={() => onStepClick?.(index)}
                disabled={!onStepClick || isFuture}
                type="button"
              >
                {/* Step dot/check */}
                <motion.div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center',
                    'transition-all duration-[var(--transition-base)] relative z-10',
                    isActive && 'bg-[hsl(var(--accent))] shadow-md shadow-[hsl(var(--accent)/0.25)]',
                    isPast && 'bg-[hsl(var(--accent))]',
                    isFuture && 'bg-white border-2 border-[hsl(var(--text)/0.2)]',
                    onStepClick && !isFuture && 'group-hover:scale-110 cursor-pointer'
                  )}
                  initial={false}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {isPast ? (
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  ) : isActive ? (
                    <motion.div
                      className="w-2 h-2 bg-white rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    />
                  ) : (
                    <div className="w-2 h-2 bg-[hsl(var(--text)/0.3)] rounded-full" />
                  )}
                </motion.div>

                {/* Label */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium whitespace-nowrap transition-colors',
                    isActive && 'text-[hsl(var(--accent))]',
                    isPast && 'text-[hsl(var(--text))]',
                    isFuture && 'text-[hsl(var(--muted))]'
                  )}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}