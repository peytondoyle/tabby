import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { safeTransition } from '@/lib/motionUtils'

export interface TooltipProps {
  content: string
  children: React.ReactElement
  placement?: 'top' | 'bottom' | 'left' | 'right'
  disabled?: boolean
  delay?: number
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  disabled = false,
  delay = 500
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showTooltip = () => {
    if (disabled || !content) return
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      updatePosition()
    }, delay) as NodeJS.Timeout
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let x = 0
    let y = 0

    switch (placement) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        y = triggerRect.top - tooltipRect.height - 8
        break
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        y = triggerRect.bottom + 8
        break
      case 'left':
        x = triggerRect.left - tooltipRect.width - 8
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
      case 'right':
        x = triggerRect.right + 8
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
    }

    // Clamp to viewport
    x = Math.max(8, Math.min(x, viewport.width - tooltipRect.width - 8))
    y = Math.max(8, Math.min(y, viewport.height - tooltipRect.height - 8))

    setPosition({ x, y })
  }

  useEffect(() => {
    if (isVisible) {
      updatePosition()
    }
  }, [isVisible])

  const clonedChild = React.cloneElement(children, {
    ...(children.props as any),
    onMouseEnter: (e: React.MouseEvent) => {
      (children.props as any).onMouseEnter?.(e)
      showTooltip()
    },
    onMouseLeave: (e: React.MouseEvent) => {
      (children.props as any).onMouseLeave?.(e)
      hideTooltip()
    },
    onFocus: (e: React.FocusEvent) => {
      (children.props as any).onFocus?.(e)
      showTooltip()
    },
    onBlur: (e: React.FocusEvent) => {
      (children.props as any).onBlur?.(e)
      hideTooltip()
    }
  })

  return (
    <>
      <div ref={triggerRef}>
        {clonedChild}
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            className="fixed z-50 bg-black text-white text-sm px-2 py-1 rounded-[var(--r-sm)] shadow-lg pointer-events-none"
            style={{
              left: position.x,
              top: position.y
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={safeTransition({ duration: 0.15 })}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Text component with automatic tooltip for overflow
export interface TextWithTooltipProps {
  children: string
  className?: string
  maxLength?: number
}

export const TextWithTooltip: React.FC<TextWithTooltipProps> = ({
  children,
  className = '',
  maxLength = 50
}) => {
  const shouldTruncate = children.length > maxLength
  const truncatedText = shouldTruncate ? `${children.slice(0, maxLength)}...` : children

  const textElement = (
    <span className={`truncate ${className}`}>
      {truncatedText}
    </span>
  )

  if (!shouldTruncate) {
    return textElement
  }

  return (
    <Tooltip content={children}>
      {textElement}
    </Tooltip>
  )
}

Tooltip.displayName = 'Tooltip'
TextWithTooltip.displayName = 'TextWithTooltip'