import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useFlowStore } from '@/lib/flowStore'
import type { PersonId, ItemId } from '@/types/flow'
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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

  const handleItemClick = (itemId: ItemId) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handlePersonClick = (personId: PersonId) => {
    if (selectedItems.size > 0) {
      selectedItems.forEach(itemId => {
        assign(itemId, personId)
      })
      setSelectedItems(new Set())
    }
  }



  const getUnassignedItemsCount = () => {
    return items.filter(item => getItemAssignments(item.id).length === 0).length
  }



  // Auto-assign unassigned items evenly before proceeding
  const autoAssignUnassignedItems = () => {
    const unassignedItems = items.filter(item => getItemAssignments(item.id).length === 0)
    
    if (unassignedItems.length > 0 && people.length > 0) {
      unassignedItems.forEach((item, index) => {
        // Round-robin assignment
        const personIndex = index % people.length
        const person = people[personIndex]
        assign(item.id, person.id)
      })
    }
  }

  const handleSplitBill = async () => {
    // Auto-assign any unassigned items
    if (getUnassignedItemsCount() > 0) {
      autoAssignUnassignedItems()
    }

    // TODO: Add Supabase persistence here
    // For now, just proceed to the next step
    // In a real implementation, this would:
    // 1. Create/update bill in Supabase
    // 2. Create people records
    // 3. Create items with assignments
    // 4. Generate sharing links
    console.log('Persisting bill state to Supabase...')
    
    onNext()
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">🎯</div>
        <h1 className="text-4xl font-bold mb-2">Assign Items</h1>
        <p className="text-lg text-[var(--ui-text-dim)]">
          {selectedItems.size > 0 
            ? `Click people to assign ${selectedItems.size} selected item${selectedItems.size > 1 ? 's' : ''}`
            : "Click items to select, then click people to assign"
          }
        </p>
      </motion.div>

      {/* People Cards */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {people.map((person) => {
          const personTotal = getTotalForPerson(person.id)
          const assignedToPerson = items.filter(item => getItemAssignments(item.id).includes(person.id))
          const unassigned = items.filter(item => getItemAssignments(item.id).length === 0)
          
          return (
            <Card key={person.id} className="p-4 sm:p-5 mb-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{person.name}</div>
                <div className="text-[var(--ui-text-dim)]">${personTotal.toFixed(2)}</div>
              </div>
              
              {/* Quick assign chips */}
              <div className="mt-3 flex flex-wrap gap-2">
                {unassigned.slice(0,4).map(item => (
                  <button 
                    key={item.id} 
                    className="inline-flex items-center gap-2 px-3 h-9 rounded-xl bg-[var(--ui-subtle)] hover:bg-[var(--ui-panel-2)] border border-[var(--ui-border)] text-sm"
                    onClick={() => assign(item.id, person.id)}
                  >
                    {item.emoji}<span className="truncate max-w-[180px]">{item.label}</span><span className="opacity-70">${item.price.toFixed(2)}</span>
                  </button>
                ))}
                {unassigned.length > 4 && <span className="text-sm text-[var(--ui-text-dim)]">+{unassigned.length-4} more</span>}
              </div>
              
              {/* Assigned items */}
              <div className="mt-4 grid gap-2">
                {assignedToPerson.map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-3 py-2">
                    <div className="truncate">{item.emoji} {item.label}</div>
                    <div className="flex items-center gap-3">
                      <span>${item.price.toFixed(2)}</span>
                      <button 
                        className="ml-1 text-[var(--ui-danger)] hover:underline"
                        onClick={() => unassign(item.id, person.id)}
                      >×</button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Assign selected items CTA */}
              {selectedItems.size > 0 && (
                <div className="mt-4 p-3 bg-[var(--ui-primary)]/10 border border-[var(--ui-primary)]/20 rounded-xl">
                  <button 
                    className="w-full text-center font-medium text-[var(--ui-primary)]"
                    onClick={() => handlePersonClick(person.id)}
                  >
                    Assign {selectedItems.size} selected item{selectedItems.size > 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </Card>
          )
        })}
      </motion.div>

      {/* Items Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold mb-4 text-center">Select Items to Assign</h3>
        <div className="flex flex-wrap gap-3 justify-center">
          {items.map((item) => {
            const assignments = getItemAssignments(item.id)
            const isSelected = selectedItems.has(item.id)
            const isAssigned = assignments.length > 0
            
            return (
              <motion.button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`inline-flex items-center gap-2 px-3 h-9 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/10 ring-2 ring-[var(--ui-primary)]'
                    : isAssigned
                    ? 'border-[var(--ui-border)] bg-[var(--ui-panel-2)] opacity-60'
                    : 'border-[var(--ui-border)] bg-[var(--ui-panel-2)] hover:border-[var(--ui-primary)]/50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-sm">{item.emoji}</span>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-[var(--ui-text-dim)]">${item.price.toFixed(2)}</span>
                
                {/* Assignee count badge */}
                {isAssigned && (
                  <div className="ml-2 px-2 py-1 bg-[var(--ui-primary)] rounded-full">
                    <span className="text-xs font-bold text-white">{assignments.length}</span>
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-10 border-t border-[var(--ui-border)] bg-[var(--ui-bg)]/75 backdrop-blur supports-[backdrop-filter]:bg-[var(--ui-bg)]/60 p-3 flex justify-between">
        <Button variant="secondary" onClick={onPrev}>← Back</Button>
        <Button onClick={handleSplitBill}>Split Bill →</Button>
      </div>
    </div>
  )
}