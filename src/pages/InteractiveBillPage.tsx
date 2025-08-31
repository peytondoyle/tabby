import React, { useState } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBillByToken } from '@/lib/billUtils'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'
import { DndContext, DragOverlay, useDraggable, closestCenter } from '@dnd-kit/core'
import { ReceiptScanner } from '@/components/ReceiptScanner'
import { AddPeopleModal } from '@/components/AddPeopleModal'
import { DragDropAssign } from '@/components/DragDropAssign'
import { getCurrentDate } from '@/lib/receiptScanning'
import { PersonCard } from '@/components/PersonCard'

const SAMPLE_BILL_TOKEN = 'e047f028995f1775e49463406db9943d'


interface DraggableItemProps {
  item: any
}

const DraggableItem: React.FC<DraggableItemProps> = ({ item }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-yellow-600/20 border border-yellow-500/30 rounded-2xl p-3 cursor-grab active:cursor-grabbing transition-all hover:bg-yellow-600/30 ${
        isDragging ? 'opacity-50 z-50' : ''
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{item.emoji}</span>
          <span className="font-bold text-white">{item.label}</span>
        </div>
      </div>
    </motion.div>
  )
}


export const InteractiveBillPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  const [showAddPeople, setShowAddPeople] = useState(false)
  const [viewMode, setViewMode] = useState<'classic' | 'drag-drop'>('drag-drop')
  
  const { data: bill, isLoading: billLoading } = useQuery({
    queryKey: ['bill', id],
    queryFn: async () => {
      if (!id || id === 'new') return null
      return await getBillByToken(id)
    },
    enabled: !!id && id !== 'new'
  })
  
  const { data: items = [] } = useQuery({
    queryKey: ['items', id],
    queryFn: async () => {
      if (!id || id === 'new') return []
      if (!isSupabaseAvailable()) {
        return [
          { id: '1', emoji: '🍟', label: 'Large Waffle Fries', price: 4.50, quantity: 1 },
          { id: '2', emoji: '🥪', label: 'Chicken Sandwich', price: 11.05, quantity: 1 },
          { id: '3', emoji: '🍟', label: 'Medium Waffle Fries', price: 3.53, quantity: 2 },
          { id: '4', emoji: '🍗', label: '8 pc Nuggets', price: 6.75, quantity: 1 },
          { id: '5', emoji: '🥗', label: 'Cobb Salad w/ Nuggets', price: 12.85, quantity: 1 },
          { id: '6', emoji: '🍔', label: 'Deluxe No Cheese Meal', price: 13.95, quantity: 1 }
        ]
      }
      const { data, error } = await supabase!.rpc('get_items_by_token', {
        bill_token: id
      })
      if (error) throw error
      return data || []
    },
    enabled: !!id && id !== 'new'
  })

  const { data: shares = [] } = useQuery({
    queryKey: ['shares', id],
    queryFn: async () => {
      if (!id || id === 'new') return []
      if (!isSupabaseAvailable()) {
        return [] // Start with no assignments
      }
      const { data, error } = await supabase!.rpc('get_item_shares_by_token', {
        bill_token: id
      })
      if (error) throw error
      return data || []
    },
    enabled: !!id && id !== 'new'
  })
  
  const { data: people = [] } = useQuery({
    queryKey: ['people', id],
    queryFn: async () => {
      if (!id || id === 'new') return []
      if (!isSupabaseAvailable()) {
        return [
          { id: 'p1', name: 'Peyton', avatar_url: '👤', venmo_handle: 'peyton-doyle', is_archived: false },
          { id: 'p2', name: 'Maggie', avatar_url: '👤', venmo_handle: 'maggie-m', is_archived: false },
          { id: 'p3', name: 'Kaley', avatar_url: '👤', venmo_handle: 'kaley-k', is_archived: false }
        ]
      }
      const { data, error } = await supabase!.rpc('get_people_by_token', {
        bill_token: id
      })
      if (error) throw error
      return data || []
    },
    enabled: !!id && id !== 'new'
  })

  // Mutation for assigning items
  const assignItemMutation = useMutation({
    mutationFn: async ({ itemId, personId }: { itemId: string, personId: string }) => {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - mock assignment')
        return { item_id: itemId, person_id: personId, weight: 1 }
      }
      const { data, error } = await supabase!.rpc('upsert_item_share_with_editor_token', {
        etoken: bill?.editor_token || '',
        item_id: itemId,
        person_id: personId,
        weight: 1
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares', id] })
    }
  })

  // Mutation for splitting items between multiple people
  const splitItemMutation = useMutation({
    mutationFn: async ({ itemId, peopleIds }: { itemId: string, peopleIds: string[] }) => {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - mock split')
        return peopleIds.map(personId => ({ item_id: itemId, person_id: personId, weight: 1 / peopleIds.length }))
      }
      
      // Delete existing shares for this item
      await supabase!.rpc('delete_item_shares', {
        etoken: bill?.editor_token || '',
        item_id: itemId
      })
      
      // Create new shares
      const weight = 1 / peopleIds.length
      const promises = peopleIds.map(personId =>
        supabase!.rpc('upsert_item_share_with_editor_token', {
          etoken: bill?.editor_token || '',
          item_id: itemId,
          person_id: personId,
          weight
        })
      )
      
      const results = await Promise.all(promises)
      return results.map(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares', id] })
    }
  })

  if (id === 'new' && import.meta.env.DEV) {
    return <Navigate to={`/bill/${SAMPLE_BILL_TOKEN}`} replace />
  }

  if (billLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-paper">
        <div className="text-center">
          <div className="text-4xl">🔄</div>
          <div className="text-ink font-bold mt-2">Loading bill...</div>
        </div>
      </div>
    )
  }

  const getPersonItems = (personId: string) => {
    const personShares = shares.filter(s => s.person_id === personId)
    return personShares.map(share => {
      const item = items.find(i => i.id === share.item_id)
      return item ? { ...item, share } : null
    }).filter(Boolean)
  }

  const getPersonTotal = (personId: string) => {
    const personItems = getPersonItems(personId)
    return personItems.reduce((sum, item: any) => sum + (item.price / (item.share?.weight || 1)), 0)
  }

  const unassignedItems = items.filter(item => 
    !shares.some(share => share.item_id === item.id)
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const itemId = active.id
    const personId = over.id

    // Check if dropping on a person
    if (people.some(p => p.id === personId)) {
      assignItemMutation.mutate({ itemId, personId })
    }
  }


  const activeItem = activeId ? items.find(item => item.id === activeId) : null

  // Convert people data for DragDropAssign component
  const dragDropPeople = people.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar_url,
    color: `bg-${['blue', 'purple', 'pink', 'green', 'yellow'][Math.floor(Math.random() * 5)]}-500`
  }))

  // Convert items data for DragDropAssign component
  const dragDropItems = items.map(item => ({
    ...item,
    assignedTo: shares.filter(s => s.item_id === item.id).map(s => s.person_id)
  }))

  const handleAddPeople = (newPeople: any[]) => {
    // TODO: Add people to bill
    setShowAddPeople(false)
    queryClient.invalidateQueries({ queryKey: ['people', id] })
  }

  // Show drag-drop view if enabled
  if (viewMode === 'drag-drop' && people.length > 0) {
    return (
      <div className="min-h-screen bg-paper">
        {/* Header with toggle */}
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/bills')}
                className="p-2 text-gray-500 hover:text-gray-700 bg-white rounded-full shadow-md"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{bill?.title || 'New Bill'}</h1>
                <p className="text-gray-600">
                  {bill?.place || 'No location'} • {bill?.date ? new Date(bill.date).toLocaleDateString() : getCurrentDate().short}
                </p>
              </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">View:</span>
              <div className="flex bg-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('drag-drop')}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    viewMode === 'drag-drop'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Drag & Drop
                </button>
                <button
                  onClick={() => setViewMode('classic')}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    viewMode === 'classic'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Classic
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Drag Drop Assignment View */}
        <DragDropAssign
          people={dragDropPeople}
          items={dragDropItems}
          onItemAssign={(itemId, personId) => {
            assignItemMutation.mutate({ itemId, personId })
          }}
          onItemUnassign={(itemId, personId) => {
            // TODO: Implement unassign
            console.log('Unassign:', itemId, personId)
          }}
          onMultiAssign={(itemId, peopleIds) => {
            splitItemMutation.mutate({ itemId, peopleIds })
          }}
        />

        {/* Add People Modal */}
        <AddPeopleModal
          isOpen={showAddPeople}
          onClose={() => setShowAddPeople(false)}
          onAddPeople={handleAddPeople}
          existingPeople={dragDropPeople}
        />
      </div>
    )
  }

  // Classic view (original layout)
  return (
    <div className="min-h-screen bg-paper text-ink">
      <DndContext 
        collisionDetection={closestCenter}
        onDragStart={(event) => setActiveId(event.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="max-w-screen-sm mx-auto p-4">
          {/* Header */}
          <div className="text-center mb-6 relative">
            <div className="absolute top-0 left-0 flex items-center gap-2">
              <button
                onClick={() => navigate('/bills')}
                className="p-2 text-ink-dim hover:text-ink bg-card rounded-full shadow-soft"
                title="Back to My Bills"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {people.length > 0 && (
                <button
                  onClick={() => setViewMode('drag-drop')}
                  className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg text-sm font-bold"
                  title="Switch to Drag & Drop View"
                >
                  ✨ Try New View
                </button>
              )}
            </div>
            
            <h1 className="text-3xl font-bold">{bill?.title || 'New Bill'}</h1>
            <p className="text-ink-dim">
              {bill?.place || 'No location'} • {bill?.date ? new Date(bill.date).toLocaleDateString() : getCurrentDate().short}
            </p>
            <div className="absolute top-0 right-0 flex gap-3">
              <motion.button
                onClick={() => setShowReceiptScanner(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl font-bold shadow-pop retro-shadow pixel-perfect"
                title="Scan Receipt"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                📷 Add Items
              </motion.button>
              <motion.button 
                className="p-2 text-ink-dim hover:text-ink bg-card rounded-full shadow-soft"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="6" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="12" cy="18" r="2"/>
                </svg>
              </motion.button>
            </div>
          </div>

          {/* Add People Button if no people */}
          {people.length === 0 && (
            <motion.div 
              className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 border-2 border-dashed border-blue-500/30 rounded-2xl p-8 text-center mb-8"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-bold mb-2">No People Added Yet</h3>
              <p className="text-gray-600 mb-4">Add people to start splitting the bill</p>
              <motion.button
                onClick={() => setShowAddPeople(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-bold"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                + Add People
              </motion.button>
            </motion.div>
          )}

          {/* People Cards */}
          <div className="space-y-4 mb-8">
            {people.map(person => {
              const personItems = getPersonItems(person.id)
              const personTotals = {
                subtotal: personItems.reduce((sum, item: any) => sum + item.price, 0),
                tax_share: 0, // TODO: Calculate tax share
                tip_share: 0, // TODO: Calculate tip share  
                total: getPersonTotal(person.id)
              }
              
              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  editorToken={bill?.editor_token || ''}
                  onUpdate={() => queryClient.invalidateQueries({ queryKey: ['people', id] })}
                  assignedItems={personItems.map((item: any) => ({
                    item_id: item.id,
                    emoji: item.emoji,
                    label: item.label,
                    price: item.price,
                    quantity: item.quantity || 1,
                    weight: item.share?.weight || 1,
                    share_amount: item.price * (item.share?.weight || 1)
                  }))}
                  totals={personTotals}
                  isDragOver={false}
                  onDrop={(e: React.DragEvent) => {
                    e.preventDefault()
                    const itemId = e.dataTransfer?.getData('text/plain')
                    if (itemId) {
                      assignItemMutation.mutate({ itemId, personId: person.id })
                    }
                  }}
                />
              )
            })}
          </div>

          {/* Unassigned Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink retro-text-shadow">🍽️ Unassigned Items</h3>
              <motion.button
                onClick={() => setShowReceiptScanner(true)}
                className="flex items-center gap-2 px-3 py-1 bg-brand hover:bg-brand/90 text-white rounded-lg text-sm font-bold shadow-pop retro-shadow pixel-perfect"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                📷 + Add Items
              </motion.button>
            </div>
            
            {unassignedItems.length > 0 ? (
              unassignedItems.map(item => (
                <DraggableItem
                  key={item.id}
                  item={item}
                />
              ))
            ) : (
              <motion.div 
                className="bg-card border-2 border-dashed border-line rounded-2xl p-8 text-center retro-shadow"
                whileHover={{ scale: 1.02 }}
              >
                <motion.div 
                  className="text-6xl mb-4"
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  📄✨
                </motion.div>
                <p className="text-ink-dim mb-4 font-mono text-lg">No items yet!</p>
                <motion.button
                  onClick={() => setShowReceiptScanner(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand/90 text-white rounded-xl font-bold shadow-pop retro-shadow pixel-perfect mx-auto"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  📷 Scan Receipt to Add Items
                </motion.button>
              </motion.div>
            )}
          </div>

        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem && (
            <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-2xl p-3 cursor-grabbing opacity-90">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeItem.emoji}</span>
                <span className="font-bold text-white">{activeItem.label}</span>
              </div>
            </div>
          )}
        </DragOverlay>

      </DndContext>

      {/* Add People Modal */}
      <AddPeopleModal
        isOpen={showAddPeople}
        onClose={() => setShowAddPeople(false)}
        onAddPeople={handleAddPeople}
        existingPeople={dragDropPeople}
      />

      {/* Receipt Scanner */}
      <ReceiptScanner
        isOpen={showReceiptScanner}
        onClose={() => setShowReceiptScanner(false)}
        onBillCreated={(billToken) => {
          setShowReceiptScanner(false)
          navigate(`/bill/${billToken}`)
        }}
      />
    </div>
  )
}