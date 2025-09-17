import React, { useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion, getMotionVariants, getOptimizedTransform, getShadowStyles } from '@/lib/accessibility'
import { useRovingTabIndex, useKeyboardSelection, KEYBOARD_NAVIGATION } from '@/lib/keyboardNavigation'
import { ItemRow } from './index'
import type { Item, Person } from '@/lib/types'

export interface KeyboardItemRowProps {
  item: Item
  index: number
  people: Person[]
  isSelected: boolean
  isAssignMode: boolean
  assignTarget: string | null
  onToggleSelection: (item: Item, index: number) => void
  onEnterAssignMode: (itemId: string) => void
  onAssignItem: (itemId: string, personId: string) => void
  onUnassignItem: (itemId: string, personId: string) => void
  getItemAssignments: (itemId: string) => string[]
  className?: string
}

export const KeyboardItemRow: React.FC<KeyboardItemRowProps> = ({
  item,
  index,
  people: _people,
  isSelected,
  isAssignMode,
  assignTarget,
  onToggleSelection,
  onEnterAssignMode,
  onAssignItem: _onAssignItem,
  onUnassignItem: _onUnassignItem,
  getItemAssignments,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion()
  const motionVariants = getMotionVariants(prefersReducedMotion)
  const optimizedTransform = getOptimizedTransform(prefersReducedMotion)
  const shadowStyles = getShadowStyles(prefersReducedMotion)
  
  const itemRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case KEYBOARD_NAVIGATION.KEYS.ENTER:
        event.preventDefault()
        onToggleSelection(item, index)
        break
      case KEYBOARD_NAVIGATION.KEYS.SPACE:
        event.preventDefault()
        onEnterAssignMode(item.id)
        break
      case KEYBOARD_NAVIGATION.KEYS.ESCAPE:
        if (isAssignMode) {
          event.preventDefault()
          // Exit assign mode - this should be handled by parent
        }
        break
    }
  }, [item, index, onToggleSelection, onEnterAssignMode, isAssignMode])

  const handleClick = useCallback(() => {
    onToggleSelection(item, index)
  }, [item, index, onToggleSelection])

  const handleDoubleClick = useCallback(() => {
    onEnterAssignMode(item.id)
  }, [item.id, onEnterAssignMode])

  const assignedPeople = getItemAssignments(item.id)
  const isItemInAssignMode = isAssignMode && assignTarget === item.id

  return (
    <motion.div
      ref={itemRef}
      variants={motionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={prefersReducedMotion ? {} : "hover"}
      whileTap={prefersReducedMotion ? {} : "tap"}
      whileDrag={prefersReducedMotion ? {} : "drag"}
      style={{
        ...optimizedTransform,
        ...shadowStyles,
      }}
      className={`
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${isItemInAssignMode ? 'ring-2 ring-green-500 ring-offset-2' : ''}
        ${className}
      `}
      role={KEYBOARD_NAVIGATION.ROLES.GRIDCELL}
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`${item.label}, $${item.price.toFixed(2)}${assignedPeople.length > 0 ? `, assigned to ${assignedPeople.length} people` : ''}`}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-testid="item-row"
    >
      <ItemRow
        item={{...item, quantity: 1, unit_price: item.price, emoji: item.emoji || '📦'}}
        editorToken=""
        onUpdate={() => {}}
        className="pointer-events-none" // Disable pointer events on child to prevent conflicts
      />
      
      {/* Assign mode overlay */}
      {isItemInAssignMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-green-50 border-2 border-green-500 rounded-lg flex items-center justify-center"
        >
          <div className="text-green-700 font-medium text-sm">
            Press Enter on a person to assign
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

/**
 * Hook for managing keyboard navigation in an items grid
 */
export function useItemsKeyboardNavigation(
  items: Item[],
  options: {
    multiSelect?: boolean
    onSelectionChange?: (selected: Item[]) => void
    onEnterAssignMode?: (itemId: string) => void
  } = {}
) {
  const rovingTabIndex = useRovingTabIndex(items, {
    autoFocus: false,
    onKeyDown: (event, index) => {
      const item = items[index]
      if (!item) return

      switch (event.key) {
        case KEYBOARD_NAVIGATION.KEYS.ENTER:
          event.preventDefault()
          options.onSelectionChange?.([item])
          break
        case KEYBOARD_NAVIGATION.KEYS.SPACE:
          event.preventDefault()
          options.onEnterAssignMode?.(item.id)
          break
      }
    }
  })

  const selection = useKeyboardSelection(items, {
    multiSelect: options.multiSelect,
    onSelectionChange: options.onSelectionChange,
  })

  return {
    ...rovingTabIndex,
    ...selection,
  }
}
