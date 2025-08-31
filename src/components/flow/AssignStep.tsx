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
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const handlePersonClick = (personId: string) => {
    if (selectedItemId) {
      const currentAssignments = getItemAssignments(selectedItemId)
      
      if (currentAssignments.includes(personId)) {
        // Unassign
        unassign(selectedItemId, personId)
      } else {
        // Assign
        assign(selectedItemId, personId)
      }
    }
  }

  const handleItemClick = (itemId: string) => {
    setSelectedItemId(selectedItemId === itemId ? null : itemId)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getAssignedItemsCount = () => {
    return items.filter(item => getItemAssignments(item.id).length > 0).length
  }

  const allItemsAssigned = getAssignedItemsCount() === items.length && items.length > 0

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold mb-2">Assign Items to People</h2>
        <p className="text-ink-dim">
          Tap an item, then tap the people who should pay for it
        </p>
      </motion.div>

      {/* Assignment Progress */}
      <motion.div 
        className="bg-card rounded-2xl border border-line p-4 mb-8 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-lg font-semibold mb-1">
          {getAssignedItemsCount()} of {items.length} items assigned
        </div>
        <div className="w-full bg-paper rounded-full h-2">
          <motion.div
            className="bg-brand h-full rounded-full transition-all duration-300"
            style={{ width: `${items.length > 0 ? (getAssignedItemsCount() / items.length) * 100 : 0}%` }}
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* People Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            👥 People
            {selectedItemId && (
              <span className="text-sm font-normal text-ink-dim">
                (tap to assign selected item)
              </span>
            )}
          </h3>
          
          <div className="space-y-3">
            {people.map((person) => {
              const isAssignedToSelected = selectedItemId && getItemAssignments(selectedItemId).includes(person.id)
              const personTotal = getTotalForPerson(person.id)
              
              return (
                <motion.button
                  key={person.id}
                  onClick={() => handlePersonClick(person.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedItemId
                      ? isAssignedToSelected
                        ? 'border-brand bg-brand/10 hover:bg-brand/20'
                        : 'border-line hover:border-brand/50 bg-card'
                      : 'border-line bg-card cursor-default'
                  }`}
                  disabled={!selectedItemId}
                  whileHover={selectedItemId ? { scale: 1.02 } : undefined}
                  whileTap={selectedItemId ? { scale: 0.98 } : undefined}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand/20 rounded-full flex items-center justify-center font-bold text-brand">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold">{person.name}</div>
                        <div className="text-sm text-ink-dim">
                          {formatPrice(personTotal)}
                        </div>
                      </div>
                    </div>
                    
                    {selectedItemId && isAssignedToSelected && (
                      <div className="text-brand">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Items Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            🍽️ Items
            <span className="text-sm font-normal text-ink-dim">
              (tap to select)
            </span>
          </h3>
          
          <div className="space-y-3">
            {items.map((item) => {
              const assignments = getItemAssignments(item.id)
              const isSelected = selectedItemId === item.id
              const isAssigned = assignments.length > 0
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-brand bg-brand/10'
                      : isAssigned
                      ? 'border-green-500 bg-green-50'
                      : 'border-line bg-card hover:border-brand/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.emoji}</span>
                      <div>
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-sm text-ink-dim">
                          {formatPrice(item.price)}
                          {item.quantity && item.quantity > 1 && (
                            <span className="ml-2 text-xs bg-ink-dim/20 px-1 rounded">
                              × {item.quantity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {assignments.length > 0 && (
                        <div className="text-xs text-green-600 font-medium mb-1">
                          Split {assignments.length} way{assignments.length > 1 ? 's' : ''}
                        </div>
                      )}
                      
                      <div className="flex -space-x-1">
                        {assignments.slice(0, 3).map((personId, index) => {
                          const person = people.find(p => p.id === personId)
                          return person ? (
                            <div
                              key={personId}
                              className="w-6 h-6 bg-brand/20 border border-white rounded-full flex items-center justify-center text-xs font-bold text-brand"
                              title={person.name}
                            >
                              {person.name.charAt(0)}
                            </div>
                          ) : null
                        })}
                        
                        {assignments.length > 3 && (
                          <div className="w-6 h-6 bg-ink-dim/20 border border-white rounded-full flex items-center justify-center text-xs">
                            +{assignments.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Instructions */}
      {selectedItemId ? (
        <motion.div 
          className="mt-8 p-4 bg-brand/10 border border-brand/30 rounded-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-brand font-medium">
            Now tap the people who should pay for "{items.find(i => i.id === selectedItemId)?.label}"
          </p>
        </motion.div>
      ) : (
        <motion.div 
          className="mt-8 p-4 bg-card border border-line rounded-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-ink-dim">
            Select an item to start assigning it to people
          </p>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex gap-4 mt-8">
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
          onClick={onNext}
          disabled={!allItemsAssigned}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
            allItemsAssigned
              ? 'bg-brand hover:bg-brand/90 text-white'
              : 'bg-brand/30 text-white/70 cursor-not-allowed'
          }`}
        >
          {allItemsAssigned ? 'Split Bill' : `Assign ${items.length - getAssignedItemsCount()} more item${items.length - getAssignedItemsCount() === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}