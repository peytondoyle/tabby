import React, { useRef } from 'react'
import { motion } from 'framer-motion'
import { useFlowStore } from '@/lib/flowStore'
import { PersonCard, GroupCard } from '@/components/ShareCards'
import { exportReceiptCard, exportGroupReceipt } from '@/lib/exportUtils'
import { Button } from "@/components/ui/Button";

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

  const getPersonItemsForExport = (personId: string) => {
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
        <h1 className="text-4xl font-bold mb-2 text-text-primary">Share Bill</h1>
        <p className="text-lg text-text-secondary">
          Export clean receipt cards
        </p>
      </motion.div>

      {/* People List */}
      <motion.div 
        className="bg-surface rounded-2xl border border-border p-6 mb-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-primary">
            {formatPrice(billTotal)}
          </div>
          <div className="text-sm text-text-secondary">
            Split between {people.length} people
          </div>
        </div>
        
        <div className="space-y-3">
          {personTotals.map((personTotal, _index) => {
            const person = people.find(p => p.id === personTotal.personId)
            if (!person) return null
            
            return (
              <div key={person.id} className="flex justify-between items-center py-3 px-4 bg-background rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center font-bold text-primary">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-lg text-text-primary">{person.name}</span>
                </div>
                <span className="font-bold text-xl text-text-primary">
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
        <motion.div className="flex-1">
          <Button
            onClick={handleGroupShare}
            size="lg"
            full
            className="h-16 text-lg"
          >
            👥 Share with Group
          </Button>
        </motion.div>

        <motion.div className="flex-1">
          <Button
            onClick={handleIndividualShare}
            size="lg"
            full
            className="h-16 text-lg"
          >
            📱 Share Individually
          </Button>
        </motion.div>
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
              ref={(el: HTMLDivElement | null) => { personCardsRef.current[person.id] = el }}
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
          onClick={onBack}
          full
        >
          ✅ Done
        </Button>
      </div>
    </div>
  )
}