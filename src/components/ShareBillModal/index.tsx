import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ShareBillModalProps {
  isOpen: boolean
  onClose: () => void
  bill: any
  items: any[]
  shares: any[]
  people: any[]
  billTotals: any
}

export const ShareBillModal: React.FC<ShareBillModalProps> = ({
  isOpen,
  onClose,
  bill,
  items,
  shares,
  people,
  billTotals
}) => {
  const [currentView, setCurrentView] = useState(0)
  
  const getPersonItems = (personId: string) => {
    const personShares = shares.filter(s => s.person_id === personId)
    return personShares.map(share => {
      const item = items.find(i => i.id === share.item_id)
      return item ? { ...item, share } : null
    }).filter(Boolean)
  }

  const getPersonTotal = (personId: string) => {
    if (!billTotals) return null
    return billTotals.person_totals.find((pt: any) => pt.person_id === personId)
  }

  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const salesTax = bill?.sales_tax || 5.16
  const tip = bill?.tip || 13.06
  const total = subtotal + salesTax + tip

  const views = [
    // View 1: Detailed breakdown by person
    () => (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-center">Share Bill</h2>
        
        <div className="bg-gray-50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-center mb-1">Billy's Cafe</h3>
          <p className="text-sm text-gray-500 text-center mb-4">Goodfood, USA • Aug 24, 2025</p>
          
          {people.map(person => {
            const personItems = getPersonItems(person.id)
            const personTotal = getPersonTotal(person.id)
            
            return (
              <div key={person.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span>👤</span>
                  </div>
                  <span className="font-semibold">{person.name}</span>
                </div>
                
                <div className="space-y-2 pl-10">
                  {personItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{item.emoji}</span>
                        <span>{item.label}</span>
                      </div>
                      <span>${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                  
                  {personTotal && (
                    <div className="pt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span>${personTotal.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax:</span>
                        <span>${personTotal.tax_share.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tip:</span>
                        <span>${personTotal.tip_share.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1 border-t">
                        <span>Total:</span>
                        <span>${personTotal.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span>SALES TAX:</span>
              <span>${salesTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Tip:</span>
              <span>${tip.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Bill Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">🍴 Split with Billy</p>
          </div>
        </div>
        
        <p className="text-center text-gray-400 text-sm">Split by Person</p>
      </div>
    ),
    
    // View 2: Summary totals
    () => (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-center">Share Bill</h2>
        
        <div className="bg-gray-50 rounded-2xl p-6">
          <h3 className="text-2xl font-bold text-center mb-2">Billy's Cafe</h3>
          <p className="text-gray-500 text-center mb-6">Goodfood, USA • Aug 24, 2025</p>
          
          <div className="space-y-4">
            {people.map(person => {
              const personTotal = getPersonTotal(person.id)
              
              return (
                <div key={person.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-lg">👤</span>
                    </div>
                    <span className="font-semibold text-lg">{person.name}</span>
                  </div>
                  <span className="text-lg font-bold">
                    ${personTotal ? personTotal.total.toFixed(2) : '0.00'}
                  </span>
                </div>
              )
            })}
          </div>
          
          <div className="border-t mt-6 pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span>Bill Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">🍴 Split with Billy</p>
          </div>
        </div>
        
        <p className="text-center text-gray-400 text-sm">Split Totals</p>
      </div>
    )
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-end p-4">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {views[currentView]()}
              
              {/* Page Indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {views.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentView(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      currentView === index ? 'bg-gray-800' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* Share Receipt Button */}
            <div className="p-4 border-t">
              <button
                onClick={() => {
                  // TODO: Implement share functionality
                  console.log('Sharing receipt...')
                }}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
                </svg>
                Share Receipt
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}