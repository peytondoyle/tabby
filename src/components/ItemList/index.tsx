import React, { useState, useEffect } from 'react'
import { supabase, isSupabaseAvailable } from '../../lib/supabaseClient'
import { getBillByToken } from '../../lib/billUtils'
import { showError, showSuccess } from '../../lib/toast'
import { ItemRow } from '../ItemRow'

interface ItemListProps {
  billToken: string
  editorToken: string
}

interface Item {
  id: string
  emoji: string
  label: string
  price: number
  quantity: number
  unit_price: number
}

export const ItemList: React.FC<ItemListProps> = ({ billToken, editorToken }) => {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newItem, setNewItem] = useState({
    label: '',
    quantity: 1,
    unit_price: 0,
    emoji: ''
  })

  const fetchItems = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!isSupabaseAvailable()) {
        // Use mock data for development
        console.warn('Supabase not available - using mock items data')
        setItems([
          {
            id: 'item-1',
            emoji: '☕',
            label: 'Cappuccino',
            price: 4.50,
            quantity: 1,
            unit_price: 4.50
          },
          {
            id: 'item-2',
            emoji: '🥐',
            label: 'Croissant',
            price: 3.25,
            quantity: 1,
            unit_price: 3.25
          },
          {
            id: 'item-3',
            emoji: '🥗',
            label: 'Caesar Salad',
            price: 12.99,
            quantity: 1,
            unit_price: 12.99
          }
        ])
        return
      }
      
      const { data, error } = await supabase!.rpc('get_items_by_token', {
        bill_token: billToken
      })

      if (error) throw error
      
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching items:', err)
      setError('Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [billToken])

  const handleAddItem = async () => {
    if (!newItem.label.trim()) return

    try {
      if (!isSupabaseAvailable()) {
        // Mock adding item for development
        console.warn('Supabase not available - mocking add item')
        const newMockItem = {
          id: `item-${Date.now()}`,
          emoji: newItem.emoji || '📦',
          label: newItem.label.trim(),
          price: newItem.unit_price,
          quantity: newItem.quantity,
          unit_price: newItem.unit_price
        }
        setItems(prev => [...prev, newMockItem])
        setNewItem({ label: '', quantity: 1, unit_price: 0, emoji: '' })
        setIsAdding(false)
        showSuccess('Item added successfully')
        return
      }

      const bill = await getBillByToken(billToken)
      if (!bill) {
        throw new Error('Bill not found')
      }

      const { error } = await supabase!.rpc('add_item_with_editor_token', {
        etoken: editorToken,
        bill_id: bill.id,
        label: newItem.label.trim(),
        qty: newItem.quantity,
        unit_price: newItem.unit_price,
        emoji: newItem.emoji || null
      })

      if (error) throw error

      setNewItem({ label: '', quantity: 1, unit_price: 0, emoji: '' })
      setIsAdding(false)
      showSuccess('Item added successfully')
      fetchItems()
    } catch (err) {
      console.error('Error adding item:', err)
      showError('Failed to add item')
    }
  }

  const handleCancelAdd = () => {
    setNewItem({ label: '', quantity: 1, unit_price: 0, emoji: '' })
    setIsAdding(false)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium text-gray-900">Items</h3>
        <div className="text-sm text-gray-500">Loading items...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium text-gray-900">Items</h3>
        <div className="text-sm text-red-500">{error}</div>
        <button
          onClick={fetchItems}
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Items</h3>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary text-sm"
        >
          Add Item
        </button>
      </div>

      {isAdding && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <input
            type="text"
            value={newItem.emoji}
            onChange={(e) => setNewItem(prev => ({ ...prev, emoji: e.target.value }))}
            className="w-8 text-center text-lg border border-gray-300 rounded"
            placeholder="🍕"
          />
          <input
            type="text"
            value={newItem.label}
            onChange={(e) => setNewItem(prev => ({ ...prev, label: e.target.value }))}
            className="flex-1 border border-gray-300 rounded px-2 py-1"
            placeholder="Item name"
            autoFocus
          />
          <input
            type="number"
            value={newItem.quantity}
            onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
            className="w-16 border border-gray-300 rounded px-2 py-1"
            min="0.1"
            step="0.1"
          />
          <input
            type="number"
            value={newItem.unit_price}
            onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
            className="w-20 border border-gray-300 rounded px-2 py-1"
            min="0"
            step="0.01"
          />
          <div className="w-20 text-right font-medium">
            ${(newItem.quantity * newItem.unit_price).toFixed(2)}
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleAddItem}
              className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
            >
              Add
            </button>
            <button
              onClick={handleCancelAdd}
              className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">
            No items yet. Add items manually or upload a receipt.
          </div>
        ) : (
          items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              editorToken={editorToken}
              onUpdate={fetchItems}
            />
          ))
        )}
      </div>
    </div>
  )
}
