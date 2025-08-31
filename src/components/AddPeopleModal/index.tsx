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
  const [people, setPeople] = useState<Person[]>(existingPeople)
  const [newPersonName, setNewPersonName] = useState('')

  const handleAddPerson = () => {
    if (newPersonName.trim()) {
      const newPerson: Person = {
        id: Date.now().toString(),
        name: newPersonName.trim(),
        color: avatarColors[people.length % avatarColors.length]
      }
      setPeople([...people, newPerson])
      setNewPersonName('')
    }
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
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-gray-900 text-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">Add People</h2>
                <motion.button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
              <p className="text-gray-400 text-sm">Who's splitting this bill?</p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {/* Add Methods */}
              <div className="flex gap-3 mb-6">
                <motion.button
                  onClick={handleAddFromContacts}
                  className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-white px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>From Contacts</span>
                </motion.button>
              </div>

              {/* Manual Entry */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Add Manually
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddPerson()}
                    placeholder="Enter name..."
                    className="flex-1 bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                  />
                  <motion.button
                    onClick={handleAddPerson}
                    disabled={!newPersonName.trim()}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                      newPersonName.trim()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    }`}
                    whileHover={newPersonName.trim() ? { scale: 1.05 } : {}}
                    whileTap={newPersonName.trim() ? { scale: 0.95 } : {}}
                  >
                    Add
                  </motion.button>
                </div>
              </div>

              {/* People List */}
              <div className="space-y-3">
                <AnimatePresence>
                  {people.map((person, index) => (
                    <motion.div
                      key={person.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 bg-gray-800 p-3 rounded-xl"
                    >
                      {/* Avatar */}
                      <motion.div
                        className={`w-12 h-12 ${person.color} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        {person.avatar ? (
                          <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          person.name.charAt(0).toUpperCase()
                        )}
                      </motion.div>

                      {/* Name */}
                      <span className="flex-1 font-semibold">{person.name}</span>

                      {/* Remove Button */}
                      <motion.button
                        onClick={() => handleRemovePerson(person.id)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {people.length === 0 && (
                  <motion.div 
                    className="text-center py-8 text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="text-4xl mb-3">👥</div>
                    <p>No one added yet</p>
                    <p className="text-sm mt-1">Add people to start splitting</p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 bg-gray-900/50">
              <div className="flex gap-3">
                <motion.button
                  onClick={onClose}
                  className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-xl font-bold hover:bg-gray-800 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSubmit}
                  disabled={people.length === 0}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    people.length > 0
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                  whileHover={people.length > 0 ? { scale: 1.02 } : {}}
                  whileTap={people.length > 0 ? { scale: 0.98 } : {}}
                >
                  {people.length === 0 ? 'Add People First' : `Continue with ${people.length} ${people.length === 1 ? 'Person' : 'People'}`}
                </motion.button>
              </div>

              {people.length > 0 && (
                <motion.p 
                  className="text-center text-xs text-gray-500 mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  You can always add more people later
                </motion.p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}