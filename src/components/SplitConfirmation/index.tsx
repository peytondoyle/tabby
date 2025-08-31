import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Person {
  id: string
  name: string
  avatar?: string
  total: number
  itemCount: number
}

interface SplitConfirmationProps {
  isOpen: boolean
  onClose: () => void
  people: Person[]
  billTotal: number
  onConfirmSplit: () => void
  onShare: () => void
  restaurant?: string
  location?: string
}

const ConfettiPiece: React.FC<{ delay: number }> = ({ delay }) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8E8']
  const color = colors[Math.floor(Math.random() * colors.length)]
  
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-full"
      style={{ backgroundColor: color }}
      initial={{ 
        x: Math.random() * window.innerWidth,
        y: -20,
        rotate: 0,
        opacity: 1
      }}
      animate={{
        y: window.innerHeight + 20,
        rotate: 360 * 3,
        opacity: 0
      }}
      transition={{
        duration: 3 + Math.random() * 2,
        delay: delay,
        ease: "easeIn"
      }}
    />
  )
}

const Confetti: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: 50 }).map((_, i) => (
        <ConfettiPiece key={i} delay={i * 0.1} />
      ))}
    </div>
  )
}

export const SplitConfirmation: React.FC<SplitConfirmationProps> = ({
  isOpen,
  onClose,
  people,
  billTotal,
  onConfirmSplit,
  onShare,
  restaurant,
  location
}) => {
  const [step, setStep] = useState<'preview' | 'confirming' | 'confirmed'>('preview')
  const [showConfetti, setShowConfetti] = useState(false)

  const totalAssigned = people.reduce((sum, person) => sum + person.total, 0)
  const isFullyAssigned = Math.abs(totalAssigned - billTotal) < 0.01

  const handleConfirmSplit = async () => {
    setStep('confirming')
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setStep('confirmed')
    setShowConfetti(true)
    onConfirmSplit()
    
    // Stop confetti after 3 seconds
    setTimeout(() => setShowConfetti(false), 3000)
  }

  useEffect(() => {
    if (isOpen) {
      setStep('preview')
      setShowConfetti(false)
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Confetti show={showConfetti} />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4"
            onClick={step === 'confirmed' ? onClose : undefined}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gray-900 text-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-green-600/20 to-blue-600/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      {step === 'confirmed' ? '🎉' : '📊'} 
                      {step === 'confirmed' ? 'Bill Split Complete!' : 'Confirm Split'}
                    </h2>
                    {restaurant && (
                      <p className="text-gray-300 text-sm mt-1">
                        {restaurant} {location && `• ${location}`}
                      </p>
                    )}
                  </div>
                  
                  {step !== 'confirming' && (
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
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {step === 'preview' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {/* Validation Warning */}
                    {!isFullyAssigned && (
                      <div className="mb-6 p-4 bg-yellow-600/20 border border-yellow-500/30 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">⚠️</span>
                          <div>
                            <p className="text-yellow-400 font-bold">Incomplete Assignment</p>
                            <p className="text-yellow-300 text-sm">
                              ${Math.abs(totalAssigned - billTotal).toFixed(2)} {totalAssigned > billTotal ? 'over-assigned' : 'unassigned'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* People Summary */}
                    <div className="space-y-4 mb-6">
                      {people.map((person, index) => (
                        <motion.div
                          key={person.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-gray-800 rounded-2xl p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {person.avatar ? (
                                <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                person.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold">{person.name}</h3>
                              <p className="text-gray-400 text-sm">
                                {person.itemCount} item{person.itemCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-green-400">
                              ${person.total.toFixed(2)}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Total Summary */}
                    <div className="bg-gray-800 rounded-2xl p-6 border-2 border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold">Total Bill</span>
                        <span className="text-3xl font-bold text-blue-400">
                          ${billTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'confirming' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-6"
                    />
                    <h3 className="text-2xl font-bold mb-2">Processing Split...</h3>
                    <p className="text-gray-400">Finalizing everyone's totals</p>
                  </motion.div>
                )}

                {step === 'confirmed' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      className="text-8xl mb-6"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, -10, 10, 0]
                      }}
                      transition={{ duration: 0.6 }}
                    >
                      🎉
                    </motion.div>
                    <h3 className="text-3xl font-bold mb-4">Bill Split Complete!</h3>
                    <p className="text-gray-300 mb-8">
                      Everyone's totals have been calculated and saved
                    </p>
                    
                    {/* Quick stats */}
                    <div className="bg-gray-800 rounded-2xl p-6 text-left">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">{people.length}</div>
                          <div className="text-gray-400 text-sm">People</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">${billTotal.toFixed(2)}</div>
                          <div className="text-gray-400 text-sm">Total Bill</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              {step !== 'confirming' && (
                <div className="p-6 border-t border-gray-800 bg-gray-900/50">
                  <div className="flex gap-3">
                    {step === 'preview' && (
                      <>
                        <motion.button
                          onClick={onClose}
                          className="flex-1 py-4 border border-gray-700 text-gray-400 rounded-xl font-bold hover:bg-gray-800 transition-all"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Back to Edit
                        </motion.button>
                        <motion.button
                          onClick={handleConfirmSplit}
                          disabled={!isFullyAssigned}
                          className={`flex-2 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                            isFullyAssigned
                              ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg'
                              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          }`}
                          whileHover={isFullyAssigned ? { scale: 1.02, y: -2 } : {}}
                          whileTap={isFullyAssigned ? { scale: 0.98 } : {}}
                        >
                          <span className="text-xl">✨</span>
                          Split Bill
                        </motion.button>
                      </>
                    )}
                    
                    {step === 'confirmed' && (
                      <>
                        <motion.button
                          onClick={onClose}
                          className="flex-1 py-4 border border-gray-700 text-gray-400 rounded-xl font-bold hover:bg-gray-800 transition-all"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Close
                        </motion.button>
                        <motion.button
                          onClick={onShare}
                          className="flex-2 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <span className="text-xl">🚀</span>
                          Share Results
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}