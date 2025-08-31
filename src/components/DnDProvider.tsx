import React, { useState } from 'react'
import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  TouchSensor,
  DragOverlay,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'
import { showError, showSuccess } from '@/lib/exportUtils'

interface DnDProviderProps {
  children: React.ReactNode
  editorToken: string
  onItemAssigned?: () => void
  onDropSuccess?: (personId: string) => void
}

export const DnDProvider: React.FC<DnDProviderProps> = ({
  children,
  editorToken,
  onItemAssigned,
  onDropSuccess
}) => {
  const queryClient = useQueryClient()
  const [announcement, setAnnouncement] = useState('')
  const [activeItem, setActiveItem] = useState<any>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    })
  )

  // Mutation for upserting item shares
  const upsertItemShareMutation = useMutation({
    mutationFn: async ({ itemId, personId, weight }: { itemId: string, personId: string, weight: number }) => {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - mocking item share upsert')
        return { item_id: itemId, person_id: personId, weight }
      }

      const { data, error } = await supabase!.rpc('upsert_item_share_with_editor_token', {
        etoken: editorToken,
        item_id: itemId,
        person_id: personId,
        weight
      })

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      // Invalidate shares query to refetch data
      queryClient.invalidateQueries({ queryKey: ['shares'] })
      
      // Get item and person names for announcement
      const itemName = variables.itemId // In real app, get from items query
      const personName = variables.personId // In real app, get from people query
      
      const message = `Assigned ${itemName} to ${personName}`
      setAnnouncement(message)
      showSuccess(message)
      onItemAssigned?.()
      
      // Trigger drop success animation
      onDropSuccess?.(variables.personId)
      
      // Clear announcement after a delay
      setTimeout(() => setAnnouncement(''), 3000)
    },
    onError: (error) => {
      console.error('Error assigning item:', error)
      showError('Failed to assign item')
    }
  })

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveItem(active.data.current)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const itemId = active.id as string
      const personId = over.id as string

      // Use the mutation to assign the item
      upsertItemShareMutation.mutate({
        itemId,
        personId,
        weight: 1
      })
    }
    
    setActiveItem(null)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      
      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem ? (
          <div className="px-3 py-2 rounded-lg bg-card border border-line shadow-pop flex items-center gap-3 opacity-90">
            <span className="text-[20px]">{activeItem.emoji}</span>
            <span className="font-medium text-ink text-[14px]">{activeItem.label}</span>
            <span className="currency text-ink text-[14px]">${activeItem.price.toFixed(2)}</span>
          </div>
        ) : null}
      </DragOverlay>
      
      {/* Screen reader announcements */}
      <div 
        id="drag-announcements" 
        className="sr-only" 
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
    </DndContext>
  )
}
