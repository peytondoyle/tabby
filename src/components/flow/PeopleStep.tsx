import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useFlowStore, type FlowPerson } from '@/lib/flowStore'

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
        <p className="text-ink-dim">
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
          <div className="text-center py-8 text-ink-dim bg-card rounded-2xl border border-line">
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
              className="flex items-center justify-between p-4 bg-card rounded-xl border border-line hover:border-brand/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand/20 rounded-full flex items-center justify-center font-bold text-brand">
                  {person.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{person.name}</div>
                  {person.venmo_handle && (
                    <div className="text-sm text-ink-dim">@{person.venmo_handle}</div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => removePerson(person.id)}
                className="p-2 text-ink-dim hover:text-danger transition-colors"
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
          className="p-6 bg-card rounded-2xl border border-line mb-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h3 className="font-bold mb-4">Add Person</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-dim mb-2">
                Name *
              </label>
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter name"
                className="w-full p-3 bg-paper border border-line rounded-xl focus:ring-2 focus:ring-brand/30 focus:border-brand"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink-dim mb-2">
                Venmo Handle (Optional)
              </label>
              <input
                type="text"
                value={newPersonVenmo}
                onChange={(e) => setNewPersonVenmo(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="username"
                className="w-full p-3 bg-paper border border-line rounded-xl focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewPersonName('')
                  setNewPersonVenmo('')
                }}
                className="flex-1 px-4 py-2 text-ink-dim border border-line rounded-xl hover:bg-paper transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPerson}
                disabled={!newPersonName.trim()}
                className="flex-1 px-4 py-2 bg-brand hover:bg-brand/90 disabled:bg-brand/50 text-white rounded-xl font-semibold transition-all"
              >
                Add Person
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-line hover:border-brand/50 rounded-xl text-ink-dim hover:text-ink transition-all mb-6"
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
          disabled={!canProceed}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
            canProceed
              ? 'bg-brand hover:bg-brand/90 text-white'
              : 'bg-brand/30 text-white/70 cursor-not-allowed'
          }`}
        >
          {people.length === 0 ? 'Add at least 1 person' : `Continue with ${people.length} ${people.length === 1 ? 'person' : 'people'}`}
        </button>
      </div>
    </div>
  )
}