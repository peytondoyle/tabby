import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useFlowStore, type FlowPerson } from '@/lib/flowStore'
import { Button } from "@/components/ui/Button";

interface PeopleStepProps {
  onNext: () => void
  onPrev: () => void
}

export const PeopleStep: React.FC<PeopleStepProps> = ({ onNext, onPrev }) => {
  const { people, addPerson, removePerson } = useFlowStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonVenmo, setNewPersonVenmo] = useState('')

  const handleAddPerson = () => {
    if (newPersonName.trim()) {
      const newPerson: FlowPerson = {
        id: `person-${Date.now()}`,
        name: newPersonName.trim(),
        venmo_handle: newPersonVenmo.trim() || undefined
      }
      
      addPerson(newPerson)
      setNewPersonName('')
      setNewPersonVenmo('')
      setShowAddForm(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPerson()
    }
  }

  const canProceed = people.length >= 1

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">👥</div>
        <h2 className="text-2xl font-bold mb-2">Who's splitting the bill?</h2>
        <p className="text-text-secondary">
          Add the people you want to split the bill with
        </p>
      </motion.div>

      {/* People List */}
      <motion.div 
        className="space-y-3 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {people.length === 0 ? (
          <div className="text-center py-8 text-text-secondary bg-surface rounded-2xl border border-border">
            <div className="text-3xl mb-2">👋</div>
            <p>No people added yet</p>
          </div>
        ) : (
          people.map((person, index) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center font-bold text-primary">
                  {person.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-text-primary">{person.name}</div>
                  {person.venmo_handle && (
                    <div className="text-sm text-text-secondary">@{person.venmo_handle}</div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => removePerson(person.id)}
                className="p-2 text-text-secondary hover:text-error transition-colors"
                title="Remove person"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Add Person Form */}
      {showAddForm ? (
        <motion.div 
          className="p-6 bg-surface rounded-2xl border border-border mb-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h3 className="font-bold mb-4 text-text-primary">Add Person</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Name *
              </label>
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter name"
                className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Venmo Handle (Optional)
              </label>
              <input
                type="text"
                value={newPersonVenmo}
                onChange={(e) => setNewPersonVenmo(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="username"
                className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false)
                  setNewPersonName('')
                  setNewPersonVenmo('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddPerson}
                disabled={!newPersonName.trim()}
              >
                Add Person
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border hover:border-primary/50 rounded-xl text-text-secondary hover:text-text-primary transition-all mb-6"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Person
        </motion.button>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <Button
          variant="secondary"
          onClick={onPrev}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>
        
        <Button
          onClick={onNext}
          disabled={!canProceed}
          full
        >
          {people.length === 0 ? 'Add at least 1 person' : `Continue with ${people.length} ${people.length === 1 ? 'person' : 'people'}`}
        </Button>
      </div>
    </div>
  )
}