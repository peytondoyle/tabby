import React from 'react'
import { motion } from 'framer-motion'

interface ByPersonViewProps {
  items: any[]
  shares: any[]
  people: any[]
  billTotals: any
}

export const ByPersonView: React.FC<ByPersonViewProps> = ({
  items,
  shares,
  people,
  billTotals
}) => {
  // Group items by person
  const getPersonItems = (personId: string) => {
    const personShares = shares.filter(s => s.person_id === personId)
    return personShares.map(share => {
      const item = items.find(i => i.id === share.item_id)
      return item ? { ...item, share } : null
    }).filter(Boolean)
  }

  const getPersonTotal = (personId: string) => {
    if (!billTotals) return 0
    const personTotal = billTotals.person_totals.find((pt: any) => pt.person_id === personId)
    return personTotal ? personTotal.total : 0
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {people.map((person, index) => {
        const personItems = getPersonItems(person.id)
        const personTotal = getPersonTotal(person.id)
        
        return (
          <motion.div
            key={person.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-50 rounded-2xl p-4"
          >
            {/* Person Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-lg">👤</span>
                </div>
                <span className="font-semibold text-lg">{person.name}</span>
              </div>
              <span className="text-lg font-bold">${personTotal.toFixed(2)}</span>
            </div>

            {/* Person's Items */}
            <div className="space-y-2 pl-2">
              {personItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.emoji}</span>
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium">${item.price.toFixed(2)}</span>
                </div>
              ))}
              
              {personItems.length === 0 && (
                <div className="text-sm text-gray-400 italic py-2">No items assigned</div>
              )}
            </div>
          </motion.div>
        )
      })}
      </div>
    </motion.div>
  )
}