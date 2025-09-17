import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share, Download, Printer } from '@/lib/icons'
import { useReducedMotion } from '@/lib/accessibility'

interface PersonTotal {
  personId: string
  name: string
  total: number
}

interface TotalsPanelProps {
  billId?: string
  subtotal: number
  tax: number
  tip: number
  total: number
  personTotals: PersonTotal[]
  distributed: number
}

type SplitOption = 'even' | 'proportional'

interface CoupleMode {
  id: string
  name: string
  active: boolean
}

export const TotalsPanel: React.FC<TotalsPanelProps> = ({ 
  billId: _billId, 
  subtotal, 
  tax, 
  tip, 
  total, 
  personTotals, 
  distributed 
}) => {
  const prefersReducedMotion = useReducedMotion()
  
  const [taxSplit, setTaxSplit] = useState<SplitOption>('even')
  const [tipSplit, setTipSplit] = useState<SplitOption>('proportional')
  const [includeZeroItems, setIncludeZeroItems] = useState(false)
  const [coupleMode, setCoupleMode] = useState<CoupleMode[]>([
    { id: '1', name: 'Alex & Sam', active: false },
    { id: '2', name: 'Jordan & Taylor', active: false },
    { id: '3', name: 'Casey & Morgan', active: false }
  ])
  
  // Dev-only validation: check if person totals sum matches grand total
  useEffect(() => {
    if (import.meta.env.DEV) {
      const personTotalsSum = personTotals.reduce((sum, person) => sum + person.total, 0)
      const difference = Math.abs(personTotalsSum - total)
      
      if (difference > 0.01) { // Allow for small floating point differences
        console.warn(
          `[TotalsPanel] Person totals don't match grand total:\n` +
          `  Person totals sum: $${personTotalsSum.toFixed(2)}\n` +
          `  Grand total: $${total.toFixed(2)}\n` +
          `  Difference: $${difference.toFixed(2)}\n` +
          `  This may indicate a calculation error in the totals computation.`
        )
      }
    }
  }, [personTotals, total])
  
  // Show penny fix only when distributed amount is non-zero
  const showPennyFix = distributed !== 0

  const toggleCouple = (id: string) => {
    setCoupleMode(prev => 
      prev.map(couple => 
        couple.id === id ? { ...couple, active: !couple.active } : couple
      )
    )
  }

  return (
    <div className="sticky bottom-0 z-50 bg-surface/90 backdrop-blur border-t border-border p-4 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-xl font-semibold text-text-primary mb-2">💰 Split Options</h2>
        <p className="text-sm text-text-secondary">Configure how to split taxes, tips, and totals</p>
      </motion.div>

      {/* Split Options Section */}
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Tax Split */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-text-secondary">Tax Split</label>
          <div className="rounded-full bg-background p-1 flex">
            <motion.button
              onClick={() => setTaxSplit('even')}
              className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-full transition-all ${
                taxSplit === 'even' 
                  ? 'bg-surface text-text-primary' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              Even
            </motion.button>
            <motion.button
              onClick={() => setTaxSplit('proportional')}
              className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-full transition-all ${
                taxSplit === 'proportional' 
                  ? 'bg-surface text-text-primary' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              Proportional
            </motion.button>
          </div>
        </div>

        {/* Tip Split */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-text-secondary">Tip Split</label>
          <div className="rounded-full bg-background p-1 flex">
            <motion.button
              onClick={() => setTipSplit('even')}
              className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-full transition-all ${
                tipSplit === 'even' 
                  ? 'bg-surface text-text-primary' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              Even
            </motion.button>
            <motion.button
              onClick={() => setTipSplit('proportional')}
              className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-full transition-all ${
                tipSplit === 'proportional' 
                  ? 'bg-surface text-text-primary' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              Proportional
            </motion.button>
          </div>
        </div>

        {/* Include Zero Items Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">
            Include people with 0 items
          </label>
          <motion.button
            onClick={() => setIncludeZeroItems(!includeZeroItems)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              includeZeroItems ? 'bg-primary' : 'bg-border'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              className="inline-block h-4 w-4 rounded-full bg-white"
              animate={{ x: includeZeroItems ? 20 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>

        {/* Couple Mode */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-text-secondary">Couple mode</label>
          <div className="flex flex-wrap gap-2">
            {coupleMode.map(couple => (
              <motion.button
                key={couple.id}
                onClick={() => toggleCouple(couple.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  couple.active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-transparent text-text-secondary border-border hover:border-text-secondary'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {couple.name}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Bill Summary Section */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        aria-live="polite"
        role="status"
      >
        <h3 className="text-lg font-semibold text-text-primary">📊 Bill Summary</h3>
        
        {/* Screen reader announcement for totals updates */}
        <div className="sr-only" aria-live="polite">
          Subtotal: ${subtotal.toFixed(2)}, Tax: ${tax.toFixed(2)}, Tip: ${tip.toFixed(2)}, Total: ${total.toFixed(2)}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Subtotal</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={subtotal}
                className="font-mono text-sm text-text-primary"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.1 }}
              >
                ${subtotal.toFixed(2)}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Tax</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={tax}
                className="font-mono text-sm text-text-primary"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.1 }}
              >
                ${tax.toFixed(2)}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Tip</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={tip}
                className="font-mono text-sm text-text-primary"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.1 }}
              >
                ${tip.toFixed(2)}
              </motion.span>
            </AnimatePresence>
          </div>
          
          <div className="border-t border-border pt-2">
            <div className="flex justify-between items-center">
              <span className="text-text-primary font-medium">Grand Total</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={total}
                  className="font-mono text-xl font-bold text-text-primary"
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.1 }}
                >
                  ${total.toFixed(2)}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          {/* Exact-sum adjustment badge */}
          <AnimatePresence>
            {showPennyFix && (
              <motion.div 
                className="inline-flex items-center px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                ✨ Exact-sum adjustment: ${distributed.toFixed(2)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Share / Export Section */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-text-primary">📤 Share & Export</h3>
        
        <div className="space-y-3">
          <motion.button 
            className="w-full bg-primary text-white py-3 px-4 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-pop"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Share className="w-4 h-4" />
            Share Bill
          </motion.button>
          
          <div className="flex gap-3">
            <motion.button 
              className="flex-1 bg-background border border-border text-text-primary py-2 px-3 rounded-lg text-sm font-medium hover:bg-surface transition-colors flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="w-4 h-4" />
              Save PNG
            </motion.button>
            <motion.button 
              className="flex-1 bg-background border border-border text-text-primary py-2 px-3 rounded-lg text-sm font-medium hover:bg-surface transition-colors flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Printer className="w-4 h-4" />
              Print PDF
            </motion.button>
          </div>
        </div>

        {/* Watermark Preview */}
        <motion.div 
          className="text-center pt-4 border-t border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-xs text-text-secondary">
            Split with Tabby
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
