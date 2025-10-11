/**
 * iOS-Inspired People Pills Component
 * Clean, minimal person selection pills
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Plus, User } from 'lucide-react'
import { getInitials, getPersonColor } from '@/lib/format'
import { designTokens } from '../../lib/styled'

export interface PersonData {
  id: string
  name: string
  color?: string
  avatarUrl?: string
  isYou?: boolean
  total?: number
}

interface PeoplePillsProps {
  people: PersonData[]
  selectedPersonId?: string
  totals?: Record<string, number>
  onSelect?: (personId: string) => void
  onAdd?: () => void
  className?: string
  showTotals?: boolean
}

export const PeoplePills: React.FC<PeoplePillsProps> = ({
  people,
  selectedPersonId,
  totals,
  onSelect,
  onAdd,
  className = '',
  showTotals = false
}) => {
  const handlePersonClick = (personId: string) => {
    if (onSelect) {
      onSelect(personId)
    }
  }

  const handleAddClick = () => {
    if (onAdd) {
      onAdd()
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: designTokens.spacing[2],
      ...(className && { className }),
    }}>
      {people.map((person) => {
        const isSelected = selectedPersonId === person.id
        const personTotal = totals?.[person.id] || 0
        const personColor = person.color || getPersonColor(person.id)

        return (
          <motion.button
            key={person.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing[2],
              padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
              borderRadius: designTokens.borderRadius.full,
              border: isSelected 
                ? `2px solid ${designTokens.semantic.interactive.primary}`
                : `1px solid ${designTokens.semantic.border.default}`,
              backgroundColor: isSelected 
                ? `${designTokens.semantic.interactive.primary}${designTokens.alpha[10]}`
                : designTokens.semantic.background.elevated,
              cursor: 'pointer',
              transition: designTokens.transitions.fast,
            }}
            onClick={() => handlePersonClick(person.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {/* Avatar */}
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: designTokens.borderRadius.full,
              backgroundColor: personColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: designTokens.typography.fontSize.xs,
              fontWeight: designTokens.typography.fontWeight.semibold,
              color: designTokens.semantic.text.inverse,
            }}>
              {person.avatarUrl ? (
                <img
                  src={person.avatarUrl}
                  alt={person.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: designTokens.borderRadius.full,
                    objectFit: 'cover',
                  }}
                />
              ) : (
                getInitials(person.name)
              )}
            </div>

            {/* Name */}
            <span style={{
              fontSize: designTokens.typography.fontSize.sm,
              fontWeight: designTokens.typography.fontWeight.medium,
              color: designTokens.semantic.text.primary,
              whiteSpace: 'nowrap',
            }}>
              {person.name}
              {person.isYou && (
                <span style={{
                  fontSize: designTokens.typography.fontSize.xs,
                  color: designTokens.semantic.text.secondary,
                  marginLeft: designTokens.spacing[1],
                }}>
                  (you)
                </span>
              )}
            </span>

            {/* Total */}
            {showTotals && personTotal > 0 && (
              <span style={{
                fontSize: designTokens.typography.fontSize.xs,
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.secondary,
                backgroundColor: `${designTokens.semantic.text.primary}${designTokens.alpha[10]}`,
                padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
                borderRadius: designTokens.borderRadius.sm,
              }}>
                ${personTotal.toFixed(2)}
              </span>
            )}
          </motion.button>
        )
      })}

      {/* Add Person Button */}
      {onAdd && (
        <motion.button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: designTokens.spacing[2],
            padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
            borderRadius: designTokens.borderRadius.full,
            border: `1px dashed ${designTokens.semantic.border.default}`,
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: designTokens.transitions.fast,
          }}
          onClick={handleAddClick}
          whileHover={{ 
            scale: 1.02,
            borderColor: designTokens.semantic.interactive.primary,
            backgroundColor: `${designTokens.semantic.interactive.primary}${designTokens.alpha[5]}`,
          }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
        >
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: designTokens.borderRadius.full,
            backgroundColor: `${designTokens.semantic.text.primary}${designTokens.alpha[10]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Plus size={14} color={designTokens.semantic.text.secondary} />
          </div>

          <span style={{
            fontSize: designTokens.typography.fontSize.sm,
            fontWeight: designTokens.typography.fontWeight.medium,
            color: designTokens.semantic.text.secondary,
            whiteSpace: 'nowrap',
          }}>
            Add Person
          </span>
        </motion.button>
      )}
    </div>
  )
}