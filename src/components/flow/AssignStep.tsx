import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFlowStore } from '@/lib/flowStore'
import type { PersonId, ItemId } from '@/types/flow'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Card } from '@/components/ui/Card'
import { ItemPill } from '@/components/ui/ItemPill'

interface AssignStepProps {
  onNext: () => void
  onPrev: () => void
}

export const AssignStep: React.FC<AssignStepProps> = ({ onNext, onPrev }) => {
  const { 
    people, 
    items, 
    getItemAssignments, 
    assign, 
    unassign,
    getTotalForPerson
  } = useFlowStore()
  
  const [selectedItems, setSelectedItems] = useState<Set<ItemId>>(new Set())

  const handleItemToggle = useCallback((itemId: ItemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const handleAssignSelected = useCallback((personId: PersonId) => {
    if (selectedItems.size > 0) {
      selectedItems.forEach(itemId => {
        assign(itemId, personId)
      })
      setSelectedItems(new Set())
    }
  }, [selectedItems, assign])

  const handleUnassignItem = useCallback((itemId: ItemId, personId: PersonId) => {
    unassign(itemId, personId)
  }, [unassign])

  const handleQuickAssign = useCallback((itemId: ItemId, personId: PersonId) => {
    assign(itemId, personId)
  }, [assign])

  const autoAssignUnassignedItems = useCallback(() => {
    const unassignedItems = items.filter(item => getItemAssignments(item.id).length === 0)
    
    if (unassignedItems.length > 0 && people.length > 0) {
      unassignedItems.forEach((item, index) => {
        // Round-robin assignment
        const personIndex = index % people.length
        const person = people[personIndex]
        assign(item.id, person.id)
      })
    }
  }, [items, people, getItemAssignments, assign])

  const handleSplitBill = useCallback(async () => {
    // Auto-assign any unassigned items
    const unassignedCount = items.filter(item => getItemAssignments(item.id).length === 0).length
    if (unassignedCount > 0) {
      autoAssignUnassignedItems()
    }

    // TODO: Add Supabase persistence here
    console.log('Persisting bill state to Supabase...')
    onNext()
  }, [items, getItemAssignments, autoAssignUnassignedItems, onNext])

  // Get unassigned items for quick assign ribbons
  const unassignedItems = items.filter(item => getItemAssignments(item.id).length === 0)

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">🎯</div>
        <h1 className="text-4xl font-bold text-[var(--ui-text)] mb-2">Assign Items</h1>
        <p className="text-lg text-[var(--ui-text-dim)]">
          {selectedItems.size > 0 
            ? `Click people to assign ${selectedItems.size} selected item${selectedItems.size > 1 ? 's' : ''}`
            : "Click items to select, then click people to assign"
          }
        </p>
      </motion.div>

      {/* People Cards */}
      <motion.div 
        className="mb-8 space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {people.map((person) => {
          const personTotal = getTotalForPerson(person.id)
          const assignedItems = items.filter(item => 
            getItemAssignments(item.id).includes(person.id)
          )
          
          return (
            <Card key={person.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                {/* Person Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--ui-primary)] text-white font-bold text-lg flex items-center justify-center">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--ui-text)]">
                      {person.name}
                    </h3>
                    <p className="text-[var(--ui-text-dim)]">
                      {assignedItems.length} item{assignedItems.length !== 1 ? 's' : ''} • ${personTotal.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Assign Selected CTA */}
                {selectedItems.size > 0 && (
                  <Button 
                    onClick={() => handleAssignSelected(person.id)}
                    variant="primary"
                    size="sm"
                    aria-label={`Assign ${selectedItems.size} selected items to ${person.name}`}
                  >
                    Assign {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''}
                  </Button>
                )}
              </div>
              
              {/* Quick-assign ribbon */}
              {unassignedItems.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {unassignedItems.slice(0, 4).map(item => (
                      <ItemPill
                        key={`${person.id}-${item.id}`}
                        id={item.id}
                        icon={item.emoji}
                        name={item.label}
                        price={item.price}
                        onClick={(itemId) => handleQuickAssign(itemId, person.id)}
                      />
                    ))}
                  </div>
                  {unassignedItems.length > 4 && (
                    <p className="text-sm text-[var(--ui-text-dim)]">
                      +{unassignedItems.length - 4} more unassigned items
                    </p>
                  )}
                </div>
              )}
              
              {/* Assigned items */}
              {assignedItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-[var(--ui-text-dim)] uppercase tracking-wide">
                    Assigned Items
                  </h4>
                  <div className="grid gap-2">
                    {assignedItems.map(item => (
                      <motion.div 
                        key={`assigned-${item.id}`}
                        className="flex items-center justify-between p-3 bg-[var(--ui-panel-2)] rounded-[var(--r-md)] border border-[var(--ui-border)]"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{item.emoji}</span>
                          <span className="text-[var(--ui-text)] font-medium">{item.label}</span>
                          <span className="text-[var(--ui-text-dim)]">${item.price.toFixed(2)}</span>
                        </div>
                        <IconButton 
                          size="sm"
                          tone="danger"
                          onClick={() => handleUnassignItem(item.id, person.id)}
                          aria-label={`Remove ${item.label} from ${person.name}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </IconButton>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </motion.div>

      {/* Items Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-xl font-semibold text-[var(--ui-text)] mb-6 text-center">
          Select Items to Assign
        </h3>
        <div className="flex flex-wrap gap-3 justify-center">
          <AnimatePresence>
            {items.map((item) => {
              const assignments = getItemAssignments(item.id)
              const isSelected = selectedItems.has(item.id)
              const isAssigned = assignments.length > 0
              
              return (
                <motion.div
                  key={item.id}
                  className="relative"
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ItemPill
                    id={item.id}
                    icon={item.emoji}
                    name={item.label}
                    price={item.price}
                    selected={isSelected}
                    assigned={isAssigned && !isSelected}
                    onClick={handleItemToggle}
                  />
                  
                  {/* Assignment count badge */}
                  {isAssigned && assignments.length > 0 && !isSelected && (
                    <motion.div 
                      className="absolute -top-2 -right-2 bg-[var(--ui-primary)] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      {assignments.length}
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
        
        {selectedItems.size > 0 && (
          <motion.div 
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[var(--ui-text-dim)] mb-2">
              {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
            </p>
            <Button 
              variant="subtle"
              size="sm"
              onClick={() => setSelectedItems(new Set())}
            >
              Clear Selection
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-[var(--ui-border)] bg-[var(--ui-bg)]/95 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Button 
            variant="secondary" 
            onClick={onPrev}
            leftIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            }
          >
            Back
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-[var(--ui-text-dim)]">
              {items.filter(item => getItemAssignments(item.id).length === 0).length} unassigned items
            </p>
          </div>
          
          <Button 
            onClick={handleSplitBill}
            rightIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            }
          >
            Split Bill
          </Button>
        </div>
      </div>
    </div>
  )
}