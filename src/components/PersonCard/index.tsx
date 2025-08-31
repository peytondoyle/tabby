import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import { supabase, isSupabaseAvailable } from '../../lib/supabaseClient'
import { showError, showSuccess } from '@/lib/exportUtils'

interface PersonCardProps {
  person: {
    id: string
    name: string
    avatar_url?: string
    venmo_handle?: string
    is_archived: boolean
  }
  editorToken: string
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
  totals?: {
    subtotal: number
    tax_share: number
    tip_share: number
    total: number
  }
  isDragOver?: boolean
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isAddPerson?: boolean
  onAddPerson?: () => void
}

export const PersonCard: React.FC<PersonCardProps> = ({ 
  person, 
  editorToken, 
  onUpdate,
  assignedItems = [],
  totals,
  isDragOver = false,
  onDragOver,
  onDragLeave,
  onDrop,
  isAddPerson = false,
  onAddPerson
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDropSuccess, setIsDropSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: person.name,
    avatar_url: person.avatar_url || '',
    venmo: person.venmo_handle || ''
  })

  const { setNodeRef, isOver } = useDroppable({
    id: person.id,
  })

  // Animation for drop success
  useEffect(() => {
    if (isDropSuccess) {
      const timer = setTimeout(() => setIsDropSuccess(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isDropSuccess])

  const handleSave = async () => {
    try {
      if (!isSupabaseAvailable()) {
        // Mock update for development
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
        // Mock delete for development
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

  const handleDrop = (e: React.DragEvent) => {
    if (onDrop) {
      onDrop(e)
      setIsDropSuccess(true)
    }
  }

  // Add Person ghost card
  if (isAddPerson) {
    return (
      <motion.div 
        className="rounded-2xl bg-card shadow-soft border-2 border-dashed border-line p-5 hover:shadow-pop hover:-translate-y-1 transition-all duration-200 cursor-pointer h-full min-h-[200px] flex flex-col"
        onClick={onAddPerson}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex flex-col items-center justify-center h-full text-ink-dim">
          <motion.div 
            className="w-16 h-16 bg-paper rounded-full flex items-center justify-center mb-4"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <span className="text-2xl">+</span>
          </motion.div>
          <p className="font-medium text-lg">Add Person</p>
          <p className="text-sm text-center mt-2">Click to add someone to split with</p>
        </div>
      </motion.div>
    )
  }

  if (isEditing) {
    return (
      <div className="rounded-2xl bg-card shadow-soft border-line p-5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={formData.avatar_url}
              onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
              className="w-12 h-12 text-center text-lg border border-line rounded-full bg-paper focus:ring-2 ring-brand/30 focus:border-brand transition-all"
              placeholder="👤"
            />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="flex-1 border border-line rounded-lg px-3 py-2 bg-paper focus:ring-2 ring-brand/30 focus:border-brand transition-all"
              placeholder="Name"
              autoFocus
            />
          </div>
          <input
            type="text"
            value={formData.venmo}
            onChange={(e) => setFormData(prev => ({ ...prev, venmo: e.target.value }))}
            className="w-full border border-line rounded-lg px-3 py-2 bg-paper focus:ring-2 ring-brand/30 focus:border-brand transition-all"
            placeholder="Venmo handle (optional)"
          />
          <div className="flex gap-3">
            <motion.button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Save
            </motion.button>
            <motion.button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-paper text-ink text-sm font-medium rounded-lg border border-line hover:bg-paper/80 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  const cardClasses = [
    "rounded-2xl bg-card shadow-soft border-line p-5 transition-all duration-200 h-full flex flex-col",
    (isDragOver || isOver) && "shadow-pop ring-2 ring-brand/30 -translate-y-1",
    isDropSuccess && "bg-accent/10",
    !isDragOver && !isOver && !isDropSuccess && "hover:shadow-pop hover:-translate-y-1"
  ].filter(Boolean).join(" ")

  return (
    <motion.div 
      ref={setNodeRef}
      className={cardClasses}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      role="button"
      tabIndex={0}
      aria-label={`Drop items here to assign to ${person.name}`}
    >
      {/* Header: Avatar + Name + Venmo */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-12 h-12 bg-paper rounded-full flex items-center justify-center text-lg"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            {person.avatar_url || '👤'}
          </motion.div>
          <div>
            <h3 className="font-medium text-ink text-base">{person.name}</h3>
            {person.venmo_handle && (
              <p className="text-sm text-ink-dim">@{person.venmo_handle}</p>
            )}
          </div>
        </div>
        
        {/* Action buttons - appears on hover */}
        <motion.div 
          className={`flex gap-1 transition-opacity duration-200 ${isDragOver ? 'opacity-100' : 'opacity-0'}`}
          whileHover={{ opacity: 1 }}
        >
          <motion.button
            onClick={() => setIsEditing(true)}
            className="px-2 py-1 bg-paper text-ink text-xs rounded-lg border border-line hover:bg-paper/80 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Edit
          </motion.button>
          <motion.button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-2 py-1 bg-danger text-white text-xs rounded-lg hover:bg-danger/90 disabled:opacity-50 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isDeleting ? '...' : 'Delete'}
          </motion.button>
        </motion.div>
      </div>

      {/* Assigned Items List */}
      <div className="space-y-2 mb-4 flex-1">
        {assignedItems.length === 0 ? (
          <div className="text-sm text-ink-dim italic">
            No items assigned yet
          </div>
        ) : (
          assignedItems.map((item) => (
            <div key={item.item_id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-base">{item.emoji}</span>
                <span className="text-ink">{item.label}</span>
                {item.weight < 1 && (
                  <span className="px-1.5 py-0.5 bg-paper text-xs rounded-full text-ink-dim">
                    {item.weight === 0.5 ? '½' : `${Math.round(item.weight * 100)}%`}
                  </span>
                )}
              </div>
              <span className="font-mono text-xs text-ink">
                ${item.share_amount.toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Totals Footer */}
      {totals && (
        <motion.div 
          className="border-t border-line pt-4 mt-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-dim">Subtotal</span>
              <span className="font-mono text-xs text-ink">
                ${totals.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-ink">Total</span>
              <span className="text-ink">
                ${totals.total.toFixed(2)}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
