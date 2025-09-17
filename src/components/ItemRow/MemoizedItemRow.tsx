import React, { useState, useCallback, useMemo } from 'react'
import { supabase, isSupabaseAvailable } from '../../lib/supabaseClient'
import { showError, showSuccess } from '@/lib/exportUtils'
import { logServer } from '@/lib/errorLogger'

interface ItemRowProps {
  item: {
    id: string
    emoji: string
    label: string
    price: number
    quantity: number
    unit_price: number
  }
  editorToken: string
  onUpdate: () => void
  assignedHash?: string // For memoization
}

export const MemoizedItemRow = React.memo<ItemRowProps>(({ 
  item, 
  editorToken, 
  onUpdate, 
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState({
    label: item.label,
    quantity: item.quantity,
    unit_price: item.unit_price,
    emoji: item.emoji
  })

  // Memoize handlers to prevent re-creation
  const handleSave = useCallback(async () => {
    try {
      if (!isSupabaseAvailable()) {
        // Mock update for development
        console.warn('Supabase not available - mocking item update')
        setIsEditing(false)
        showSuccess('Item updated successfully')
        onUpdate()
        return
      }

      const { error } = await supabase!.rpc('update_item_with_editor_token', {
        etoken: editorToken,
        item_id: item.id,
        p_label: formData.label,
        p_qty: formData.quantity,
        p_unit_price: formData.unit_price,
        p_emoji: formData.emoji
      })

      if (error) throw error
      
      setIsEditing(false)
      showSuccess('Item updated successfully')
      onUpdate()
    } catch (error) {
      console.error('Error updating item:', error)
      logServer('error', 'Failed to update item', { error, context: 'MemoizedItemRow.handleSave' })
      showError('Failed to update item')
    }
  }, [editorToken, item.id, formData, onUpdate])

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    setIsDeleting(true)
    try {
      if (!isSupabaseAvailable()) {
        // Mock delete for development
        console.warn('Supabase not available - mocking item delete')
        showSuccess('Item deleted successfully')
        onUpdate()
        return
      }

      const { error } = await supabase!.rpc('delete_item_with_editor_token', {
        etoken: editorToken,
        item_id: item.id
      })

      if (error) throw error
      
      showSuccess('Item deleted successfully')
      onUpdate()
    } catch (error) {
      console.error('Error deleting item:', error)
      logServer('error', 'Failed to delete item', { error, context: 'MemoizedItemRow.handleDelete' })
      showError('Failed to delete item')
    } finally {
      setIsDeleting(false)
    }
  }, [editorToken, item.id, onUpdate])

  const handleCancel = useCallback(() => {
    setFormData({
      label: item.label,
      quantity: item.quantity,
      unit_price: item.unit_price,
      emoji: item.emoji
    })
    setIsEditing(false)
  }, [item.label, item.quantity, item.unit_price, item.emoji])

  const handleEdit = useCallback(() => {
    setIsEditing(true)
  }, [])

  // Memoize computed values
  const totalPrice = useMemo(() => 
    (formData.quantity * formData.unit_price).toFixed(2), 
    [formData.quantity, formData.unit_price]
  )

  const quantityText = useMemo(() => 
    item.quantity > 1 ? `${item.quantity} × $${item.unit_price.toFixed(2)}` : '', 
    [item.quantity, item.unit_price]
  )

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
        <input
          type="text"
          value={formData.emoji}
          onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
          className="w-8 text-center text-lg border border-gray-300 rounded"
          placeholder="🍕"
        />
        <input
          type="text"
          value={formData.label}
          onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
          className="flex-1 border border-gray-300 rounded px-2 py-1"
          placeholder="Item name"
        />
        <input
          type="number"
          value={formData.quantity}
          onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
          className="w-16 border border-gray-300 rounded px-2 py-1"
          min="0.1"
          step="0.1"
        />
        <input
          type="number"
          value={formData.unit_price}
          onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
          className="w-20 border border-gray-300 rounded px-2 py-1"
          min="0"
          step="0.01"
        />
        <div className="w-20 text-right font-medium">
          ${totalPrice}
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="w-8 text-center text-lg">
        {item.emoji || '📦'}
      </div>
      <div className="flex-1 font-medium">
        {item.label}
      </div>
      <div className="text-sm text-gray-500">
        {quantityText}
      </div>
      <div className="w-20 text-right font-medium">
        ${item.price.toFixed(2)}
      </div>
      <div className="flex gap-1">
        <button
          onClick={handleEdit}
          className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50"
        >
          {isDeleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.item.quantity === nextProps.item.quantity &&
    prevProps.item.unit_price === nextProps.item.unit_price &&
    prevProps.item.label === nextProps.item.label &&
    prevProps.item.emoji === nextProps.item.emoji &&
    prevProps.editorToken === nextProps.editorToken &&
    prevProps.assignedHash === nextProps.assignedHash
  )
})

MemoizedItemRow.displayName = 'MemoizedItemRow'
