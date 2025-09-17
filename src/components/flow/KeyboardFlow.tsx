import React, { useCallback, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion, getMotionVariants, AriaLiveRegion, useAriaLiveRegion } from '@/lib/accessibility'
import { useKeyboardSelection, KEYBOARD_NAVIGATION } from '@/lib/keyboardNavigation'
import { KeyboardItemRow } from '@/components/ItemRow/KeyboardItemRow'
import { KeyboardPeopleDock } from '@/components/PeopleDock/KeyboardPeopleDock'
import { TotalsPanel } from '@/components/TotalsPanel'
import type { Item, Person, PersonTotal, BillTotals } from '@/lib/types'

export interface KeyboardFlowProps {
  items: Item[]
  people: Person[]
  personTotals: PersonTotal[]
  billTotals: BillTotals
  selectedItems: string[]
  onToggleItemSelection: (item: Item, index: number) => void
  onClearSelection: () => void
  onAssignItem: (itemId: string, personId: string) => void
  onUnassignItem: (itemId: string, personId: string) => void
  onPersonClick: (person: Person) => void
  onPersonTotalClick: (person: Person) => void
  getItemAssignments: (itemId: string) => string[]
  className?: string
}

export const KeyboardFlow: React.FC<KeyboardFlowProps> = ({
  items,
  people,
  personTotals,
  billTotals,
  selectedItems,
  onToggleItemSelection,
  onClearSelection,
  onAssignItem,
  onUnassignItem,
  onPersonClick,
  onPersonTotalClick,
  getItemAssignments,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion()
  const motionVariants = getMotionVariants(prefersReducedMotion)
  const { announcements, announce } = useAriaLiveRegion()
  
  const [isAssignMode, setIsAssignMode] = useState(false)
  const [assignTarget, setAssignTarget] = useState<string | null>(null)

  // Keyboard navigation for items
  useKeyboardSelection(items, {
    multiSelect: true,
    onSelectionChange: (_selected: Item[]) => {
      // Handle selection change
    }
  })

  // Assign mode management
  const enterAssignMode = useCallback((itemId: string) => {
    setIsAssignMode(true)
    setAssignTarget(itemId)
    announce(`Entered assign mode for ${items.find(i => i.id === itemId)?.label || 'item'}`)
  }, [items, announce])


  const exitAssignMode = useCallback(() => {
    setIsAssignMode(false)
    setAssignTarget(null)
    announce('Exited assign mode')
  }, [announce])

  const handleAssignSelectedItems = useCallback((personId: string) => {
    if (selectedItems.length === 0) return

    const person = people.find(p => p.id === personId)
    if (!person) return

    // Assign all selected items to the person
    selectedItems.forEach(itemId => {
      onAssignItem(itemId, personId)
    })

    announce(`Assigned ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} to ${person.name}`)
    onClearSelection()
    exitAssignMode()
  }, [selectedItems, people, onAssignItem, onClearSelection, exitAssignMode, announce])

  const handleItemToggleSelection = useCallback((item: Item, index: number) => {
    onToggleItemSelection(item, index)
    
    const isSelected = selectedItems.includes(item.id)
    if (isSelected) {
      announce(`Selected ${item.label}`)
    } else {
      announce(`Deselected ${item.label}`)
    }
  }, [selectedItems, onToggleItemSelection, announce])

  const handleItemEnterAssignMode = useCallback((itemId: string) => {
    enterAssignMode(itemId)
  }, [enterAssignMode])

  // Handle escape key to exit assign mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === KEYBOARD_NAVIGATION.KEYS.ESCAPE && isAssignMode) {
        exitAssignMode()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isAssignMode, exitAssignMode])

  // Announce totals updates
  useEffect(() => {
    announce('Totals updated')
  }, [billTotals, announce])

  return (
    <div className={`keyboard-flow ${className}`}>
      {/* ARIA Live Region for announcements */}
      <AriaLiveRegion announcements={announcements} />
      
      {/* Instructions */}
      <motion.div
        variants={motionVariants}
        initial="initial"
        animate="animate"
        className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
      >
        <h3 className="text-sm font-medium text-blue-900 mb-2">Keyboard Navigation</h3>
        <div className="text-xs text-blue-700 space-y-1">
          <p><strong>Items:</strong> Arrow keys to navigate, Enter to select, Space for assign mode</p>
          <p><strong>People:</strong> Arrow keys to navigate, Enter to assign selected items</p>
          <p><strong>Escape:</strong> Exit assign mode</p>
        </div>
      </motion.div>

      {/* Items Grid */}
      <motion.div
        variants={motionVariants}
        initial="initial"
        animate="animate"
        className="mb-6"
      >
        <h2 className="text-lg font-semibold mb-4">Items</h2>
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          role={KEYBOARD_NAVIGATION.ROLES.GRID}
          aria-label={KEYBOARD_NAVIGATION.ARIA_LABELS.ITEMS_GRID}
          tabIndex={0}
          data-testid="items-grid"
        >
          <AnimatePresence>
            {items.map((item, index) => (
              <KeyboardItemRow
                key={item.id}
                item={item}
                index={index}
                people={people}
                isSelected={selectedItems.includes(item.id)}
                isAssignMode={isAssignMode}
                assignTarget={assignTarget}
                onToggleSelection={handleItemToggleSelection}
                onEnterAssignMode={handleItemEnterAssignMode}
                onAssignItem={onAssignItem}
                onUnassignItem={onUnassignItem}
                getItemAssignments={getItemAssignments}
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* People Dock */}
      <motion.div
        variants={motionVariants}
        initial="initial"
        animate="animate"
        className="mb-6"
      >
        <h2 className="text-lg font-semibold mb-4">People</h2>
        <KeyboardPeopleDock
          people={people}
          personTotals={personTotals}
          selectedItems={selectedItems}
          isAssignMode={isAssignMode}
          onAssignSelectedItems={handleAssignSelectedItems}
          onPersonClick={onPersonClick}
          onPersonTotalClick={onPersonTotalClick}
        />
      </motion.div>

      {/* Totals Panel */}
      <motion.div
        variants={motionVariants}
        initial="initial"
        animate="animate"
        aria-live="polite"
        role="status"
      >
        <TotalsPanel
          subtotal={billTotals.subtotal}
          tax={billTotals.tax}
          tip={billTotals.tip}
          total={billTotals.total}
          personTotals={personTotals}
          distributed={billTotals.distributed}
        />
      </motion.div>

      {/* Selection Summary */}
      {selectedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg"
        >
          <div className="flex items-center gap-2">
            <span>{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected</span>
            <button
              onClick={onClearSelection}
              className="text-blue-200 hover:text-white underline"
              data-testid="clear-selection"
            >
              Clear
            </button>
          </div>
        </motion.div>
      )}

      {/* Assign Mode Overlay */}
      <AnimatePresence>
        {isAssignMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={exitAssignMode}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Assign Items</h3>
              <p className="text-gray-600 mb-4">
                Select a person to assign the selected items to.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={exitAssignMode}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
