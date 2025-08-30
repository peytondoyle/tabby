import React, { useState } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBillByToken } from '@/lib/billUtils'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'
import { DndContext, DragOverlay, useDraggable, closestCenter } from '@dnd-kit/core'
import { ReceiptScanner } from '@/components/ReceiptScanner'
import { getCurrentDate } from '@/lib/receiptScanning'
import { PersonCard } from '@/components/PersonCard'

const SAMPLE_BILL_TOKEN = 'e047f028995f1775e49463406db9943d'

interface SplitModalProps {
  isOpen: boolean
  onClose: () => void
  item: any
  people: any[]
  onSplit: (itemId: string, peopleIds: string[]) => void
}

const SplitModal: React.FC<SplitModalProps> = ({ isOpen, onClose, item, people, onSplit }) => {
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])

  const handlePersonToggle = (personId: string) => {
    setSelectedPeople(prev => 
      prev.includes(personId) 
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    )
  }

  const handleSplit = () => {
    if (selectedPeople.length >= 2) {
      onSplit(item?.id, selectedPeople)
      onClose()
      setSelectedPeople([])
    }
  }

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="bg-gray-900 rounded-t-3xl w-full max-w-md p-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Split</h2>
              <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">{item.emoji}</span>
                <span className="font-bold">{item.label}</span>
              </div>
              <p className="text-xl font-bold mt-2">between</p>
            </div>

            <div className="space-y-4 mb-6">
              {people.map(person => (
                <button
                  key={person.id}
                  onClick={() => handlePersonToggle(person.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    selectedPeople.includes(person.id)
                      ? 'bg-blue-600 border-2 border-blue-400'
                      : 'bg-gray-800 border-2 border-gray-700'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedPeople.includes(person.id)
                      ? 'border-white bg-white'
                      : 'border-gray-400'
                  }`}>
                    {selectedPeople.includes(person.id) && (
                      <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    {person.name.charAt(0)}
                  </div>
                  <span className="text-lg font-semibold">{person.name}</span>
                </button>
              ))}
            </div>

            <div className="text-center text-gray-400 mb-4">
              Select at least 2 people
            </div>

            <button
              onClick={handleSplit}
              disabled={selectedPeople.length < 2}
              className={`w-full py-4 rounded-2xl font-bold transition-all ${
                selectedPeople.length >= 2
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Split Item
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface DraggableItemProps {
  item: any
  onSplit: (item: any) => void
}

const DraggableItem: React.FC<DraggableItemProps> = ({ item, onSplit }) => {
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
      onDoubleClick={() => onSplit(item)}
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
  const [splitModalItem, setSplitModalItem] = useState<any>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  
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

  const handleSplit = (item: any) => {
    setSplitModalItem(item)
  }

  const handleSplitBetween = (itemId: string, peopleIds: string[]) => {
    splitItemMutation.mutate({ itemId, peopleIds })
  }

  const activeItem = activeId ? items.find(item => item.id === activeId) : null

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
            <div className="absolute top-0 left-0">
              <button
                onClick={() => navigate('/bills')}
                className="p-2 text-ink-dim hover:text-ink bg-card rounded-full shadow-soft"
                title="Back to My Bills"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
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
                  onSplit={handleSplit}
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

          {/* Bottom Navigation */}
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
            <button className="bg-gray-800 p-4 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
            <button className="bg-gray-800 p-4 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
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

        {/* Split Modal */}
        <SplitModal
          isOpen={!!splitModalItem}
          onClose={() => setSplitModalItem(null)}
          item={splitModalItem}
          people={people}
          onSplit={handleSplitBetween}
        />
      </DndContext>

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