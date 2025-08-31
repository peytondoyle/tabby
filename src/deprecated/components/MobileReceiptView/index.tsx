import React from 'react'
import { motion } from 'framer-motion'

interface MobileReceiptViewProps {
  items: any[]
  shares: any[]
  people: any[]
  subtotal: number
  salesTax: number
  tip: number
  total: number
}

export const MobileReceiptView: React.FC<MobileReceiptViewProps> = ({
  items,
  shares,
  people,
  subtotal,
  salesTax,
  tip,
  total
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full"
    >
      {/* Receipt Items */}
      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between py-3 hover:bg-gray-50 px-2 -mx-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-base font-medium">{item.label}</span>
            </div>
            <span className="text-base font-semibold">${item.price.toFixed(2)}</span>
          </motion.div>
        ))}
      </div>

      {/* Totals Section */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        <div className="flex justify-between text-base">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base">
          <span className="text-gray-600">SALES TAX:</span>
          <span className="font-medium">${salesTax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base">
          <span className="text-gray-600">Tip:</span>
          <span className="font-medium">${tip.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </motion.div>
  )
}