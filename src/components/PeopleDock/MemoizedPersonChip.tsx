import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'
import { showError, showSuccess } from '@/lib/exportUtils'
import { logServer } from '@/lib/errorLogger'
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
  assignedHash?: string // For memoization
}

export interface PersonChipRef {
  triggerDropSuccess: () => void
}

export const MemoizedPersonChip = forwardRef<PersonChipRef, PersonChipProps>(({ 
  person, 
  editorToken,
  billToken,
  onUpdate,
  assignedItems = [],
  onAssignSelected,
  selectedItems = [],
  personTotal,
}, ref) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDropSuccess, setIsDropSuccess] = useState(false)
  const [editingName, setEditingName] = useState(person.name)
  const [editingVenmo, setEditingVenmo] = useState(person.venmo_handle || '')
  
  const unassignItemMutation = useUnassignItem(editorToken)

  // Memoize computed values
  const displayTotal = useMemo(() => {
    if (personTotal) {
      return personTotal.total
    }
    return assignedItems.reduce((sum, item) => sum + item.share_amount, 0)
  }, [personTotal, assignedItems])

  const assignedItemsCount = useMemo(() => assignedItems.length, [assignedItems.length])

  const initials = useMemo(() => {
    return person.name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [person.name])

  // Memoize handlers
  const handleChipClick = useCallback(() => {
    console.log('PersonChip clicked:', { selectedItemsLength: selectedItems?.length, hasOnAssignSelected: !!onAssignSelected });
    if (selectedItems && selectedItems.length > 0 && onAssignSelected) {
      console.log('Calling onAssignSelected with:', selectedItems);
      onAssignSelected(selectedItems); // Trigger multi-assignment
    }
  }, [selectedItems, onAssignSelected])

  const handleBadgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }, [])

  const handleSave = useCallback(async () => {
    try {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - mocking person update')
        showSuccess('Person updated successfully')
        onUpdate()
        setIsEditing(false)
        return
      }

      const { error } = await supabase!.rpc('update_person_with_editor_token', {
        etoken: editorToken,
        person_id: person.id,
        p_name: editingName,
        p_venmo_handle: editingVenmo || null
      })

      if (error) throw error
      
      showSuccess('Person updated successfully')
      onUpdate()
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating person:', error)
      logServer('error', 'Failed to update person', { error, context: 'MemoizedPersonChip.handleSave' })
      showError('Failed to update person')
    }
  }, [editorToken, person.id, editingName, editingVenmo, onUpdate])

  const handleCancel = useCallback(() => {
    setEditingName(person.name)
    setEditingVenmo(person.venmo_handle || '')
    setIsEditing(false)
  }, [person.name, person.venmo_handle])

  const handleUnassignItem = useCallback(async (itemId: string) => {
    try {
      await unassignItemMutation.mutateAsync({ itemId, personId: person.id, editorToken: billToken || editorToken })
      showSuccess('Item unassigned successfully')
      onUpdate()
    } catch (error) {
      console.error('Error unassigning item:', error)
      showError('Failed to unassign item')
    }
  }, [unassignItemMutation, person.id, onUpdate])

  // Imperative handle for drop success animation
  useImperativeHandle(ref, () => ({
    triggerDropSuccess: () => {
      setIsDropSuccess(true)
      setTimeout(() => setIsDropSuccess(false), 2000)
    }
  }), [])

  // Reset editing state when person changes
  useEffect(() => {
    setEditingName(person.name)
    setEditingVenmo(person.venmo_handle || '')
  }, [person.name, person.venmo_handle])

  // Memoize chip classes
  const chipClasses = useMemo(() => [
    "snap-start shrink-0 w-[200px] h-[88px] rounded-xl bg-card border border-line shadow-soft p-3 transition group relative",
    selectedItems && selectedItems.length > 0 && "ring-2 ring-brand/50 bg-brand/5 cursor-pointer hover:bg-brand/10",
    isDropSuccess && "bg-success/10 ring-2 ring-success/30",
    (!selectedItems || selectedItems.length === 0) && !isDropSuccess && "hover:shadow-pop"
  ].filter(Boolean).join(" "), [selectedItems, isDropSuccess])

  if (isEditing) {
    return (
      <div className="snap-start shrink-0 w-[200px] h-[88px] rounded-xl bg-card border border-line shadow-soft p-3">
        <div className="flex flex-col gap-2 h-full">
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="text-sm font-medium bg-transparent border-b border-line pb-1 focus:outline-none focus:border-brand"
            placeholder="Name"
            autoFocus
          />
          <input
            type="text"
            value={editingVenmo}
            onChange={(e) => setEditingVenmo(e.target.value)}
            className="text-xs text-ink-dim bg-transparent border-b border-line pb-1 focus:outline-none focus:border-brand"
            placeholder="@venmo_handle"
          />
          <div className="flex gap-1 mt-auto">
            <button
              onClick={handleSave}
              className="px-2 py-1 bg-brand text-white text-xs rounded hover:bg-brand/90"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 bg-ink-dim text-white text-xs rounded hover:bg-ink-dim/90"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <motion.div
        className={chipClasses}
        role="button"
        tabIndex={0}
        aria-label={selectedItems.length > 0
          ? `Assign ${selectedItems.length} selected item(s) to ${person.name}`
          : `${person.name} - ${assignedItemsCount} assigned items`
        }
        onClick={handleChipClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3 h-full">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center text-sm font-bold shrink-0">
            {person.avatar_url ? '👤' : initials}
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
          
          {/* Total */}
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
          
          {/* Action buttons */}
          <div className="flex flex-col gap-1">
            <button
              onClick={handleBadgeClick}
              className="w-5 h-5 rounded-full bg-ink-dim/20 hover:bg-ink-dim/30 flex items-center justify-center text-xs text-ink-dim hover:text-ink transition-colors"
              title="Edit person"
            >
              ✏️
            </button>
          </div>
        </div>
        
        {/* Drop success animation */}
        {isDropSuccess && (
          <motion.div
            className="absolute inset-0 bg-success/20 rounded-xl flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-success text-2xl">✓</div>
          </motion.div>
        )}
      </motion.div>
      
      {/* Assigned Items List */}
      {assignedItems.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {assignedItems.map((item) => (
            <div
              key={item.item_id}
              className="flex items-center justify-between p-2 bg-surface rounded-lg text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">{item.emoji}</span>
                <span className="truncate">{item.label}</span>
                <span className="text-ink-dim">
                  {item.weight < 1 ? `${Math.round(item.weight * 100)}%` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">${item.share_amount.toFixed(2)}</span>
                <button
                  onClick={() => handleUnassignItem(item.item_id)}
                  className="w-4 h-4 rounded-full bg-error/20 hover:bg-error/30 flex items-center justify-center text-xs text-error hover:text-error/80 transition-colors"
                  title={`Remove ${item.label}`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

MemoizedPersonChip.displayName = 'MemoizedPersonChip'
