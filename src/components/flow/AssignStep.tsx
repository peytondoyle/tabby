import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useFlowStore } from '@/lib/flowStore'

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
  
  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  const handlePersonClick = (personId: string) => {
    if (activeItemId) {
      const currentAssignments = getItemAssignments(activeItemId)
      
      if (currentAssignments.includes(personId)) {
        // Remove person from assignment
        unassign(activeItemId, personId)
      } else {
        // Add person to assignment
        assign(activeItemId, personId)
      }
    }
  }

  const handleItemClick = (itemId: string) => {
    setActiveItemId(activeItemId === itemId ? null : itemId)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getUnassignedItemsCount = () => {
    return items.filter(item => getItemAssignments(item.id).length === 0).length
  }

  const allItemsAssigned = getUnassignedItemsCount() === 0 && items.length > 0

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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">🎯</div>
        <h1 className="text-4xl font-bold mb-2">Assign Items</h1>
        <p className="text-lg text-ink-dim">
          Tap an item, then tap people to assign
        </p>
      </motion.div>

      {/* Avatars Row - People at Top */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-wrap justify-center gap-4">
          {people.map((person) => {
            const personTotal = getTotalForPerson(person.id)
            const isAssignedToActive = activeItemId && getItemAssignments(activeItemId).includes(person.id)
            
            return (
              <motion.button
                key={person.id}
                onClick={() => handlePersonClick(person.id)}
                className={`flex flex-col items-center p-3 rounded-2xl transition-all ${
                  activeItemId
                    ? isAssignedToActive
                      ? 'bg-brand/20 border-2 border-brand'
                      : 'bg-card border border-line hover:border-brand/50'
                    : 'bg-card border border-line cursor-default'
                }`}
                disabled={!activeItemId}
                whileHover={activeItemId ? { scale: 1.05 } : undefined}
                whileTap={activeItemId ? { scale: 0.95 } : undefined}
              >
                <div className="w-12 h-12 bg-brand/20 rounded-full flex items-center justify-center font-bold text-brand text-lg mb-2">
                  {person.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-sm font-medium text-center">{person.name}</div>
                <div className="text-xs text-ink-dim">{formatPrice(personTotal)}</div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Unassigned Items Warning */}
      {getUnassignedItemsCount() > 0 && (
        <motion.div 
          className="mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-xl text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-yellow-800 text-sm font-medium">
            {getUnassignedItemsCount()} item{getUnassignedItemsCount() > 1 ? 's' : ''} unassigned
          </p>
        </motion.div>
      )}

      {/* Items Pool at Bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex flex-wrap gap-3 justify-center">
          {items.map((item) => {
            const assignments = getItemAssignments(item.id)
            const isActive = activeItemId === item.id
            const isAssigned = assignments.length > 0
            
            return (
              <motion.button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${
                  isActive
                    ? 'border-brand bg-brand/10 ring-2 ring-brand/30'
                    : isAssigned
                    ? 'border-line bg-card opacity-60'
                    : 'border-line bg-card hover:border-brand/50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-sm">{item.emoji}</span>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-ink-dim">{formatPrice(item.price)}</span>
                
                {/* Assignee count badge */}
                {isAssigned && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{assignments.length}</span>
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-4 mt-12">
        <button
          onClick={onPrev}
          className="flex items-center gap-2 px-6 py-3 bg-card border border-line hover:border-brand/50 text-ink rounded-xl font-semibold transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        <button
          onClick={handleSplitBill}
          disabled={items.length === 0 || people.length === 0}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
            items.length > 0 && people.length > 0
              ? 'bg-brand hover:bg-brand/90 text-white'
              : 'bg-brand/30 text-white/70 cursor-not-allowed'
          }`}
        >
          {getUnassignedItemsCount() > 0 ? `Split Bill (${getUnassignedItemsCount()} auto-assign)` : 'Split Bill'}
        </button>
      </div>
    </div>
  )
}