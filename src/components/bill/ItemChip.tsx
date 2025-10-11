/**
 * iOS-Inspired Item Chip Component
 * Clean, minimal item selection chip
 */

import React from 'react'
import { motion } from 'framer-motion'
import { formatMoney, truncateText, normalizeEmoji, getEmojiClass, getInitials, getPersonColor } from '@/lib/format'
import { designTokens } from '../../lib/styled'
import type { PersonData } from './PeoplePills'

export interface ItemData {
  id: string
  name: string
  price: number
  icon?: string
  quantity?: number
}

interface ItemChipProps {
  item: ItemData
  selected?: boolean
  onClick?: (item: ItemData) => void
  disabled?: boolean
  showQuantity?: boolean
  assignedPeople?: PersonData[]
  className?: string
}

export const ItemChip: React.FC<ItemChipProps> = ({
  item,
  selected = false,
  onClick,
  disabled = false,
  showQuantity = false,
  assignedPeople = [],
  className = ''
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(item)
    }
  }

  const itemIcon = item.icon ? normalizeEmoji(item.icon) : '📦'
  const displayName = truncateText(item.name, 20)
  const displayPrice = formatMoney(item.price)

  return (
    <motion.button
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: designTokens.spacing[2],
        padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
        borderRadius: designTokens.borderRadius.lg,
        border: selected 
          ? `2px solid ${designTokens.semantic.interactive.primary}`
          : `1px solid ${designTokens.semantic.border.default}`,
        backgroundColor: selected 
          ? `${designTokens.semantic.interactive.primary}${designTokens.alpha[10]}`
          : designTokens.semantic.background.elevated,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: designTokens.transitions.fast,
        opacity: disabled ? 0.6 : 1,
        ...(className && { className }),
      }}
      onClick={handleClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
    >
      {/* Item Icon */}
      <div style={{
        fontSize: '16px',
        lineHeight: 1,
        minWidth: '20px',
        textAlign: 'center',
      }}>
        {itemIcon}
      </div>

      {/* Item Info */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '2px',
        minWidth: 0,
        flex: 1,
      }}>
        <span style={{
          fontSize: designTokens.typography.fontSize.sm,
          fontWeight: designTokens.typography.fontWeight.medium,
          color: designTokens.semantic.text.primary,
          lineHeight: 1.2,
          textAlign: 'left',
        }}>
          {displayName}
        </span>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: designTokens.spacing[1],
        }}>
          <span style={{
            fontSize: designTokens.typography.fontSize.xs,
            fontWeight: designTokens.typography.fontWeight.semibold,
            color: designTokens.semantic.text.secondary,
          }}>
            {displayPrice}
          </span>
          
          {showQuantity && item.quantity && item.quantity > 1 && (
            <span style={{
              fontSize: designTokens.typography.fontSize.xs,
              color: designTokens.semantic.text.tertiary,
            }}>
              ×{item.quantity}
            </span>
          )}
        </div>
      </div>

      {/* Assigned People Indicators */}
      {assignedPeople.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
        }}>
          {assignedPeople.slice(0, 3).map((person, index) => (
            <div
              key={person.id}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: designTokens.borderRadius.full,
                backgroundColor: getPersonColor(person.id),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.inverse,
                border: `1px solid ${designTokens.semantic.background.elevated}`,
                marginLeft: index > 0 ? '-4px' : 0,
                zIndex: assignedPeople.length - index,
              }}
            >
              {getInitials(person.name)}
            </div>
          ))}
          
          {assignedPeople.length > 3 && (
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: designTokens.borderRadius.full,
              backgroundColor: designTokens.semantic.text.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              fontWeight: designTokens.typography.fontWeight.semibold,
              color: designTokens.semantic.text.inverse,
              border: `1px solid ${designTokens.semantic.background.elevated}`,
              marginLeft: '-4px',
            }}>
              +{assignedPeople.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Selection Indicator */}
      {selected && (
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: designTokens.borderRadius.full,
          backgroundColor: designTokens.semantic.interactive.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg 
            width="10" 
            height="10" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5"
            style={{ color: designTokens.semantic.text.inverse }}
          >
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>
      )}
    </motion.button>
  )
}