import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useFlowStore, type FlowItem } from '@/lib/flowStore'

interface ReviewItemsStepProps {
  onNext: () => void
  onPrev: () => void
}

export const ReviewItemsStep: React.FC<ReviewItemsStepProps> = ({ onNext, onPrev }) => {
  const { items, setItems, updateItem, removeItem } = useFlowStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState<Partial<FlowItem>>({
    label: '',
    price: 0,
    quantity: 1,
    emoji: '🍽️'
  })

  const handleEditItem = (id: string, field: keyof FlowItem, value: any) => {
    updateItem(id, { [field]: value })
  }

  const handleAddItem = () => {
    if (newItem.label && newItem.price !== undefined) {
      const item: FlowItem = {
        id: `item-${Date.now()}`,
        label: newItem.label,
        price: Number(newItem.price),
        quantity: Number(newItem.quantity) || 1,
        emoji: newItem.emoji || '🍽️'
      }
      
      setItems([...items, item])
      setNewItem({ label: '', price: 0, quantity: 1, emoji: '🍽️' })
      setShowAddForm(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem()
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
  const canProceed = items.length > 0

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">🍽️</div>
        <h2 className="text-2xl font-bold mb-2">Review Your Items</h2>
        <p className="text-ink-dim">
          Review and edit the items on your bill
        </p>
      </motion.div>

      {/* Total Summary */}
      {items.length > 0 && (
        <motion.div 
          className="bg-brand/10 border border-brand/30 rounded-2xl p-4 mb-6 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-2xl font-bold text-brand">
            {formatPrice(totalAmount)}
          </div>
          <div className="text-sm text-ink-dim">
            Total for {items.length} {items.length === 1 ? 'item' : 'items'}
          </div>
        </motion.div>
      )}

      {/* Items List */}
      <motion.div 
        className="space-y-3 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {items.length === 0 ? (
          <div className="text-center py-8 text-ink-dim bg-card rounded-2xl border border-line">
            <div className="text-3xl mb-2">📝</div>
            <p>No items added yet</p>
          </div>
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 bg-card rounded-xl border border-line hover:border-brand/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{item.emoji}</span>
                  
                  {editingId === item.id ? (
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => handleEditItem(item.id, 'label', e.target.value)}
                        className="px-2 py-1 bg-paper border border-line rounded text-sm"
                        autoFocus
                        onBlur={() => setEditingId(null)}
                        onKeyPress={(e) => e.key === 'Enter' && setEditingId(null)}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleEditItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="px-2 py-1 bg-paper border border-line rounded text-sm"
                        onBlur={() => setEditingId(null)}
                        onKeyPress={(e) => e.key === 'Enter' && setEditingId(null)}
                      />
                    </div>
                  ) : (
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setEditingId(item.id)}
                    >
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-sm text-ink-dim flex items-center gap-2">
                        <span>{formatPrice(item.price)}</span>
                        {item.quantity && item.quantity > 1 && (
                          <span className="text-xs bg-ink-dim/20 px-1 rounded">
                            × {item.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-ink-dim hover:text-danger transition-colors"
                  title="Remove item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Add Item Form */}
      {showAddForm ? (
        <motion.div 
          className="p-6 bg-card rounded-2xl border border-line mb-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h3 className="font-bold mb-4">Add Item</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-dim mb-2">
                Item Name *
              </label>
              <input
                type="text"
                value={newItem.label}
                onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                onKeyPress={handleKeyPress}
                placeholder="Enter item name"
                className="w-full p-3 bg-paper border border-line rounded-xl focus:ring-2 focus:ring-brand/30 focus:border-brand"
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-dim mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full p-3 bg-paper border border-line rounded-xl focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink-dim mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full p-3 bg-paper border border-line rounded-xl focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewItem({ label: '', price: 0, quantity: 1, emoji: '🍽️' })
                }}
                className="flex-1 px-4 py-2 text-ink-dim border border-line rounded-xl hover:bg-paper transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={!newItem.label || !newItem.price}
                className="flex-1 px-4 py-2 bg-brand hover:bg-brand/90 disabled:bg-brand/50 text-white rounded-xl font-semibold transition-all"
              >
                Add Item
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-line hover:border-brand/50 rounded-xl text-ink-dim hover:text-ink transition-all mb-6"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Item
        </motion.button>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <button
          onClick={onPrev}
          className="flex items-center gap-2 px-6 py-3 bg-card border border-line hover:border-brand/50 text-ink rounded-xl font-semibold transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
            canProceed
              ? 'bg-brand hover:bg-brand/90 text-white'
              : 'bg-brand/30 text-white/70 cursor-not-allowed'
          }`}
        >
          {items.length === 0 ? 'Add at least 1 item' : 'Assign Items'}
        </button>
      </div>
    </div>
  )
}