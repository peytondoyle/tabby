/**
 * iOS-Inspired Items Grid Component
 * Clean, minimal grid layout for items
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ItemChip, type ItemData } from './ItemChip'
import type { PersonData } from './PeoplePills'
import { Package } from 'lucide-react'
import { designTokens } from '../../lib/styled'

interface ItemsGridProps {
  items: ItemData[]
  selectedItems?: Set<string>
  onItemClick?: (item: ItemData) => void
  assignments?: Record<string, string[]> // itemId -> personIds
  people?: PersonData[]
  columns?: {
    mobile?: 1 | 2
    tablet?: 2 | 3 | 4
    desktop?: 3 | 4 | 5
  }
  showAssignments?: boolean
  emptyMessage?: string
  className?: string
}

export const ItemsGrid: React.FC<ItemsGridProps> = ({
  items,
  selectedItems = new Set(),
  onItemClick,
  assignments = {},
  people = [],
  columns = {
    mobile: 2,
    tablet: 3,
    desktop: 4
  },
  showAssignments = false,
  emptyMessage = 'No items found',
  className = ''
}) => {
  const getAssignedPeople = (itemId: string): PersonData[] => {
    if (!showAssignments) return []
    
    const assignedPersonIds = assignments[itemId] || []
    return people.filter(person => assignedPersonIds.includes(person.id))
  }

  if (items.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: designTokens.spacing[12],
        textAlign: 'center',
        ...(className && { className }),
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: designTokens.borderRadius.full,
          backgroundColor: `${designTokens.semantic.text.primary}${designTokens.alpha[10]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: designTokens.spacing[4],
        }}>
          <Package size={24} color={designTokens.semantic.text.secondary} />
        </div>
        
        <h3 style={{
          fontSize: designTokens.typography.fontSize.lg,
          fontWeight: designTokens.typography.fontWeight.semibold,
          color: designTokens.semantic.text.primary,
          margin: 0,
          marginBottom: designTokens.spacing[2],
        }}>
          {emptyMessage}
        </h3>
        
        <p style={{
          fontSize: designTokens.typography.fontSize.sm,
          color: designTokens.semantic.text.secondary,
          margin: 0,
        }}>
          Items will appear here once your receipt is processed
        </p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gap: designTokens.spacing[3],
      gridTemplateColumns: `repeat(${columns.mobile}, 1fr)`,
      ...(className && { className }),
    }}>
      <AnimatePresence>
        {items.map((item, index) => {
          const isSelected = selectedItems.has(item.id)
          const assignedPeople = getAssignedPeople(item.id)

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.2,
                delay: index * 0.05,
                ease: 'easeOut'
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <ItemChip
                item={item}
                selected={isSelected}
                onClick={onItemClick}
                assignedPeople={assignedPeople}
                showQuantity={true}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}