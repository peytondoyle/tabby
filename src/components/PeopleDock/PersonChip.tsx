import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'
import { showError, showSuccess } from '@/lib/toast'
import { useUnassignItem } from '@/api/mutations'

interface PersonChipProps {
  person: {
    id: string
    name: string
    avatar_url?: string
    venmo_handle?: string
    is_archived: boolean
  }
  editorToken: string
  billToken?: string
  onUpdate: () => void
  assignedItems?: Array<{
    item_id: string
    emoji: string
    label: string
    price: number
    quantity: number
    weight: number
    share_amount: number
  }>
  onAssignSelected?: (selectedItems: string[]) => void
  selectedItems?: string[]
  personTotal?: {
    subtotal: number
    tax_share: number
    tip_share: number
    total: number
  }
}

export interface PersonChipRef {
  triggerDropSuccess: () => void
}

export const PersonChip = forwardRef<PersonChipRef, PersonChipProps>(({ 
  person, 
  editorToken,
  billToken,
  onUpdate,
  assignedItems = [],
  onAssignSelected,
  selectedItems = [],
  personTotal
}, ref) => {
  const queryClient = useQueryClient()
  const [isDropSuccess, setIsDropSuccess] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: person.name,
    avatar_url: person.avatar_url || '',
    venmo: person.venmo_handle || ''
  })

  // Expose triggerDropSuccess method to parent
  useImperativeHandle(ref, () => ({
    triggerDropSuccess: () => {
      setIsDropSuccess(true)
    }
  }))

  // Animation for drop success
  useEffect(() => {
    if (isDropSuccess) {
      const timer = setTimeout(() => setIsDropSuccess(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isDropSuccess])

  // Calculate running total
  // Use calculated total if available, otherwise calculate from items
  const displayTotal = personTotal?.total ?? assignedItems.reduce((sum, item) => sum + item.share_amount, 0)

  // Unassign item mutation
  const unassignItemMutation = useUnassignItem(billToken || '')

  const handleSave = async () => {
    try {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - mocking person update')
        setIsEditing(false)
        showSuccess('Person updated successfully')
        onUpdate()
        return
      }

      const { error } = await supabase!.rpc('update_person_with_editor_token', {
        etoken: editorToken,
        person_id: person.id,
        p_name: formData.name,
        p_avatar_url: formData.avatar_url || null,
        p_venmo: formData.venmo || null
      })

      if (error) throw error
      
      setIsEditing(false)
      showSuccess('Person updated successfully')
      onUpdate()
    } catch (error) {
      console.error('Error updating person:', error)
      showError('Failed to update person')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this person?')) return
    
    setIsDeleting(true)
    try {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - mocking person delete')
        showSuccess('Person deleted successfully')
        onUpdate()
        return
      }

      const { error } = await supabase!.rpc('delete_person_with_editor_token', {
        etoken: editorToken,
        person_id: person.id
      })

      if (error) throw error
      
      showSuccess('Person deleted successfully')
      onUpdate()
    } catch (error) {
      console.error('Error deleting person:', error)
      showError('Failed to delete person')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: person.name,
      avatar_url: person.avatar_url || '',
      venmo: person.venmo_handle || ''
    })
    setIsEditing(false)
  }

  const handleChipClick = () => {
    console.log('PersonChip clicked:', { selectedItemsLength: selectedItems?.length, hasOnAssignSelected: !!onAssignSelected })
    if (selectedItems && selectedItems.length > 0 && onAssignSelected) {
      console.log('Calling onAssignSelected with:', selectedItems)
      onAssignSelected(selectedItems)
    }
  }

  const handleBadgeClick = (itemId: string) => {
    console.log('Badge clicked - unassigning item:', { 
      itemId, 
      personId: person.id, 
      editorToken: editorToken || 'MISSING', 
      billToken: billToken || 'MISSING' 
    })
    
    if (!editorToken) {
      console.error('No editor token available')
      showError('Cannot unassign: missing editor token')
      return
    }
    
    if (!itemId) {
      console.error('No item ID provided')
      showError('Cannot unassign: missing item ID')
      return
    }

    unassignItemMutation.mutate(
      { itemId, personId: person.id, editorToken },
      {
        onSuccess: (data) => {
          console.log('PersonChip unassign success:', data)
          console.log('PersonChip: Calling onUpdate to refresh data')
          showSuccess('Item unassigned')
          onUpdate()
        },
        onError: (error) => {
          console.error('PersonChip unassign error:', error)
          showError('Failed to unassign item')
        }
      }
    )
  }

  if (isEditing) {
    return (
      <div className="snap-start shrink-0 w-[200px] h-[88px] rounded-xl bg-card border border-line shadow-soft p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formData.avatar_url}
              onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
              className="w-6 h-6 text-center text-sm border border-line rounded-full bg-paper focus:ring-1 ring-brand/30 focus:border-brand transition-all"
              placeholder="👤"
            />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="flex-1 border border-line rounded px-2 py-1 bg-paper text-xs focus:ring-1 ring-brand/30 focus:border-brand transition-all"
              placeholder="Name"
              autoFocus
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              className="flex-1 px-2 py-1 bg-brand text-white text-xs rounded hover:bg-brand/90 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 px-2 py-1 bg-paper text-ink text-xs rounded border border-line hover:bg-paper/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  const chipClasses = [
    "snap-start shrink-0 w-[200px] h-[88px] rounded-xl bg-card border border-line shadow-soft p-3 transition group relative",
    selectedItems && selectedItems.length > 0 && "ring-2 ring-brand/50 bg-brand/5 cursor-pointer hover:bg-brand/10",
    isDropSuccess && "bg-success/10 ring-2 ring-success/30",
    (!selectedItems || selectedItems.length === 0) && !isDropSuccess && "hover:shadow-pop"
  ].filter(Boolean).join(" ")

  return (
    <div className="flex flex-col gap-2">
      {/* Main Chip */}
      <motion.div 
        className={chipClasses}
        role="button"
        tabIndex={0}
        aria-label={selectedItems.length > 0 
          ? `Assign ${selectedItems.length} selected item(s) to ${person.name}` 
          : `${person.name} - ${assignedItems.length} assigned items`
        }
        onClick={handleChipClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3 h-full">
          {/* Avatar */}
          <div className="h-8 w-8 rounded-full ring-1 ring-line bg-paper flex items-center justify-center text-sm">
            {person.avatar_url || '👤'}
          </div>

          {/* Name and Venmo */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink truncate">
              {person.name}
            </div>
            {person.venmo_handle && (
              <div className="text-xs text-ink-dim truncate">
                @{person.venmo_handle}
              </div>
            )}
          </div>

          {/* Assignment Action or Running Total */}
          <div className="ml-auto">
            {selectedItems && selectedItems.length > 0 ? (
              <div className="text-center">
                <div className="text-xs text-brand font-medium mb-1">
                  Click to Assign
                </div>
                <div className="text-xs text-brand">
                  {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''}
                </div>
              </div>
            ) : (
              <div>
                <div className="currency text-sm text-ink font-medium">
                  ${displayTotal.toFixed(2)}
                </div>
                {personTotal && (personTotal.tax_share > 0 || personTotal.tip_share > 0) && (
                  <div className="text-xs text-ink-dim text-right">
                    +${(personTotal.tax_share + personTotal.tip_share).toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons - appears on hover */}
          <motion.div 
            className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            whileHover={{ opacity: 1 }}
          >
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              className="w-5 h-5 bg-paper text-ink text-xs rounded border border-line hover:bg-paper/80 transition-colors flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ✏️
            </motion.button>
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              disabled={isDeleting}
              className="w-5 h-5 bg-danger text-white text-xs rounded hover:bg-danger/90 disabled:opacity-50 transition-colors flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isDeleting ? '...' : '🗑️'}
            </motion.button>
          </motion.div>
        </div>

        {/* Drop success animation */}
        {isDropSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 rounded-xl bg-accent/10 border-2 border-accent/50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="text-xs text-accent font-medium"
            >
              ✓ Assigned
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {/* Assigned Items List */}
      {assignedItems.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-ink-dim uppercase tracking-wide">
            Assigned Items ({assignedItems.length})
          </div>
          <div className="space-y-1">
            {assignedItems.map((item) => (
              <motion.div
                key={item.item_id}
                className="flex items-center justify-between p-2 bg-card rounded-lg border border-line group hover:border-brand/30 transition-colors"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm">{item.emoji}</span>
                  <span className="text-sm text-ink truncate font-medium">{item.label}</span>
                  <span className="text-xs text-ink-dim ml-auto">${item.share_amount.toFixed(2)}</span>
                </div>
                
                <motion.button
                  onClick={() => handleBadgeClick(item.item_id)}
                  className="opacity-0 group-hover:opacity-100 ml-2 w-6 h-6 bg-danger/10 hover:bg-danger/20 text-danger rounded-full flex items-center justify-center transition-all text-xs"
                  title={`Remove ${item.label} from ${person.name}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ×
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
