import React from 'react'
import type { FlowPerson, FlowItem } from '@/lib/flowStore'

// Extended item type that includes share amount for split items
interface ItemWithShare extends FlowItem {
  shareAmount?: number  // The person's share of the item (may be less than price if split)
  weight?: number       // The person's weight/proportion (0-1)
}

interface PersonCardProps {
  name: string
  items: ItemWithShare[]
  subtotal: number
  discountShare: number
  serviceFeeShare: number
  taxShare: number
  tipShare: number
  total: number
  billTitle?: string
  billPlace?: string
  billDate?: string
}

interface GroupCardProps {
  groups: Array<{
    person: FlowPerson
    items: ItemWithShare[]
    subtotal: number
    discountShare: number
    serviceFeeShare: number
    taxShare: number
    tipShare: number
    total: number
  }>
  billTitle?: string
  billPlace?: string
  billDate?: string
  totalAmount: number
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}

export const PersonCard: React.FC<PersonCardProps> = ({
  name,
  items,
  subtotal,
  discountShare,
  serviceFeeShare,
  taxShare,
  tipShare,
  total,
  billTitle = 'Receipt',
  billPlace,
  billDate
}) => {
  const currentDate = billDate ? new Date(billDate).toLocaleDateString() : new Date().toLocaleDateString()

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 max-w-md mx-auto font-mono">
      {/* Header */}
      <div className="text-center mb-6 border-b border-gray-300 pb-4">
        <h2 className="text-xl font-bold text-gray-800">{billTitle}</h2>
        {billPlace && <p className="text-gray-600 text-sm">{billPlace}</p>}
        <p className="text-gray-500 text-xs">{currentDate}</p>
      </div>

      {/* Person Info */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold text-lg">{name}'s Share</span>
        </div>
      </div>

      {/* Items List */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3 text-gray-700">Items:</h3>
        <div className="space-y-2">
          {items.map((item, index) => {
            // Use shareAmount if available, otherwise fall back to full price
            const displayPrice = item.shareAmount ?? item.price
            const isShared = item.weight !== undefined && item.weight < 1

            return (
              <div key={index} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                  {item.quantity && item.quantity > 1 && (
                    <span className="text-gray-500">x{item.quantity}</span>
                  )}
                  {isShared && (
                    <span className="text-gray-400 text-xs">({Math.round((item.weight || 1) * 100)}%)</span>
                  )}
                </div>
                <span className="font-medium">{formatPrice(displayPrice)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-300 pt-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {discountShare !== 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount:</span>
              <span>{formatPrice(discountShare)}</span>
            </div>
          )}
          {serviceFeeShare > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Service fee:</span>
              <span>{formatPrice(serviceFeeShare)}</span>
            </div>
          )}
          {taxShare > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax:</span>
              <span>{formatPrice(taxShare)}</span>
            </div>
          )}
          {tipShare > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tip:</span>
              <span>{formatPrice(tipShare)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
            <span>Total:</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">Split with Tabby 🐱</p>
      </div>
    </div>
  )
}

export const GroupCard: React.FC<GroupCardProps> = ({
  groups,
  billTitle = 'Group Receipt',
  billPlace,
  billDate,
  totalAmount
}) => {
  const currentDate = billDate ? new Date(billDate).toLocaleDateString() : new Date().toLocaleDateString()

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 max-w-2xl mx-auto font-mono">
      {/* Header */}
      <div className="text-center mb-8 border-b border-gray-300 pb-6">
        <h2 className="text-2xl font-bold text-gray-800">{billTitle}</h2>
        {billPlace && <p className="text-gray-600 text-lg">{billPlace}</p>}
        <p className="text-gray-500">{currentDate}</p>
        <div className="mt-4 text-3xl font-bold text-blue-600">
          {formatPrice(totalAmount)}
        </div>
        <p className="text-gray-600">Split between {groups.length} people</p>
      </div>

      {/* Group Breakdown */}
      <div className="space-y-6">
        {groups.map((group, _index) => (
          <div key={group.person.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">
                  {group.person.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold">{group.person.name}</span>
              </div>
              <span className="font-bold text-lg">{formatPrice(group.total)}</span>
            </div>
            
            <div className="ml-11 space-y-1 text-sm">
              {group.items.map((item, itemIndex) => {
                // Use shareAmount if available, otherwise fall back to full price
                const displayPrice = item.shareAmount ?? item.price
                const isShared = item.weight !== undefined && item.weight < 1

                return (
                  <div key={itemIndex} className="flex justify-between text-gray-600">
                    <span>
                      {item.emoji} {item.label}
                      {isShared && <span className="text-gray-400 text-xs ml-1">({Math.round((item.weight || 1) * 100)}%)</span>}
                    </span>
                    <span>{formatPrice(displayPrice)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500">Split with Tabby 🐱</p>
      </div>
    </div>
  )
}