import React, { forwardRef } from 'react'
import { motion } from 'framer-motion'

interface PersonItem {
  id: string
  label: string
  price: number
  emoji: string
  weight?: number
  shareAmount: number
}

interface PersonReceiptCardProps {
  person: {
    id: string
    name: string
    avatar?: string
  }
  items: PersonItem[]
  billData: {
    title: string
    location?: string
    date: string
    tax: number
    tip: number
  }
  totals: {
    subtotal: number
    taxShare: number
    tipShare: number
    total: number
  }
  className?: string
  showHeader?: boolean
}

export const PersonReceiptCard = forwardRef<HTMLDivElement, PersonReceiptCardProps>(({
  person,
  items,
  billData,
  totals,
  className = '',
  showHeader = true
}, ref) => {
  return (
    <div 
      ref={ref}
      className={`bg-white text-gray-900 rounded-2xl shadow-2xl overflow-hidden max-w-md mx-auto ${className}`}
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header */}
      {showHeader && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3 backdrop-blur-sm">
              {person.avatar ? (
                <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                person.name.charAt(0).toUpperCase()
              )}
            </div>
            <h2 className="text-xl font-bold">{person.name}</h2>
          </div>
          
          <div className="text-sm opacity-90">
            <p className="font-semibold">{billData.title}</p>
            {billData.location && <p>{billData.location}</p>}
            <p>{new Date(billData.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="p-6">
        {/* Items Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <span className="text-lg">🍽️</span>
            Your Items
          </h3>
          <span className="text-sm text-gray-600">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Items */}
        <div className="space-y-3 mb-6">
          {items.map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xl">{item.emoji}</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{item.label}</span>
                  {item.weight && item.weight < 1 && (
                    <span className="text-xs text-blue-600 ml-2 bg-blue-100 px-2 py-1 rounded-full">
                      {Math.round(item.weight * 100)}% share
                    </span>
                  )}
                </div>
              </div>
              <span className="font-bold text-gray-900 tabular-nums">
                ${item.shareAmount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals Breakdown */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-gray-700">
            <span className="flex items-center gap-2">
              <span className="text-sm">💰</span>
              Subtotal
            </span>
            <span className="tabular-nums">${totals.subtotal.toFixed(2)}</span>
          </div>

          {totals.taxShare > 0 && (
            <div className="flex justify-between text-gray-700">
              <span className="flex items-center gap-2">
                <span className="text-sm">📊</span>
                Tax Share
              </span>
              <span className="tabular-nums">${totals.taxShare.toFixed(2)}</span>
            </div>
          )}

          {totals.tipShare > 0 && (
            <div className="flex justify-between text-gray-700">
              <span className="flex items-center gap-2">
                <span className="text-sm">💡</span>
                Tip Share
              </span>
              <span className="tabular-nums">${totals.tipShare.toFixed(2)}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-300">
            <span className="font-bold text-lg text-gray-800 flex items-center gap-2">
              <span className="text-lg">🎯</span>
              Your Total
            </span>
            <span className="font-bold text-2xl text-blue-600 tabular-nums">
              ${totals.total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* QR Code Placeholder / Payment Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-3 flex items-center justify-center">
            <span className="text-2xl">📱</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">
            Payment methods & QR codes
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Venmo • PayPal • Zelle
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
            <span className="text-lg">🐱</span>
            <span className="font-medium">Split with Tabby</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Generated on {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
})

PersonReceiptCard.displayName = 'PersonReceiptCard'

// Preview version for modals and screens
export const PersonReceiptCardPreview: React.FC<PersonReceiptCardProps & {
  onExport?: () => void
  onShare?: () => void
}> = ({ onExport, onShare, ...props }) => {
  return (
    <div className="space-y-4">
      <PersonReceiptCard {...props} />
      
      {(onExport || onShare) && (
        <div className="flex gap-3 justify-center">
          {onShare && (
            <motion.button
              onClick={onShare}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              Share
            </motion.button>
          )}
          
          {onExport && (
            <motion.button
              onClick={onExport}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-xl font-bold flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </motion.button>
          )}
        </div>
      )}
    </div>
  )
}