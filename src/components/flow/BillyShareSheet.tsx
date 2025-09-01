import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFlowStore } from '@/lib/flowStore'
import { ShareGraphics } from '@/components/ShareGraphics'

interface BillyShareSheetProps {
  isOpen: boolean
  onClose: () => void
  onDone: () => void
}

export const BillyShareSheet: React.FC<BillyShareSheetProps> = ({ isOpen, onClose }) => {
  const { 
    people, 
    items, 
    bill,
    computeBillTotals,
    getItemAssignments
  } = useFlowStore()
  
  const [showGraphics, setShowGraphics] = useState(false)
  const { personTotals, billTotal } = computeBillTotals()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price)
  }

  const getPersonItems = (personId: string) => {
    return items.filter(item => {
      const assignments = getItemAssignments(item.id)
      return assignments.includes(personId)
    })
  }

  const generateShareText = () => {
    const billName = bill?.title || 'Bill'
    const date = bill?.date ? new Date(bill.date).toLocaleDateString() : 'Today'
    
    let text = `🧾 ${billName}\n`
    text += `📅 ${date}\n`
    text += `💰 Total: ${formatPrice(billTotal)}\n\n`
    
    personTotals.forEach(personTotal => {
      const person = people.find(p => p.id === personTotal.personId)
      if (person) {
        text += `${person.name}: ${formatPrice(personTotal.total)}\n`
        const personItems = getPersonItems(person.id)
        personItems.forEach(item => {
          const assignments = getItemAssignments(item.id)
          const splitCount = assignments.length
          const itemShare = item.price / splitCount
          text += `  • ${item.emoji || '🍽️'} ${item.label}: ${formatPrice(itemShare)}`
          if (splitCount > 1) text += ` (1/${splitCount} split)`
          text += '\n'
        })
        text += '\n'
      }
    })
    
    return text
  }

  const handleShare = async () => {
    const shareText = generateShareText()
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: bill?.title || 'Split Bill',
          text: shareText
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err)
          navigator.clipboard.writeText(shareText)
          alert('Copied to clipboard!')
        }
      }
    } else {
      navigator.clipboard.writeText(shareText)
      alert('Copied to clipboard!')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-surface-elevated rounded-t-xl z-50 max-h-[90vh] overflow-hidden border-t border-border shadow-xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-border rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-6 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-primary">Share Receipt</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-surface rounded-lg transition-colors text-text-secondary hover:text-text-primary"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
              {/* Success Message */}
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-bold mb-2 text-text-primary">Your bill has been split!</h3>
                <p className="text-text-secondary">Ready to share with your group</p>
              </div>

              {/* Bill Summary */}
              <div className="bg-surface rounded-lg p-4 mb-8 border border-border">
                <div className="text-center mb-4">
                  <h4 className="text-lg font-bold text-text-primary">{bill?.title || 'Bill'}</h4>
                  <p className="text-sm text-text-secondary">{bill?.place || 'Restaurant'}</p>
                </div>
                
                {/* Person breakdown */}
                <div className="space-y-3">
                  {personTotals.map(personTotal => {
                    const person = people.find(p => p.id === personTotal.personId)
                    if (!person) return null
                    
                    return (
                      <div key={person.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-sm font-bold text-primary">
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-text-primary">{person.name}</span>
                        </div>
                        <span className="font-semibold text-lg text-text-primary">{formatPrice(personTotal.total)}</span>
                      </div>
                    )
                  })}
                </div>
                
                <div className="border-t border-border mt-4 pt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold text-text-primary">Total</span>
                    <span className="font-bold text-lg text-text-primary">{formatPrice(billTotal)}</span>
                  </div>
                </div>
              </div>
              
              {/* Share buttons */}
              <div className="space-y-3 mb-8">
                <button
                  onClick={handleShare}
                  className="w-full py-4 bg-primary hover:bg-primary-hover text-text-inverse rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span>Share Receipt</span>
                </button>
                
                <button
                  onClick={() => setShowGraphics(true)}
                  className="w-full py-4 bg-surface border border-border text-text-primary rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:bg-surface-elevated"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Share Graphic</span>
                </button>
              </div>

              {/* Individual share options */}
              <div className="text-center">
                <p className="text-sm text-text-secondary mb-4">or share individually:</p>
                <div className="flex justify-center gap-6">
                  {personTotals.map(personTotal => {
                    const person = people.find(p => p.id === personTotal.personId)
                    if (!person) return null
                    
                    return (
                      <div key={person.id} className="text-center">
                        <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-sm font-bold text-primary">
                            {person.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary">{person.name}</p>
                        <p className="text-sm font-semibold text-text-primary">{formatPrice(personTotal.total)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}

      <ShareGraphics
        isOpen={showGraphics}
        onClose={() => setShowGraphics(false)}
      />
    </AnimatePresence>
  )
}