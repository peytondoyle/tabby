import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StickyBarProps {
  children: React.ReactNode
  show?: boolean
  position?: 'top' | 'bottom'
  className?: string
}

export const StickyBar: React.FC<StickyBarProps> = ({
  children,
  show = true,
  position = 'bottom',
  className = ''
}) => {
  const positionClasses = position === 'bottom'
    ? 'bottom-0 border-t'
    : 'top-0 border-b'

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Enhanced gradient scrim for better visibility */}
          {position === 'bottom' && (
            <div
              className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none z-[var(--z-sticky)]"
              style={{
                background: 'linear-gradient(to top, hsl(var(--bg) / 0.95) 0%, transparent 100%)'
              }}
            />
          )}

          <motion.div
            className={cn(
              'fixed left-0 right-0',
              positionClasses,
              'bg-[hsl(var(--glass))] backdrop-blur-xl',
              'border-[hsl(var(--glass-border))]',
              'z-[var(--z-sticky)]',
              'shadow-soft',
              className
            )}
            initial={{ y: position === 'bottom' ? 100 : -100 }}
            animate={{ y: 0 }}
            exit={{ y: position === 'bottom' ? 100 : -100 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300
            }}
          >
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-end gap-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ActionBar component - specialized version of StickyBar for bottom actions
interface ActionBarProps {
  children: React.ReactNode
  helperText?: string
  show?: boolean
  className?: string
}

export const ActionBar: React.FC<ActionBarProps> = ({
  children,
  helperText,
  show = true,
  className = ''
}) => {
  return (
    <StickyBar show={show} position="bottom" className={className}>
      <div className="flex items-center justify-between gap-4">
        {helperText && (
          <span className="text-sm text-[hsl(var(--muted))] hidden sm:block">
            {helperText}
          </span>
        )}
        <div className="flex items-center gap-3 ml-auto">
          {children}
        </div>
      </div>
    </StickyBar>
  )
}