import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Person {
  id: string
  name: string
  avatar?: string
  color?: string
}

interface Item {
  id: string
  label: string
  price: number
  emoji: string
  quantity?: number
}

interface MultiAssignModalProps {
  isOpen: boolean
  onClose: () => void
  item: Item | null
  people: Person[]
  onAssign: (itemId: string, assignments: { personId: string; weight: number }[]) => void
}

export const MultiAssignModal: React.FC<MultiAssignModalProps> = ({
  isOpen,
  onClose,
  item,
  people,
  onAssign
}) => {
  const [assignments, setAssignments] = useState<Record<string, number>>({})
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')

  // Calculate total weight for validation
  const totalWeight = Object.values(assignments).reduce((sum, weight) => sum + weight, 0)
  const selectedPeople = Object.keys(assignments).filter(id => assignments[id] > 0)

  const handleEqualSplit = () => {
    if (selectedPeople.length === 0) return

    const weight = 1 / selectedPeople.length
    const newAssignments = { ...assignments }
    
    selectedPeople.forEach(personId => {
      newAssignments[personId] = weight
    })
    
    setAssignments(newAssignments)
  }

  const handlePersonToggle = (personId: string) => {
    setAssignments(prev => ({
      ...prev,
      [personId]: prev[personId] > 0 ? 0 : (splitMode === 'equal' ? 1 : 0.5)
    }))
  }

  const handleWeightChange = (personId: string, weight: number) => {
    setAssignments(prev => ({
      ...prev,
      [personId]: Math.max(0, Math.min(1, weight))
    }))
  }

  const handleAssign = () => {
    if (!item || totalWeight === 0) return

    const finalAssignments = Object.entries(assignments)
      .filter(([_, weight]) => weight > 0)
      .map(([personId, weight]) => ({ personId, weight }))

    onAssign(item.id, finalAssignments)
    onClose()
    setAssignments({})
  }

  const handleClose = () => {
    onClose()
    setAssignments({})
  }

  React.useEffect(() => {
    if (splitMode === 'equal' && selectedPeople.length > 0) {
      handleEqualSplit()
    }
  }, [splitMode, selectedPeople.length])

  if (!item) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-gray-900 text-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-purple-600/20 to-blue-600/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Split Item</h2>
                <motion.button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              {/* Item Display */}
              <div className="bg-gray-800 rounded-2xl p-4 flex items-center gap-4">
                <span className="text-3xl">{item.emoji}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{item.label}</h3>
                  <p className="text-green-400 font-mono">${item.price.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Split Mode Toggle */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex bg-gray-800 rounded-xl p-1">
                <motion.button
                  onClick={() => setSplitMode('equal')}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
                    splitMode === 'equal'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ⚖️ Equal Split
                </motion.button>
                <motion.button
                  onClick={() => setSplitMode('custom')}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
                    splitMode === 'custom'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  🎚️ Custom Split
                </motion.button>
              </div>
            </div>

            {/* People Selection */}
            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div className="space-y-4">
                {people.map(person => {
                  const weight = assignments[person.id] || 0
                  const isSelected = weight > 0
                  const personAmount = weight * item.price

                  return (
                    <motion.div
                      key={person.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isSelected 
                          ? 'bg-blue-600/20 border-blue-500' 
                          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      }`}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <motion.div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                            person.color || 'bg-blue-500'
                          }`}
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handlePersonToggle(person.id)}
                        >
                          {person.avatar ? (
                            <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            person.name.charAt(0).toUpperCase()
                          )}
                        </motion.div>

                        <div className="flex-1">
                          <h4 className="font-bold">{person.name}</h4>
                          {isSelected && (
                            <p className="text-sm text-green-400 font-mono">
                              ${personAmount.toFixed(2)} ({(weight * 100).toFixed(0)}%)
                            </p>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3">
                          {splitMode === 'custom' && isSelected && (
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={weight}
                                onChange={(e) => handleWeightChange(person.id, parseFloat(e.target.value))}
                                className="w-20"
                              />
                              <span className="text-xs text-gray-400 w-8 text-right">
                                {(weight * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}

                          <motion.button
                            onClick={() => handlePersonToggle(person.id)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-400 bg-blue-600'
                                : 'border-gray-500'
                            }`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 bg-gray-900/50">
              {/* Validation */}
              {splitMode === 'custom' && Math.abs(totalWeight - 1) > 0.01 && selectedPeople.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-600/20 border border-yellow-500/30 rounded-xl">
                  <p className="text-yellow-400 text-sm flex items-center gap-2">
                    <span>⚠️</span>
                    Split percentages should add up to 100% (currently {(totalWeight * 100).toFixed(0)}%)
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <motion.button
                  onClick={handleClose}
                  className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-xl font-bold hover:bg-gray-800 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleAssign}
                  disabled={selectedPeople.length === 0 || (splitMode === 'custom' && Math.abs(totalWeight - 1) > 0.01)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    selectedPeople.length > 0 && (splitMode === 'equal' || Math.abs(totalWeight - 1) <= 0.01)
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                  whileHover={selectedPeople.length > 0 ? { scale: 1.02 } : {}}
                  whileTap={selectedPeople.length > 0 ? { scale: 0.98 } : {}}
                >
                  {selectedPeople.length === 0 
                    ? 'Select People First' 
                    : `Split with ${selectedPeople.length} ${selectedPeople.length === 1 ? 'Person' : 'People'}`
                  }
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}