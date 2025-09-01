import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share, Download, Printer } from 'lucide-react'

interface TotalsPanelProps {
  billId?: string
}

type SplitOption = 'even' | 'proportional'

interface CoupleMode {
  id: string
  name: string
  active: boolean
}

export const TotalsPanel: React.FC<TotalsPanelProps> = ({ billId: _billId }) => {
  const [taxSplit, setTaxSplit] = useState<SplitOption>('even')
  const [tipSplit, setTipSplit] = useState<SplitOption>('proportional')
  const [includeZeroItems, setIncludeZeroItems] = useState(false)
  const [coupleMode, setCoupleMode] = useState<CoupleMode[]>([
    { id: '1', name: 'Alex & Sam', active: false },
    { id: '2', name: 'Jordan & Taylor', active: false },
    { id: '3', name: 'Casey & Morgan', active: false }
  ])
  
  // Mock totals data - in real app, this would come from props or context
  const [totals, setTotals] = useState({
    subtotal: 45.67,
    tax: 3.65,
    tip: 9.13,
    total: 58.45
  })
  
  const [showPennyFix, setShowPennyFix] = useState(false)
  
  // Simulate totals updates (in real app, this would be triggered by item assignments)
  useEffect(() => {
    const interval = setInterval(() => {
      setTotals(prev => ({
        ...prev,
        total: prev.total + (Math.random() - 0.5) * 0.02
      }))
      setShowPennyFix(true)
      setTimeout(() => setShowPennyFix(false), 2000)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
      >
        <h3 className="text-lg font-semibold text-text-primary">📊 Bill Summary</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Subtotal</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={totals.subtotal}
                className="font-mono text-sm text-text-primary"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.1 }}
              >
                ${totals.subtotal.toFixed(2)}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Tax</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={totals.tax}
                className="font-mono text-sm text-text-primary"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.1 }}
              >
                ${totals.tax.toFixed(2)}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Tip</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={totals.tip}
                className="font-mono text-sm text-text-primary"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.1 }}
              >
                ${totals.tip.toFixed(2)}
              </motion.span>
            </AnimatePresence>
          </div>
          
          <div className="border-t border-border pt-2">
            <div className="flex justify-between items-center">
              <span className="text-text-primary font-medium">Grand Total</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={totals.total}
                  className="font-mono text-xl font-bold text-text-primary"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.1 }}
                >
                  ${totals.total.toFixed(2)}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          {/* Penny Fix Badge */}
          <AnimatePresence>
            {showPennyFix && (
              <motion.div 
                className="inline-flex items-center px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                ✨ Penny fix applied
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
