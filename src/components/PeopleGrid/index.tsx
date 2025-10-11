import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'
import { getBillByToken } from '@/lib/billUtils'
import { showError, showSuccess } from '@/lib/exportUtils'
import { PersonCard } from '../PersonCard'
import { deriveAssignedMap } from '@/lib/computeTotals'
import { SkeletonCard } from '@/components/design-system'

interface PeopleGridProps {
  billToken?: string
}

interface Person {
  id: string
  name: string
  avatar_url?: string
  venmo_handle?: string
  is_archived: boolean
}

export const PeopleGrid: React.FC<PeopleGridProps> = ({ billToken }) => {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [newPerson, setNewPerson] = useState({
    name: '',
    avatar_url: '',
    venmo: ''
  })

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

  // Get editor token from bill data
  const { data: bill } = useQuery({
    queryKey: ['bill', billToken],
    queryFn: async () => {
      if (!isSupabaseAvailable()) {
        return {
          editor_token: 'mock-editor-token'
        }
      }
      return await getBillByToken(billToken!)
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

      const { data, error } = await supabase!.rpc('add_person_with_editor_token', {
        etoken: bill?.editor_token || '',
        bill_id: (bill as any)?.id || '',
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

  if (peopleLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">People</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} showAvatar={true} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (peopleError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">People</h2>
        </div>
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
          <div className="text-sm text-error">
            Error loading people: {peopleError instanceof Error ? peopleError.message : 'Unknown error'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">People</h2>
      </div>

      {/* Add Person Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface rounded-2xl p-4 border border-border"
          >
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Name"
                value={newPerson.name}
                onChange={(e) => setNewPerson(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                placeholder="Avatar (emoji)"
                value={newPerson.avatar_url}
                onChange={(e) => setNewPerson(prev => ({ ...prev, avatar_url: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                placeholder="Venmo handle"
                value={newPerson.venmo}
                onChange={(e) => setNewPerson(prev => ({ ...prev, venmo: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddPerson}
                  disabled={addPersonMutation.isPending}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {addPersonMutation.isPending ? 'Adding...' : 'Add Person'}
                </button>
                <button
                  onClick={handleCancelAdd}
                  className="px-4 py-2 bg-background text-text-primary rounded-lg border border-border hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* People cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
        <AnimatePresence>
          {people.map((person: Person, index: number) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <PersonCard
                person={person}
                editorToken={bill?.editor_token || ''}
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ['people', billToken] })}
                assignedItems={assignedByPerson[person.id] || []}
              />
            </motion.div>
          ))}
          
          {/* Add Person ghost card */}
          {bill?.editor_token && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: people.length * 0.1 }}
            >
              <PersonCard
                person={{
                  id: '',
                  name: '',
                  avatar_url: '',
                  venmo_handle: '',
                  is_archived: false
                }}
                editorToken=""
                onUpdate={() => {}}
                isAddPerson={true}
                onAddPerson={handleAddPersonClick}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {people.length === 0 && !isAdding && (
        <div className="text-center py-8 text-text-secondary">
          <p>No people added yet. Click the + card to add someone!</p>
        </div>
      )}

      {/* DEBUG: Temporary debug output */}
      <details className="mt-4 p-4 bg-gray-100 rounded-lg">
        <summary className="cursor-pointer font-mono text-sm">DEBUG: First 5 shares</summary>
        <pre className="mt-2 text-xs overflow-auto">
          {JSON.stringify(shares.slice(0, 5), null, 2)}
        </pre>
      </details>
    </div>
  )
}
