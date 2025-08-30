import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'
import { getBillByToken } from '@/lib/billUtils'
import { showError, showSuccess } from '@/lib/toast'
import { deriveAssignedMap } from '@/lib/computeTotals'
import { useUpsertItemShareMutation } from '@/lib/queryClient'
import { PersonChip, type PersonChipRef } from './PersonChip.tsx'

interface PeopleDockProps {
  billToken?: string
  editorToken?: string
  onDropSuccess?: (personId: string) => void
  selectedItems?: string[]
  onAssignSelected?: (selectedItems: string[], personId?: string) => void
  personTotals?: Map<string, {
    subtotal: number
    tax_share: number
    tip_share: number
    total: number
  }>
}

interface Person {
  id: string
  name: string
  avatar_url?: string
  venmo_handle?: string
  is_archived: boolean
}

export interface PeopleDockRef {
  handleDropSuccess: (personId: string) => void
}

export const PeopleDock = forwardRef<PeopleDockRef, PeopleDockProps>(({ 
  billToken, 
  editorToken, 
  onDropSuccess, 
  selectedItems = [],
  onAssignSelected,
  personTotals
}, ref) => {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [newPerson, setNewPerson] = useState({
    name: '',
    avatar_url: '',
    venmo: ''
  })

  // Refs for PersonChip components to trigger drop success animations
  const personChipRefs = useRef<{ [key: string]: PersonChipRef | null }>({})

  // Handle drop success by triggering animation on the specific PersonChip
  const handleDropSuccess = useCallback((personId: string) => {
    const chipRef = personChipRefs.current[personId]
    if (chipRef) {
      chipRef.triggerDropSuccess()
    }
    onDropSuccess?.(personId)
  }, [onDropSuccess])

  // Expose handleDropSuccess method to parent
  useImperativeHandle(ref, () => ({
    handleDropSuccess
  }), [handleDropSuccess])

  // React Query hooks
  const { data: people = [], isLoading: peopleLoading, error: peopleError } = useQuery({
    queryKey: ['people', billToken],
    queryFn: async () => {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - using mock people data')
        return [
          {
            id: 'person-1',
            name: 'Alice',
            avatar_url: '👩',
            venmo_handle: 'alice-smith',
            is_archived: false
          },
          {
            id: 'person-2',
            name: 'Bob',
            avatar_url: '👨',
            venmo_handle: 'bob-jones',
            is_archived: false
          },
          {
            id: 'person-3',
            name: 'Charlie',
            avatar_url: '🧑',
            venmo_handle: 'charlie-brown',
            is_archived: false
          }
        ]
      }

      const { data, error } = await supabase!.rpc('get_people_by_token', {
        bill_token: billToken!
      })

      if (error) throw error
      return data || []
    },
    enabled: !!billToken
  })

  const { data: items = [] } = useQuery({
    queryKey: ['items', billToken],
    queryFn: async () => {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - using mock items data')
        return [
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
        ]
      }

      const { data, error } = await supabase!.rpc('get_items_by_token', {
        bill_token: billToken!
      })

      if (error) throw error
      return data || []
    },
    enabled: !!billToken
  })

  const { data: shares = [] } = useQuery({
    queryKey: ['shares', billToken],
    queryFn: async () => {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - using mock shares data')
        return [
          { item_id: 'item-1', person_id: 'person-1', weight: 1 },
          { item_id: 'item-2', person_id: 'person-2', weight: 1 },
          { item_id: 'item-3', person_id: 'person-1', weight: 0.5 },
          { item_id: 'item-3', person_id: 'person-2', weight: 0.5 }
        ]
      }

      const { data, error } = await supabase!.rpc('get_item_shares_by_token', {
        bill_token: billToken!
      })

      if (error) throw error
      return data || []
    },
    enabled: !!billToken
  })

  // Compute assigned items for each person
  const assignedByPerson = deriveAssignedMap(items, shares)

  // Add person mutation
  const addPersonMutation = useMutation({
    mutationFn: async (personData: { name: string; avatar_url: string; venmo: string }) => {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - mocking person addition')
        return { id: 'new-person', ...personData, is_archived: false }
      }

      const bill = await getBillByToken(billToken!)
      
      const { data, error } = await supabase!.rpc('add_person_with_editor_token', {
        etoken: editorToken || bill?.editor_token || '',
        bill_id: bill?.id || '',
        person_name: personData.name,
        avatar_url: personData.avatar_url || null,
        venmo: personData.venmo || null
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', billToken] })
      setIsAdding(false)
      setNewPerson({ name: '', avatar_url: '', venmo: '' })
      showSuccess('Person added successfully')
    },
    onError: (error) => {
      console.error('Error adding person:', error)
      showError('Failed to add person')
    }
  })

  // Assign selected items mutation
  const assignSelectedMutation = useUpsertItemShareMutation(editorToken || '')

  const handleAddPerson = async () => {
    if (!newPerson.name.trim()) return
    
    addPersonMutation.mutate(newPerson)
  }

  const handleAddPersonClick = () => {
    setIsAdding(true)
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setNewPerson({ name: '', avatar_url: '', venmo: '' })
  }

  const handleAssignSelected = (personId: string) => {
    if (selectedItems.length === 0) return

    // Use the onAssignSelected callback if provided
    if (onAssignSelected) {
      onAssignSelected(selectedItems)
      const personName = people.find((p: Person) => p.id === personId)?.name || 'Unknown';
      showSuccess(`Assigned ${selectedItems.length} item(s) → ${personName}`)
      handleDropSuccess(personId) // Trigger success animation
    } else {
      // Fallback to old logic
      const assignPromises = selectedItems.map(itemId =>
        assignSelectedMutation.mutationFn({
          itemId,
          personId,
          weight: 1
        })
      )

      Promise.all(assignPromises)
        .then(() => {
          const personName = people.find((p: Person) => p.id === personId)?.name || 'Unknown';
          showSuccess(`Assigned ${selectedItems.length} item(s) → ${personName}`)
          onAssignSelected?.([], personId) // Clear selection
          handleDropSuccess(personId) // Trigger success animation
        })
        .catch((error) => {
          console.error('Error assigning items:', error)
          showError('Failed to assign items')
        })
    }
  }

  if (peopleLoading) {
    return (
      <div className="sticky top-[56px] z-40 bg-paper/80 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-6 py-2">
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="snap-start shrink-0 w-[220px] h-24 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (peopleError) {
    return (
      <div className="sticky top-[56px] z-40 bg-paper/80 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-6 py-2">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700">
              Error loading people: {peopleError instanceof Error ? peopleError.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sticky top-[56px] z-40 bg-paper/80 backdrop-blur border-b border-line">
      <div className="py-2">
        {/* Add Person Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card rounded-xl p-3 border border-line mb-3"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={newPerson.name}
                  onChange={(e) => setNewPerson(prev => ({ ...prev, name: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <input
                  type="text"
                  placeholder="Avatar (emoji)"
                  value={newPerson.avatar_url}
                  onChange={(e) => setNewPerson(prev => ({ ...prev, avatar_url: e.target.value }))}
                  className="w-16 px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <input
                  type="text"
                  placeholder="Venmo"
                  value={newPerson.venmo}
                  onChange={(e) => setNewPerson(prev => ({ ...prev, venmo: e.target.value }))}
                  className="w-24 px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button
                  onClick={handleAddPerson}
                  disabled={addPersonMutation.isPending}
                  className="px-3 py-2 bg-brand text-white text-sm rounded-lg hover:bg-brand/90 disabled:opacity-50 transition-colors"
                >
                  {addPersonMutation.isPending ? '...' : 'Add'}
                </button>
                <button
                  onClick={handleCancelAdd}
                  className="px-3 py-2 bg-paper text-ink text-sm rounded-lg border border-line hover:bg-paper/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* People chips row */}
        <div className="relative">
          {/* Arrow buttons for navigation when more than 5 people */}
          {people.length > 5 && (
            <>
              <button
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-card/90 backdrop-blur border border-line rounded-full shadow-soft flex items-center justify-center text-ink-dim hover:text-ink hover:bg-card transition-all"
                onClick={() => {
                  const container = document.querySelector('.people-scroll-container')
                  if (container) {
                    container.scrollBy({ left: -200, behavior: 'smooth' })
                  }
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-card/90 backdrop-blur border border-line rounded-full shadow-soft flex items-center justify-center text-ink-dim hover:text-ink hover:bg-card transition-all"
                onClick={() => {
                  const container = document.querySelector('.people-scroll-container')
                  if (container) {
                    container.scrollBy({ left: 200, behavior: 'smooth' })
                  }
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide people-scroll-container">
          <AnimatePresence>
            {people.map((person: Person, index: number) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <PersonChip
                  person={person}
                  editorToken={editorToken || ''}
                  billToken={billToken}
                  onUpdate={() => queryClient.invalidateQueries({ queryKey: ['people', billToken] })}
                  assignedItems={assignedByPerson[person.id] || []}
                  selectedItems={selectedItems}
                  onAssignSelected={(selectedItems) => {
                    console.log('Assigning items from PersonChip:', selectedItems, 'to person:', person.id)
                    handleAssignSelected(person.id)
                  }}
                  personTotal={personTotals?.get(person.id)}
                  ref={(el: PersonChipRef | null) => {
                    personChipRefs.current[person.id] = el
                  }}
                />
              </motion.div>
            ))}
            
            {/* Add Person ghost chip */}
            {editorToken && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: people.length * 0.05 }}
                className="snap-start shrink-0 w-[200px] h-[88px] rounded-xl bg-card border-2 border-dashed border-line shadow-soft p-3 hover:shadow-pop transition cursor-pointer flex items-center justify-center"
                onClick={handleAddPersonClick}
              >
                <div className="flex flex-col items-center text-ink-dim">
                  <Plus className="w-6 h-6 mb-1" />
                  <span className="text-sm font-medium">Add Person</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>

        {people.length === 0 && !isAdding && (
          <div className="text-center py-4 text-ink-dim">
            <p className="text-sm">No people added yet. Click the + chip to add someone!</p>
          </div>
        )}
      </div>
    </div>
  )
})
