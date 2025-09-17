import React from 'react'
import { motion } from 'framer-motion'

interface BillSummaryData {
  subtotal: number
  tax: number
  tip: number
  total: number
  itemCount: number
  peopleCount: number
}

interface BillSummaryToggleProps {
  viewMode: 'assignment' | 'summary'
  onToggle: (mode: 'assignment' | 'summary') => void
  billData: BillSummaryData
  restaurant?: string
  location?: string
  date?: string
}

export const BillSummaryToggle: React.FC<BillSummaryToggleProps> = ({
  viewMode,
  onToggle,
  billData,
  restaurant,
  location,
  date
}) => {
  return (
    <div className="space-y-6">
      {/* Toggle Controls */}
      <div className="flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-1 flex">
          <motion.button
            onClick={() => onToggle('assignment')}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              viewMode === 'assignment'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-xl">🎯</span>
            Assignment
          </motion.button>
          <motion.button
            onClick={() => onToggle('summary')}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              viewMode === 'summary'
                ? 'bg-green-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-xl">📊</span>
            Summary
          </motion.button>
        </div>
      </div>

      {/* Summary View */}
      {viewMode === 'summary' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-6 border-2"
          style={{background: 'var(--ui-panel)', borderRadius: 'var(--ui-radius)', border: '2px solid var(--ui-border)'}}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              🧾 {restaurant || 'Receipt Summary'}
            </h2>
            {location && (
              <p className="text-gray-400 text-sm">📍 {location}</p>
            )}
            {date && (
              <p className="text-gray-400 text-xs">📅 {new Date(date).toLocaleDateString()}</p>
            )}
          </div>

          {/* Bill Breakdown */}
          <div className="bg-gray-800 rounded-2xl p-6 space-y-4">
            {/* Items Summary */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
              <span className="text-gray-300 flex items-center gap-2">
                <span className="text-xl">🍽️</span>
                Items ({billData.itemCount})
              </span>
              <span className="text-white font-mono font-semibold" style={{fontVariantNumeric: 'tabular-nums'}}>
                ${billData.subtotal.toFixed(2)}
              </span>
            </div>

            {/* Tax */}
            <div className="flex justify-between items-center">
              <span className="text-gray-300 flex items-center gap-2">
                <span className="text-xl">📊</span>
                Tax
              </span>
              <span className="text-white font-mono font-semibold" style={{fontVariantNumeric: 'tabular-nums'}}>
                ${billData.tax.toFixed(2)}
              </span>
            </div>

            {/* Tip */}
            {billData.tip > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-300 flex items-center gap-2">
                  <span className="text-xl">💡</span>
                  Tip
                </span>
                <span className="text-white font-mono font-semibold" style={{fontVariantNumeric: 'tabular-nums'}}>
                  ${billData.tip.toFixed(2)}
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="border-t-2 border-gray-600 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  Total
                </span>
                <span className="text-2xl font-bold font-mono text-green-400" style={{fontVariantNumeric: 'tabular-nums'}}>
                  ${billData.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* People Count */}
            <div className="text-center pt-4 border-t border-gray-700">
              <span className="text-gray-400 text-sm flex items-center justify-center gap-2">
                <span className="text-lg">👥</span>
                Split between {billData.peopleCount} people
              </span>
              <span className="text-lg font-bold text-blue-400 mt-1">
                ~<span style={{fontVariantNumeric: 'tabular-nums'}}>${(billData.total / billData.peopleCount).toFixed(2)}</span> per person
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}