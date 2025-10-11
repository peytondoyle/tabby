/**
 * iOS-Inspired Tooltip Component
 * Clean, minimal tooltip for additional information
 */

import React, { useState, useRef, useEffect } from 'react'
import { designTokens } from '../../lib/styled'

export interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

    let top = 0
    let left = 0

    switch (position) {
      case 'top':
        top = triggerRect.top + scrollTop - tooltipRect.height - 8
        left = triggerRect.left + scrollLeft + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'bottom':
        top = triggerRect.bottom + scrollTop + 8
        left = triggerRect.left + scrollLeft + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'left':
        top = triggerRect.top + scrollTop + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.left + scrollLeft - tooltipRect.width - 8
        break
      case 'right':
        top = triggerRect.top + scrollTop + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.right + scrollLeft + 8
        break
    }

    setTooltipPosition({ top, left })
  }

  useEffect(() => {
    if (isVisible) {
      updatePosition()
      window.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isVisible, position])

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            zIndex: designTokens.zIndex.tooltip,
            padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
            backgroundColor: designTokens.semantic.text.primary,
            color: designTokens.semantic.text.inverse,
            fontSize: designTokens.typography.fontSize.xs,
            fontWeight: designTokens.typography.fontWeight.medium,
            borderRadius: designTokens.borderRadius.sm,
            boxShadow: designTokens.shadows.lg,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            ...(className && { className }),
          }}
        >
          {content}
        </div>
      )}
    </>
  )
}

export const TextWithTooltip: React.FC<{
  text: string
  tooltip: string
  maxLength?: number
  className?: string
}> = ({ text, tooltip, maxLength = 20, className = '' }) => {
  const truncatedText = text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
  const needsTooltip = text.length > maxLength

  if (needsTooltip) {
    return (
      <Tooltip content={tooltip} className={className}>
        <span style={{
          cursor: 'help',
          borderBottom: `1px solid ${designTokens.semantic.text.secondary}`,
        }}>
          {truncatedText}
        </span>
      </Tooltip>
    )
  }

  return <span className={className}>{text}</span>
}
