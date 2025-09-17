import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// TODO: Prepared for migration to Modal primitive
// import { Modal } from '@/components/ui/Modal'
// import { Button } from '@/components/ui/Button'
// import { Card } from '@/components/ui/Card'

interface Person {
  id: string
  name: string
  avatar?: string
  color: string
}

interface AddPeopleModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPeople: (people: Person[]) => void
  existingPeople?: Person[]
}

const avatarColors = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-teal-500',
]

export const AddPeopleModal: React.FC<AddPeopleModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddPeople,
  existingPeople = []
}) => {
  const [people, setPeople] = useState<Person[]>(existingPeople)
  const [newPersonName, setNewPersonName] = useState('')
  const [error, setError] = useState('')

  const handleAddPerson = () => {
    const trimmedName = newPersonName.trim()
    setError('')
    
    // Check minimum length
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters')
      return
    }
    
    // Check for duplicates (case-insensitive)
    const isDuplicate = people.some(p => 
      p.name.toLowerCase() === trimmedName.toLowerCase()
    )
    
    if (isDuplicate) {
      setError('This person has already been added')
      return
    }
    
    const newPerson: Person = {
      id: Date.now().toString(),
      name: trimmedName,
      color: avatarColors[people.length % avatarColors.length]
    }
    setPeople([...people, newPerson])
    setNewPersonName('')
  }

  const handleRemovePerson = (id: string) => {
    setPeople(people.filter(p => p.id !== id))
  }

  const handleSubmit = () => {
    if (people.length > 0) {
      onAddPeople(people)
      onClose()
    }
  }

  const handleAddFromContacts = () => {
    // Stub for contacts API
    alert('Contacts API integration coming soon! For now, please add people manually.')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-surface-elevated text-text-primary rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden border border-border shadow-xl mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-border bg-surface-elevated">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-text-primary">Add People</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-surface rounded-lg transition-all duration-200 text-text-secondary hover:text-text-primary"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-text-secondary text-sm">Who's splitting this bill?</p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {/* Add Methods */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleAddFromContacts}
                  className="w-full bg-primary hover:bg-primary-hover text-text-inverse px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Add from Contacts</span>
                </button>
                
                <button
                  onClick={() => setNewPersonName('')}
                  className="w-full bg-surface border border-border text-text-primary hover:bg-surface-elevated px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Enter Manually</span>
                </button>
              </div>

              {/* Manual Entry - only show if user clicks "Enter Manually" */}
              {newPersonName !== undefined && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-text-secondary mb-2">
                    Add Manually
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPersonName}
                      onChange={(e) => {
                        setNewPersonName(e.target.value)
                        setError('')
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddPerson()}
                      placeholder="Enter name..."
                      className={`flex-1 bg-surface border text-text-primary px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary placeholder-text-muted transition-all duration-200 ${
                        error ? 'border-error' : 'border-border'
                      }`}
                    />
                    <button
                      onClick={handleAddPerson}
                      disabled={!newPersonName.trim()}
                      className={`px-6 py-3 rounded-lg font-bold transition-all duration-200 ${
                        newPersonName.trim()
                          ? 'bg-primary hover:bg-primary-hover text-text-inverse hover:opacity-90 shadow-md'
                          : 'bg-surface border border-border text-text-muted cursor-not-allowed'
                      }`}
                    >
                      Add
                    </button>
                  </div>
                  {error && (
                    <p className="mt-2 text-sm text-error">{error}</p>
                  )}
                </div>
              )}

              {/* People List */}
              <div className="space-y-3">
                <div className="space-y-3">
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-border"
                    >
                      {/* Avatar */}
                      <div
                        className={`w-12 h-12 ${person.color} rounded-full flex items-center justify-center text-text-inverse font-bold text-lg shadow-md`}
                      >
                        {person.avatar ? (
                          <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          person.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* Name */}
                      <span className="flex-1 font-semibold text-text-primary">{person.name}</span>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemovePerson(person.id)}
                        className="text-error hover:text-error/80 transition-colors px-2 py-1 rounded hover:bg-error-light"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {people.length === 0 && (
                  <div className="text-center py-8 text-text-muted">
                    <div className="text-4xl mb-3">👥</div>
                    <p>No one added yet</p>
                    <p className="text-sm mt-1">Add people to start splitting</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border bg-surface-elevated">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 border border-border text-text-secondary rounded-lg font-bold hover:bg-surface transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={people.length === 0}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all duration-200 ${
                    people.length > 0
                      ? 'bg-primary hover:bg-primary-hover text-text-inverse shadow-md hover:opacity-90'
                      : 'bg-surface border border-border text-text-muted cursor-not-allowed'
                  }`}
                >
                  {people.length === 0 ? 'Add People First' : `Continue with ${people.length} ${people.length === 1 ? 'Person' : 'People'}`}
                </button>
              </div>

              {people.length > 0 && (
                <p className="text-center text-xs text-text-muted mt-3">
                  You can always add more people later
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}