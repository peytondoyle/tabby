/**
 * iOS-Inspired Item Row Component
 * Migrated to use new design system components
 */

import React, { useState } from 'react'
import { supabase, isSupabaseAvailable } from '../../lib/supabaseClient'
import { showError, showSuccess } from '@/lib/exportUtils'
import { logServer } from '@/lib/errorLogger'
import { Card, Button, Input, Stack, Spacer } from '@/components/design-system'
import { designTokens } from '@/lib/styled'

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
  className?: string
}

export const ItemRow: React.FC<ItemRowProps> = ({ item, editorToken, onUpdate, className = "" }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState({
    label: item.label,
    quantity: item.quantity,
    unit_price: item.unit_price,
    emoji: item.emoji
  })

  const handleSave = async () => {
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
      logServer('error', 'Failed to update item', { error, context: 'ItemRow.handleSave' })
      showError('Failed to update item')
    }
  }

  const handleDelete = async () => {
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
      logServer('error', 'Failed to delete item', { error, context: 'ItemRow.handleDelete' })
      showError('Failed to delete item')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      label: item.label,
      quantity: item.quantity,
      unit_price: item.unit_price,
      emoji: item.emoji
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Card variant="elevated" padding="md">
        <Stack direction="horizontal" align="center" spacing={3}>
          <Input
            value={formData.emoji}
            onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
            style={{
              width: '32px',
              textAlign: 'center',
              fontSize: designTokens.typography.fontSize.lg,
            }}
            placeholder="🍕"
          />
          <Input
            value={formData.label}
            onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
            style={{ flex: 1 }}
            placeholder="Item name"
          />
          <Input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
            style={{ width: '64px' }}
            min="0.1"
            step="0.1"
          />
          <Input
            type="number"
            value={formData.unit_price}
            onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
            style={{ width: '80px' }}
            min="0"
            step="0.01"
          />
          <div style={{
            width: '80px',
            textAlign: 'right',
            fontWeight: designTokens.typography.fontWeight.medium,
            fontFamily: designTokens.typography.fontFamily.mono,
          }}>
            ${(formData.quantity * formData.unit_price).toFixed(2)}
          </div>
          <Stack direction="horizontal" spacing={1}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              style={{
                padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
                fontSize: designTokens.typography.fontSize.xs,
                backgroundColor: designTokens.semantic.status.success,
              }}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancel}
              style={{
                padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
                fontSize: designTokens.typography.fontSize.xs,
              }}
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Card>
    )
  }

  return (
    <Card
      variant="elevated"
      padding="md"
      style={{
        transition: designTokens.transitions.fast,
      }}
      className={className}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = designTokens.semantic.background.secondary
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = designTokens.semantic.background.elevated
      }}
    >
      <Stack direction="horizontal" align="center" spacing={3}>
        <div style={{
          width: '32px',
          textAlign: 'center',
          fontSize: designTokens.typography.fontSize.lg,
        }}>
          {item.emoji || '📦'}
        </div>
        <div style={{
          flex: 1,
          fontWeight: designTokens.typography.fontWeight.medium,
          color: designTokens.semantic.text.primary,
        }}>
          {item.label}
        </div>
        <div style={{
          fontSize: designTokens.typography.fontSize.sm,
          color: designTokens.semantic.text.secondary,
        }}>
          {item.quantity > 1 ? `${item.quantity} × $${item.unit_price.toFixed(2)}` : ''}
        </div>
        <div style={{
          width: '80px',
          textAlign: 'right',
          fontWeight: designTokens.typography.fontWeight.medium,
          fontFamily: designTokens.typography.fontFamily.mono,
          color: designTokens.semantic.text.primary,
        }}>
          ${item.price.toFixed(2)}
        </div>
        <Stack direction="horizontal" spacing={1}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsEditing(true)}
            style={{
              padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
              fontSize: designTokens.typography.fontSize.xs,
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
              fontSize: designTokens.typography.fontSize.xs,
              color: designTokens.semantic.status.error,
            }}
          >
            {isDeleting ? '...' : 'Delete'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  )
}