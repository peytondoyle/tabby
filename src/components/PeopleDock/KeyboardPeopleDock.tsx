import React, { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion, getMotionVariants, getOptimizedTransform, getShadowStyles } from '@/lib/accessibility'
import { useRovingTabIndex, KEYBOARD_NAVIGATION } from '@/lib/keyboardNavigation'
import { PersonCard } from '../PersonCard'
import type { Person, PersonTotal } from '@/lib/types'

export interface KeyboardPeopleDockProps {
  people: Person[]
  personTotals: PersonTotal[]
  selectedItems: string[]
  isAssignMode: boolean
  onAssignSelectedItems: (personId: string) => void
  onPersonClick: (person: Person) => void
  onPersonTotalClick: (person: Person) => void
  className?: string
}

export const KeyboardPeopleDock: React.FC<KeyboardPeopleDockProps> = ({
  people,
  personTotals,
  selectedItems,
  isAssignMode,
  onAssignSelectedItems,
  onPersonClick,
  onPersonTotalClick,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion()
  const motionVariants = getMotionVariants(prefersReducedMotion)
  const optimizedTransform = getOptimizedTransform(prefersReducedMotion)
  const shadowStyles = getShadowStyles(prefersReducedMotion)

  const rovingTabIndex = useRovingTabIndex(people, {
    autoFocus: false,
    onKeyDown: (event, index) => {
      const person = people[index]
      if (!person) return

      switch (event.key) {
        case KEYBOARD_NAVIGATION.KEYS.ENTER:
          event.preventDefault()
          if (isAssignMode && selectedItems.length > 0) {
            onAssignSelectedItems(person.id)
          } else {
            onPersonClick(person)
          }
          break
        case KEYBOARD_NAVIGATION.KEYS.SPACE:
          event.preventDefault()
          onPersonTotalClick(person)
          break
      }
    }
  })

  const handlePersonClick = useCallback((person: Person) => {
    if (isAssignMode && selectedItems.length > 0) {
      onAssignSelectedItems(person.id)
    } else {
      onPersonClick(person)
    }
  }, [isAssignMode, selectedItems.length, onAssignSelectedItems, onPersonClick])

  const handlePersonKeyDown = useCallback((event: React.KeyboardEvent, person: Person) => {
    switch (event.key) {
      case KEYBOARD_NAVIGATION.KEYS.ENTER:
        event.preventDefault()
        handlePersonClick(person)
        break
      case KEYBOARD_NAVIGATION.KEYS.SPACE:
        event.preventDefault()
        onPersonTotalClick(person)
        break
    }
  }, [handlePersonClick, onPersonTotalClick])

  return (
    <motion.div
      variants={motionVariants}
      initial="initial"
      animate="animate"
      style={optimizedTransform}
      className={`
        flex gap-2 p-4 bg-gray-50 rounded-lg overflow-x-auto
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
      role={KEYBOARD_NAVIGATION.ROLES.LIST}
      aria-label={KEYBOARD_NAVIGATION.ARIA_LABELS.PEOPLE_DOCK}
      onKeyDown={rovingTabIndex.handleKeyDown}
      tabIndex={0}
      data-testid="people-dock"
    >
      {people.map((person, index) => {
        const personTotal = personTotals.find(pt => pt.personId === person.id)
        const isFocused = rovingTabIndex.focusedIndex === index
        const canAssign = isAssignMode && selectedItems.length > 0

        return (
          <motion.div
            key={person.id}
            ref={rovingTabIndex.getItemRef(index) as React.Ref<HTMLDivElement>}
            variants={motionVariants}
            whileHover={prefersReducedMotion ? {} : "hover"}
            whileTap={prefersReducedMotion ? {} : "tap"}
            style={{
              ...optimizedTransform,
              ...(isFocused ? shadowStyles : {}),
            }}
            className={`
              flex-shrink-0 focus:outline-none
              ${isFocused ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
              ${canAssign ? 'ring-2 ring-green-500 ring-offset-2' : ''}
            `}
            role={KEYBOARD_NAVIGATION.ROLES.LISTITEM}
            tabIndex={rovingTabIndex.getTabIndex(index)}
            aria-label={`
              ${person.name}
              ${personTotal ? `, total: $${personTotal.total.toFixed(2)}` : ''}
              ${canAssign ? ', press Enter to assign selected items' : ''}
            `}
            onKeyDown={(e) => handlePersonKeyDown(e, person)}
            onClick={() => handlePersonClick(person)}
          >
            <PersonCard
              person={{...person, is_archived: false, avatar_url: person.avatar}}
              editorToken=""
              onUpdate={() => {}}
              assignedItems={[]}
              totals={personTotal ? {
                subtotal: personTotal.subtotal,
                tax_share: personTotal.tax_share,
                tip_share: personTotal.tip_share,
                total: personTotal.total
              } : undefined}
              data-testid="person-card"
            />
            
            {/* Assign mode indicator */}
            {canAssign && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
                style={shadowStyles}
              >
                {selectedItems.length}
              </motion.div>
            )}
          </motion.div>
        )
      })}
      
      {/* Assign mode instructions */}
      {isAssignMode && selectedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="flex-shrink-0 flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium"
        >
          Select a person to assign {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
        </motion.div>
      )}
    </motion.div>
  )
}

/**
 * Hook for managing keyboard navigation in the people dock
 */
export function usePeopleDockKeyboardNavigation(
  people: Person[],
  options: {
    onPersonClick?: (person: Person) => void
    onPersonTotalClick?: (person: Person) => void
    onAssignSelectedItems?: (personId: string) => void
  } = {}
) {
  return useRovingTabIndex(people, {
    autoFocus: false,
    onKeyDown: (event, index) => {
      const person = people[index]
      if (!person) return

      switch (event.key) {
        case KEYBOARD_NAVIGATION.KEYS.ENTER:
          event.preventDefault()
          options.onPersonClick?.(person)
          break
        case KEYBOARD_NAVIGATION.KEYS.SPACE:
          event.preventDefault()
          options.onPersonTotalClick?.(person)
          break
      }
    }
  })
}
