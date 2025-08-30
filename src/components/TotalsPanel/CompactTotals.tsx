import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BillTotals } from '@/lib/computeTotals'

interface CompactTotalsProps {
  billTotals?: BillTotals | null
}

export const CompactTotals: React.FC<CompactTotalsProps> = ({ billTotals }) => {
  // Use calculated totals or defaults
  const totals = billTotals ? {
    subtotal: billTotals.subtotal,
    tax: billTotals.tax,
    tip: billTotals.tip,
    total: billTotals.grand_total
  } : {
    subtotal: 0,
    tax: 0,
    tip: 0,
    total: 0
  }
  
  const showPennyFix = billTotals?.penny_reconciliation.distributed !== 0

  return (
    <div className="sticky bottom-0 z-50 bg-card/95 backdrop-blur border-t border-line">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Totals Display */}
          <div className="flex items-center gap-6 w-full justify-between">
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
              
              {/* Penny Fix Indicator */}
              <AnimatePresence>
                {showPennyFix && (
                  <motion.div 
                    className="inline-flex items-center px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    ✨ Penny fix
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
