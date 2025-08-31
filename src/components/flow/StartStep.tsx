import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ReceiptScanner } from '@/components/ReceiptScanner'
import { useFlowStore } from '@/lib/flowStore'

interface StartStepProps {
  onNext: () => void
}

export const StartStep: React.FC<StartStepProps> = ({ onNext }) => {
  const [showScanner, setShowScanner] = useState(false)
  const { bill, setBill, setItems } = useFlowStore()

  const handleScanComplete = (billToken: string, items?: any[]) => {
    // Update bill with scanned data
    if (billToken && bill) {
      setBill({ ...bill, token: billToken })
    }
    
    // Set items if provided
    if (items && items.length > 0) {
      const flowItems = items.map((item, index) => ({
        id: item.id || `item-${index}`,
        label: item.label || item.name || `Item ${index + 1}`,
        price: item.price || 0,
        quantity: item.quantity || 1,
        emoji: item.emoji || '🍽️'
      }))
      setItems(flowItems)
    }
    
    setShowScanner(false)
    onNext() // Move to review step after scanning
  }

  const handleManualStart = () => {
    // Skip scanning and go directly to people step
    onNext()
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero section */}
      <motion.div 
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-8xl mb-6">🧾</div>
        <h2 className="text-3xl font-bold mb-4">Split Your Bill</h2>
        <p className="text-lg text-ink-dim mb-8">
          Start by scanning your receipt or create a bill manually
        </p>
      </motion.div>

      {/* Action buttons */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Primary action - Scan Receipt */}
        <motion.button
          onClick={() => setShowScanner(true)}
          className="w-full flex items-center justify-center gap-3 px-8 py-6 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold text-lg shadow-lg transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          📷 Scan Receipt
        </motion.button>

        {/* Secondary action - Manual entry */}
        <motion.button
          onClick={handleManualStart}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-card hover:bg-card/80 border-2 border-line hover:border-brand/50 text-ink rounded-2xl font-bold transition-all"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Manual Bill
        </motion.button>
      </motion.div>

      {/* Features/benefits */}
      <motion.div 
        className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-center p-6 bg-card rounded-2xl border border-line">
          <div className="text-3xl mb-3">⚡</div>
          <h3 className="font-bold mb-2">Quick & Easy</h3>
          <p className="text-sm text-ink-dim">
            Scan receipts instantly or enter items manually
          </p>
        </div>
        
        <div className="text-center p-6 bg-card rounded-2xl border border-line">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="font-bold mb-2">Fair Splitting</h3>
          <p className="text-sm text-ink-dim">
            Assign items to people for accurate cost sharing
          </p>
        </div>
        
        <div className="text-center p-6 bg-card rounded-2xl border border-line">
          <div className="text-3xl mb-3">📱</div>
          <h3 className="font-bold mb-2">Easy Sharing</h3>
          <p className="text-sm text-ink-dim">
            Share payment links and summaries instantly
          </p>
        </div>
      </motion.div>

      {/* Receipt Scanner Modal */}
      <ReceiptScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onBillCreated={handleScanComplete}
      />
    </div>
  )
}