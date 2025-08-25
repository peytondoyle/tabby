import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CompactTotalsProps {
  billId?: string
}

type SplitOption = 'even' | 'proportional'

export const CompactTotals: React.FC<CompactTotalsProps> = ({ billId: _billId }) => {
  const [taxSplit, setTaxSplit] = useState<SplitOption>('even')
  const [tipSplit, setTipSplit] = useState<SplitOption>('proportional')
  
  // Mock totals data - in real app, this would come from props or context
  const totals = {
    subtotal: 45.67,
    tax: 3.65,
    tip: 9.13,
    total: 58.45
  }

  return (
    <div className="sticky bottom-0 z-50 bg-card/95 backdrop-blur border-t border-line">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Split Controls */}
          <div className="flex items-center gap-4">
            {/* Tax Split */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-dim font-medium">Tax:</span>
              <div className="rounded-full bg-paper p-1 flex">
                <motion.button
                  onClick={() => setTaxSplit('even')}
                  className={`px-3 py-2.5 text-xs font-medium rounded-full transition-all ${
                    taxSplit === 'even' 
                      ? 'bg-brand text-white shadow-soft' 
                      : 'text-ink-dim hover:text-ink'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Even
                </motion.button>
                <motion.button
                  onClick={() => setTaxSplit('proportional')}
                  className={`px-3 py-2.5 text-xs font-medium rounded-full transition-all ${
                    taxSplit === 'proportional' 
                      ? 'bg-brand text-white shadow-soft' 
                      : 'text-ink-dim hover:text-ink'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Prop
                </motion.button>
              </div>
            </div>

            {/* Tip Split */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-dim font-medium">Tip:</span>
              <div className="rounded-full bg-paper p-1 flex">
                <motion.button
                  onClick={() => setTipSplit('even')}
                  className={`px-3 py-2.5 text-xs font-medium rounded-full transition-all ${
                    tipSplit === 'even' 
                      ? 'bg-brand text-white shadow-soft' 
                      : 'text-ink-dim hover:text-ink'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Even
                </motion.button>
                <motion.button
                  onClick={() => setTipSplit('proportional')}
                  className={`px-3 py-2.5 text-xs font-medium rounded-full transition-all ${
                    tipSplit === 'proportional' 
                      ? 'bg-brand text-white shadow-soft' 
                      : 'text-ink-dim hover:text-ink'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Prop
                </motion.button>
              </div>
            </div>
          </div>

          {/* Right: Totals */}
          <div className="flex items-center gap-6">
            {/* Subtotal, Tax, Tip */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-sm text-ink-dim">Subtotal</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={totals.subtotal}
                    className="currency text-sm text-ink"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.1 }}
                  >
                    ${totals.subtotal.toFixed(2)}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-ink-dim">Tax</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={totals.tax}
                    className="currency text-sm text-ink"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.1 }}
                  >
                    ${totals.tax.toFixed(2)}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-ink-dim">Tip</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={totals.tip}
                    className="currency text-sm text-ink"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.1 }}
                  >
                    ${totals.tip.toFixed(2)}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            {/* Grand Total */}
            <div className="flex items-center gap-2 border-l border-line pl-4">
              <span className="text-sm font-medium text-ink">Total</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={totals.total}
                  className="currency text-xl font-bold text-ink"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.1 }}
                >
                  ${totals.total.toFixed(2)}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
