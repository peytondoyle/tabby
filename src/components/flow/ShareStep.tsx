import React, { useRef } from 'react'
import { motion } from 'framer-motion'
import { useFlowStore } from '@/lib/flowStore'
import { PersonCard, GroupCard } from '@/components/ShareCards'
import { exportReceiptCard, exportGroupReceipt } from '@/lib/exportUtils'

interface ShareStepProps {
  onPrev: () => void
  onBack: () => void
}

export const ShareStep: React.FC<ShareStepProps> = ({ onPrev, onBack }) => {
  const { 
    people, 
    items, 
    bill,
    computeBillTotals,
    getPersonItems: _getPersonItems,
    getItemAssignments
  } = useFlowStore()
  
  const groupCardRef = useRef<HTMLDivElement>(null)
  const personCardsRef = useRef<{ [personId: string]: HTMLDivElement | null }>({})

  const { personTotals, billTotal } = computeBillTotals()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const _getPersonItemsForExport = (personId: string) => {
    return items.filter(item => {
      const assignments = getItemAssignments(item.id)
      return assignments.includes(personId)
    })
  }

  const handleGroupShare = async () => {
    if (groupCardRef.current) {
      try {
        await exportGroupReceipt(
          groupCardRef.current,
          bill?.title || 'Group Receipt',
          'png'
        )
      } catch (error) {
        console.error('Export failed:', error)
        alert('Export failed. Please try again.')
      }
    }
  }

  const handleIndividualShare = async () => {
    // Export all person cards
    for (const person of people) {
      const cardElement = personCardsRef.current[person.id]
      if (cardElement) {
        try {
          await exportReceiptCard(
            cardElement,
            person.name,
            bill?.title || 'Receipt'
          )
        } catch (error) {
          console.error(`Export failed for ${person.name}:`, error)
        }
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-4xl font-bold mb-2">Share Bill</h1>
        <p className="text-lg text-ink-dim">
          Export clean receipt cards
        </p>
      </motion.div>

      {/* People List */}
      <motion.div 
        className="bg-card rounded-2xl border border-line p-6 mb-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-brand">
            {formatPrice(billTotal)}
          </div>
          <div className="text-sm text-ink-dim">
            Split between {people.length} people
          </div>
        </div>
        
        <div className="space-y-3">
          {personTotals.map((personTotal, _index) => {
            const person = people.find(p => p.id === personTotal.personId)
            if (!person) return null
            
            return (
              <div key={person.id} className="flex justify-between items-center py-3 px-4 bg-paper rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand/20 rounded-full flex items-center justify-center font-bold text-brand">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-lg">{person.name}</span>
                </div>
                <span className="font-bold text-xl">
                  {formatPrice(personTotal.total)}
                </span>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Share Buttons */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.button
          onClick={handleGroupShare}
          className="flex-1 flex items-center justify-center gap-3 px-8 py-6 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold text-lg shadow-lg transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          👥 Share with Group
        </motion.button>

        <motion.button
          onClick={handleIndividualShare}
          className="flex-1 flex items-center justify-center gap-3 px-8 py-6 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold text-lg shadow-lg transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          📱 Share Individually
        </motion.button>
      </motion.div>

      {/* Hidden Cards for Export */}
      <div className="sr-only">
        {/* Group Card */}
        <div ref={groupCardRef}>
          <GroupCard
            groups={personTotals.map(personTotal => {
              const person = people.find(p => p.id === personTotal.personId)!
              const personItems = getPersonItemsForExport(personTotal.personId)
              return {
                person,
                items: personItems,
                subtotal: personTotal.subtotal,
                taxShare: personTotal.taxShare,
                tipShare: personTotal.tipShare,
                total: personTotal.total
              }
            })}
            billTitle={bill?.title}
            billPlace={bill?.place}
            billDate={bill?.date}
            totalAmount={billTotal}
          />
        </div>

        {/* Individual Person Cards */}
        {personTotals.map((personTotal) => {
          const person = people.find(p => p.id === personTotal.personId)!
          const personItems = getPersonItemsForExport(personTotal.personId)
          
          return (
            <div 
              key={person.id} 
              ref={(el) => personCardsRef.current[person.id] = el}
            >
              <PersonCard
                name={person.name}
                items={personItems}
                subtotal={personTotal.subtotal}
                taxShare={personTotal.taxShare}
                tipShare={personTotal.tipShare}
                total={personTotal.total}
                billTitle={bill?.title}
                billPlace={bill?.place}
                billDate={bill?.date}
              />
            </div>
          )
        })}
      </div>

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
          onClick={onBack}
          className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all"
        >
          ✅ Done
        </button>
      </div>
    </div>
  )
}