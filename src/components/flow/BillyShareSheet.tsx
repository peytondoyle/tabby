import React from 'react'
import { motion } from 'framer-motion'
import { useFlowStore } from '@/lib/flowStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface BillyShareSheetProps {
  onNext?: () => void
  onPrev?: () => void
  isOpen?: boolean
  onClose?: () => void
  onDone?: () => void
  selectedItems?: string[]
  onAssignSelected?: (selectedItems: string[], personId?: string) => void
}

interface ReceiptLineItemProps {
  name: string
  price: number
  className?: string
}

const ReceiptLineItem: React.FC<ReceiptLineItemProps> = ({ name, price, className = '' }) => {
  return (
    <div className={`flex items-center justify-between gap-4 py-2 ${className}`}>
      <span className="flex-1 text-black">{name}</span>
      <div className="flex-1 border-b border-dotted border-gray-400 mx-2 min-w-[20px]" />
      <span className="font-mono text-black font-medium">${price.toFixed(2)}</span>
    </div>
  )
}

interface TotalLineProps {
  label: string
  amount: number
  isGrandTotal?: boolean
}

const TotalLine: React.FC<TotalLineProps> = ({ label, amount, isGrandTotal = false }) => {
  const className = isGrandTotal 
    ? "font-bold text-lg text-black border-t-2 border-black pt-3 mt-2"
    : "text-gray-700 text-sm"
    
  return (
    <div className={`flex justify-between items-center py-1 ${className}`}>
      <span>{label}</span>
      <span className="font-mono font-medium">${amount.toFixed(2)}</span>
    </div>
  )
}

export const BillyShareSheet: React.FC<BillyShareSheetProps> = ({ onNext, onPrev }) => {
  const { items, people, getItemAssignments, getTotalForPerson } = useFlowStore()
  
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const taxRate = 0.08875 // NY tax rate as example
  const tipRate = 0.18 // 18% tip as example
  const tax = subtotal * taxRate
  const tip = subtotal * tipRate
  const total = subtotal + tax + tip

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">🧾</div>
        <h2 className="text-2xl font-bold text-[var(--ui-text)] mb-2">Receipt Ready</h2>
        <p className="text-[var(--ui-text-dim)]">
          Review your bill split and share the receipt
        </p>
      </motion.div>

      {/* Receipt Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card className="p-8 bg-white text-black shadow-xl max-w-md mx-auto" style={{ fontFamily: 'monospace' }}>
          {/* Receipt Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-black">
            <h3 className="text-2xl font-bold mb-2">TABBY RECEIPT</h3>
            <p className="text-gray-600 text-sm">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })} • {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          {/* Items Section */}
          <div className="mb-8">
            <h4 className="font-bold text-black mb-4 text-center text-sm tracking-wide">
              ═══ ITEMS ═══
            </h4>
            <div className="space-y-1">
              {items.map((item) => {
                const assignments = getItemAssignments(item.id)
                const assigneeNames = assignments
                  .map(personId => people.find(p => p.id === personId)?.name)
                  .filter(Boolean)
                  .join(', ')
                
                return (
                  <div key={item.id} className="space-y-1">
                    <ReceiptLineItem
                      name={`${item.emoji} ${item.label}`}
                      price={item.price}
                    />
                    {assigneeNames && (
                      <div className="text-xs text-gray-500 ml-4 italic">
                        → {assigneeNames}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* People Section */}
          <div className="mb-8 border-t border-dashed border-gray-400 pt-6">
            <h4 className="font-bold text-black mb-4 text-center text-sm tracking-wide">
              ═══ SPLIT BY PERSON ═══
            </h4>
            <div className="space-y-3">
              {people.map((person) => {
                const personTotal = getTotalForPerson(person.id)
                const personTax = personTotal * (tax / subtotal)
                const personTip = personTotal * (tip / subtotal)
                const personGrandTotal = personTotal + personTax + personTip
                
                return (
                  <div key={person.id} className="bg-gray-50 p-3 rounded border">
                    <ReceiptLineItem
                      name={`${person.name.charAt(0).toUpperCase()}. ${person.name}`}
                      price={personGrandTotal}
                      className="font-bold"
                    />
                    {person.venmo_handle && (
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        💳 Venmo: @{person.venmo_handle}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Totals Section */}
          <div className="border-t-2 border-black pt-4">
            <div className="space-y-2">
              <TotalLine label="SUBTOTAL" amount={subtotal} />
              <TotalLine label="TAX (8.875%)" amount={tax} />
              <TotalLine label="TIP (18%)" amount={tip} />
              <TotalLine label="TOTAL" amount={total} isGrandTotal />
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="text-center mt-8 pt-6 border-t border-dashed border-gray-400">
            <p className="text-xs text-gray-600 mb-2 tracking-wide">
              ═══════════════════════
            </p>
            <p className="text-xs text-gray-500 mb-1">
              SPLIT WITH TABBY
            </p>
            <p className="text-xs text-gray-400">
              tabby.app • Thank you!
            </p>
            <p className="text-xs text-gray-600 mt-2 tracking-wide">
              ═══════════════════════
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Share Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <Card className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-[var(--ui-text)] mb-2">
              Share Receipt
            </h3>
            <p className="text-[var(--ui-text-dim)] text-sm">
              Send this receipt to everyone or individual payment requests
            </p>
          </div>
          
          <div className="space-y-3">
            <Button
              full
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16,6 12,2 8,6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              }
            >
              Share Receipt
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                }
              >
                Send Requests
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                leftIcon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                }
              >
                Copy Link
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-4">
        <Button
          variant="secondary"
          onClick={onPrev}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          }
        >
          Back
        </Button>
        
        <Button
          onClick={onNext}
          full
          rightIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          }
        >
          Finish & Share
        </Button>
      </div>
    </div>
  )
}