import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
  // Start with empty list for NEW people only
  const [newPeople, setNewPeople] = useState<Person[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [error, setError] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)

  // Combine existing and new for display
  const allPeople = [...existingPeople, ...newPeople]

  const handleAddPerson = () => {
    const trimmedName = newPersonName.trim()
    setError('')

    // Check minimum length
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters')
      return
    }

    // Check for duplicates (case-insensitive)
    const isDuplicate = allPeople.some(p =>
      p.name.toLowerCase() === trimmedName.toLowerCase()
    )

    if (isDuplicate) {
      setError('This person has already been added')
      return
    }

    const newPerson: Person = {
      id: Date.now().toString(),
      name: trimmedName,
      color: avatarColors[allPeople.length % avatarColors.length]
    }
    setNewPeople([...newPeople, newPerson])
    setNewPersonName('')
    setShowManualEntry(false)
  }

  const handleRemovePerson = (id: string) => {
    setNewPeople(newPeople.filter(p => p.id !== id))
  }

  const handleSubmit = () => {
    onAddPeople(newPeople)
    onClose()
  }

  const handleAddFromContacts = () => {
    // Stub for contacts API
    alert('Contacts API integration coming soon! For now, please add people manually.')
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.slice(0, 1).toUpperCase()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
              mass: 0.8
            }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#121622] rounded-t-3xl shadow-2xl border-t border-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4">
              <h2 className="text-2xl font-bold text-white text-center">Add People</h2>
              <p className="text-gray-400 text-center text-sm mt-1">Who's splitting this bill?</p>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto">
              {/* Quick Actions */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={handleAddFromContacts}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white px-4 py-3.5 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add from Contacts
                </button>

                <button
                  onClick={() => setShowManualEntry(!showManualEntry)}
                  className="flex-1 bg-white/5 border border-white/10 text-white hover:border-white/30 hover:bg-white/10 px-4 py-3.5 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Enter Manually
                </button>
              </div>

              {/* Manual Entry */}
              {showManualEntry && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
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
                      className={`flex-1 bg-white/5 border text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder-gray-500 transition-all duration-200 ${
                        error ? 'border-red-500/80' : 'border-white/10'
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={handleAddPerson}
                      disabled={!newPersonName.trim()}
                      className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
                        newPersonName.trim()
                          ? 'bg-primary hover:bg-primary-hover text-white shadow-md'
                          : 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Add
                    </button>
                  </div>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-red-500"
                    >
                      {error}
                    </motion.p>
                  )}
                </motion.div>
              )}

              {/* People List */}
              <div className="space-y-3">
                {allPeople.map((person, index) => {
                  const isExisting = existingPeople.some(p => p.id === person.id)
                  return (
                  <motion.div
                    key={person.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl"
                  >
                    {/* Avatar */}
                    <div
                      className={`w-12 h-12 ${person.color} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner`}
                    >
                      {person.avatar ? (
                        <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitials(person.name)
                      )}
                    </div>

                    {/* Name */}
                    <span className="flex-1 font-semibold text-white text-lg">
                      {person.name}
                      {person.id === 'you' && <span className="text-gray-400 text-sm ml-2">(You)</span>}
                    </span>

                    {/* Remove Button - only for new people */}
                    {!isExisting && (
                      <button
                        onClick={() => handleRemovePerson(person.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-[#121622] rounded-b-3xl">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 border border-white/10 text-gray-300 rounded-2xl font-semibold hover:bg-white/5 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-4 rounded-2xl font-semibold transition-all duration-200 bg-primary hover:bg-primary-hover text-white shadow-md"
                >
                  {newPeople.length > 0 ? `Add ${newPeople.length} ${newPeople.length === 1 ? 'Person' : 'People'}` : 'Done'}
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 mt-3">
                You can always add more people later
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
