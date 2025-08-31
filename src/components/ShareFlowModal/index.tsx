import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Person {
  id: string
  name: string
  avatar?: string
  total: number
  items: Array<{
    label: string
    price: number
    emoji: string
    weight?: number
  }>
}

interface BillData {
  title: string
  location?: string
  date: string
  subtotal: number
  tax: number
  tip: number
  total: number
}

interface ShareFlowModalProps {
  isOpen: boolean
  onClose: () => void
  people: Person[]
  billData: BillData
  onShareGroup: () => void
  onShareIndividual: (personId: string) => void
  onExportGroup: () => void
  onExportIndividual: (personId: string) => void
}

export const ShareFlowModal: React.FC<ShareFlowModalProps> = ({
  isOpen,
  onClose,
  people,
  billData,
  onShareGroup,
  onShareIndividual,
  onExportGroup,
  onExportIndividual
}) => {
  const [shareMode, setShareMode] = useState<'group' | 'individual'>('group')
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)

  const handleNativeShare = async (data: { title: string, text: string, url?: string }) => {
    if (navigator.share) {
      try {
        await navigator.share(data)
      } catch (err) {
        // User cancelled share or error occurred
        console.log('Share cancelled or failed:', err)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard?.writeText(`${data.title}\n\n${data.text}`)
      alert('Share link copied to clipboard!')
    }
  }

  const handleGroupShare = async () => {
    const shareText = `💰 ${billData.title} Bill Split
📍 ${billData.location || 'Restaurant'}
📅 ${new Date(billData.date).toLocaleDateString()}

👥 ${people.length} people • $${billData.total.toFixed(2)} total

Split breakdown:
${people.map(p => `• ${p.name}: $${p.total.toFixed(2)}`).join('\n')}

Split with Tabby! 🐱`

    await handleNativeShare({
      title: `${billData.title} - Bill Split`,
      text: shareText
    })
    
    onShareGroup()
  }

  const handleIndividualShare = async (person: Person) => {
    const shareText = `💰 Your share from ${billData.title}
📍 ${billData.location || 'Restaurant'}
📅 ${new Date(billData.date).toLocaleDateString()}

${person.name}'s items:
${person.items.map(item => `• ${item.emoji} ${item.label} - $${(item.price * (item.weight || 1)).toFixed(2)}`).join('\n')}

Your total: $${person.total.toFixed(2)}

Split with Tabby! 🐱`

    await handleNativeShare({
      title: `Your bill from ${billData.title}`,
      text: shareText
    })
    
    onShareIndividual(person.id)
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
            className="bg-gray-900 text-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    🚀 Share Bill Split
                  </h2>
                  <p className="text-gray-300 text-sm mt-1">
                    {billData.title} • ${billData.total.toFixed(2)}
                  </p>
                </div>
                
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
            </div>

            {/* Share Mode Toggle */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex bg-gray-800 rounded-xl p-1">
                <motion.button
                  onClick={() => setShareMode('group')}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                    shareMode === 'group'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-xl">👥</span>
                  Share with Group
                </motion.button>
                <motion.button
                  onClick={() => setShareMode('individual')}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                    shareMode === 'individual'
                      ? 'bg-pink-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-xl">👤</span>
                  Share Individually
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[50vh] overflow-y-auto">
              {shareMode === 'group' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Group Summary */}
                  <div className="bg-gray-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <span className="text-xl">📊</span>
                      Group Summary
                    </h3>
                    
                    <div className="space-y-3">
                      {people.map((person, index) => (
                        <motion.div
                          key={person.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {person.avatar ? (
                                <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                person.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="font-medium">{person.name}</span>
                          </div>
                          <span className="font-bold text-green-400">
                            ${person.total.toFixed(2)}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    <div className="border-t border-gray-700 mt-4 pt-4 flex justify-between items-center">
                      <span className="font-bold">Total</span>
                      <span className="font-bold text-xl text-blue-400">
                        ${billData.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Group Share Options */}
                  <div className="space-y-3">
                    <motion.button
                      onClick={handleGroupShare}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      Share Group Summary
                    </motion.button>

                    <motion.button
                      onClick={onExportGroup}
                      className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-3"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Group Receipt
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {shareMode === 'individual' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="text-xl">👤</span>
                    Select Person to Share
                  </h3>

                  {people.map((person, index) => (
                    <motion.div
                      key={person.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`bg-gray-800 rounded-2xl p-4 border-2 transition-all cursor-pointer ${
                        selectedPerson === person.id
                          ? 'border-pink-500 bg-pink-600/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                      onClick={() => setSelectedPerson(person.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {person.avatar ? (
                              <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              person.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold">{person.name}</h4>
                            <p className="text-gray-400 text-sm">
                              {person.items.length} item{person.items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold text-green-400">
                            ${person.total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {selectedPerson === person.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 pt-4 border-t border-gray-700 space-y-2"
                        >
                          <div className="flex gap-2">
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleIndividualShare(person)
                              }}
                              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                              </svg>
                              Share
                            </motion.button>
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation()
                                onExportIndividual(person.id)
                              }}
                              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Export
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 bg-gray-900/50">
              <motion.button
                onClick={onClose}
                className="w-full py-3 border border-gray-700 text-gray-400 rounded-xl font-bold hover:bg-gray-800 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}