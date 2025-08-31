import React, { forwardRef } from 'react'
import { motion } from 'framer-motion'

interface PersonSummary {
  id: string
  name: string
  avatar?: string
  total: number
  itemCount: number
  items: Array<{
    id: string
    label: string
    price: number
    emoji: string
    weight?: number
    shareAmount: number
  }>
}

interface BillItem {
  id: string
  label: string
  price: number
  emoji: string
  quantity?: number
  assignedTo: string[]
}

interface GroupReceiptExportProps {
  billData: {
    title: string
    location?: string
    date: string
    subtotal: number
    tax: number
    tip: number
    total: number
  }
  people: PersonSummary[]
  allItems: BillItem[]
  className?: string
  showHeader?: boolean
}

export const GroupReceiptExport = forwardRef<HTMLDivElement, GroupReceiptExportProps>(({
  billData,
  people,
  allItems,
  className = '',
  showHeader = true
}, ref) => {
  return (
    <div 
      ref={ref}
      className={`bg-white text-gray-900 rounded-2xl shadow-2xl overflow-hidden max-w-2xl mx-auto ${className}`}
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header */}
      {showHeader && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4 backdrop-blur-sm">
              🧾
            </div>
            <h1 className="text-3xl font-bold mb-2">{billData.title}</h1>
            <p className="text-lg opacity-90">Group Bill Split</p>
          </div>
          
          <div className="text-sm opacity-90 space-y-1">
            {billData.location && <p className="flex items-center justify-center gap-2"><span>📍</span>{billData.location}</p>}
            <p className="flex items-center justify-center gap-2">
              <span>📅</span>
              {new Date(billData.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="flex items-center justify-center gap-2"><span>👥</span>{people.length} people</p>
          </div>
        </div>
      )}

      <div className="p-8">
        {/* Bill Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Bill Summary
          </h2>
          
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">${billData.subtotal.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Subtotal</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">${billData.tax.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Tax</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${billData.tip.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Tip</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">${billData.total.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* All Items */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            All Items ({allItems.length})
          </h2>
          
          <div className="space-y-2">
            {allItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{item.label}</span>
                    {item.quantity && item.quantity > 1 && (
                      <span className="text-sm text-gray-600 ml-2">×{item.quantity}</span>
                    )}
                  </div>
                  {item.assignedTo.length > 1 && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Split {item.assignedTo.length} ways
                    </span>
                  )}
                </div>
                <span className="font-bold text-gray-900 tabular-nums">${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* People Breakdown */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">👥</span>
            Individual Breakdown
          </h2>
          
          <div className="space-y-6">
            {people.map((person) => (
              <div key={person.id} className="bg-gray-50 rounded-xl p-6">
                {/* Person Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {person.avatar ? (
                      <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      person.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800">{person.name}</h3>
                    <p className="text-gray-600 text-sm">{person.itemCount} item{person.itemCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">${person.total.toFixed(2)}</div>
                  </div>
                </div>

                {/* Person's Items */}
                <div className="space-y-2">
                  {person.items.map((item, itemIndex) => (
                    <div key={`${person.id}-${item.id}-${itemIndex}`} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-lg">{item.emoji}</span>
                        <span className="font-medium text-gray-700">{item.label}</span>
                        {item.weight && item.weight < 1 && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                            {Math.round(item.weight * 100)}%
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-gray-900 tabular-nums">${item.shareAmount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">💳</span>
            Payment Summary
          </h2>
          
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
            <div className="space-y-3">
              {people.map((person) => (
                <div key={person.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {person.avatar ? (
                        <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        person.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-medium text-gray-800">{person.name}</span>
                  </div>
                  <span className="font-bold text-lg text-green-600">${person.total.toFixed(2)}</span>
                </div>
              ))}
              
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-bold text-lg text-gray-800">Total Collected</span>
                <span className="font-bold text-2xl text-purple-600">${billData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <span className="text-2xl">🐱</span>
            <span className="font-bold text-lg">Split with Tabby</span>
          </div>
          <p className="text-sm text-gray-500">
            Generated on {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    </div>
  )
})

GroupReceiptExport.displayName = 'GroupReceiptExport'

// Preview version for modals and screens
export const GroupReceiptExportPreview: React.FC<GroupReceiptExportProps & {
  onExport?: () => void
  onShare?: () => void
}> = ({ onExport, onShare, ...props }) => {
  return (
    <div className="space-y-6">
      <GroupReceiptExport {...props} className="transform scale-90" />
      
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
              Share Group Receipt
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
              Export as PDF
            </motion.button>
          )}
        </div>
      )}
    </div>
  )
}