/**
 * iOS-Inspired Item Pill Component
 * Clean, minimal item selection pill
 */

import React from 'react'
import { designTokens } from '../../lib/styled'

export interface ItemPillProps {
  name: string
  price: number
  selected?: boolean
  assigned?: boolean
  isMine?: boolean
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export const ItemPill: React.FC<ItemPillProps> = ({
  name,
  price,
  selected = false,
  assigned = false,
  isMine = false,
  onClick,
  disabled = false,
  className = ''
}) => {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Billy pill styling logic - using design tokens
  const getPillStyles = () => {
    if (isMine) {
      // Brownish filled style for "mine" items - using design tokens
      return {
        backgroundColor: designTokens.semantic.pill.mine.background,
        border: `1px solid ${designTokens.semantic.pill.mine.border}`,
        color: designTokens.semantic.text.primary,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }
    } else if (assigned) {
      // Assigned items - using design tokens
      return {
        backgroundColor: designTokens.semantic.pill.assigned.background,
        border: `1px solid ${designTokens.semantic.pill.assigned.border}`,
        color: designTokens.semantic.text.primary,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }
    } else {
      // Unassigned items - using design tokens
      return {
        backgroundColor: designTokens.semantic.pill.unassigned.background,
        border: `1px solid ${designTokens.semantic.pill.unassigned.border}`,
        color: designTokens.semantic.text.primary,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }
    }
  }

  const pillStyles = getPillStyles()

  return (
    <button
      className="pill-touch-target focus-ring hover-lift"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: designTokens.spacing[2],
        padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
        borderRadius: designTokens.borderRadius['2xl'],
        border: selected 
          ? `2px solid ${designTokens.semantic.interactive.primary}`
          : pillStyles.border,
        backgroundColor: selected 
          ? `${designTokens.semantic.interactive.primary}${designTokens.alpha[10]}`
          : pillStyles.backgroundColor,
        color: selected ? designTokens.semantic.text.primary : pillStyles.color,
        boxShadow: selected 
          ? `0 0 0 2px rgba(10,132,255,0.25), ${pillStyles.boxShadow || 'none'}`
          : pillStyles.boxShadow,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: designTokens.transitions.fast,
        opacity: disabled ? 0.6 : 1,
        ...(className && { className }),
      }}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled && !selected) {
          e.currentTarget.style.borderColor = designTokens.semantic.interactive.primary
          e.currentTarget.style.boxShadow = `0 0 0 2px rgba(10,132,255,0.25)`
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !selected) {
          e.currentTarget.style.borderColor = pillStyles.border
          e.currentTarget.style.boxShadow = designTokens.shadows.sm
        }
      }}
    >
      <span style={{
        fontSize: designTokens.typography.fontSize.sm,
        fontWeight: designTokens.typography.fontWeight.medium,
        color: selected ? designTokens.semantic.text.primary : pillStyles.color,
        whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
      
      <span style={{
        fontSize: designTokens.typography.fontSize.xs,
        fontWeight: designTokens.typography.fontWeight.semibold,
        color: selected ? designTokens.semantic.text.secondary : pillStyles.color,
        backgroundColor: selected 
          ? `${designTokens.semantic.text.primary}${designTokens.alpha[10]}`
          : 'rgba(255,255,255,0.1)',
        padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
        borderRadius: designTokens.borderRadius.sm,
      }}>
        {formatPrice(price)}
      </span>
    </button>
  )
}
