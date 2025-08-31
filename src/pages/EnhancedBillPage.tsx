import React, { useState, useRef } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBillByToken } from '@/lib/billUtils'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'

// New components
import { MultiAssignModal } from '@/components/MultiAssignModal'
import { ShareFlowModal } from '@/components/ShareFlowModal'
import { PersonReceiptCard } from '@/components/PersonReceiptCard'
import { GroupReceiptExport } from '@/components/GroupReceiptExport'
import { DragDropAssign } from '@/components/DragDropAssign'

// Existing components
import { ReceiptScanner } from '@/components/ReceiptScanner'
import { AddPeopleModal } from '@/components/AddPeopleModal'
import { getCurrentDate } from '@/lib/receiptScanning'

// Utils
import { 
  exportReceiptCard, 
  exportGroupReceipt, 
  shareContent, 
  createShareableText, 
  createIndividualShareText 
} from '@/lib/exportUtils'

const SAMPLE_BILL_TOKEN = 'e047f028995f1775e49463406db9943d'

interface Person {
  id: string
  name: string
  avatar?: string
  total: number
  itemCount: number
  items: Array<{
    id: string
    label: string
    price: number
    emoji: string
    weight?: number
    shareAmount: number
  }>
}

interface Item {
  id: string
  label: string
  price: number
  emoji: string
  quantity?: number
  assignedTo: string[]
}

export const EnhancedBillPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // UI State
  const [activeId, setActiveId] = useState<string | null>(null)
  
  // Modal states
  const [showMultiAssign, setShowMultiAssign] = useState(false)
  const [showShareFlow, setShowShareFlow] = useState(false)
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  const [showAddPeople, setShowAddPeople] = useState(false)
  
  // Selected items/people for modals
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [exportingPerson, setExportingPerson] = useState<string | null>(null)
  
  // Refs for export
  const personCardRef = useRef<HTMLDivElement>(null)
  const groupCardRef = useRef<HTMLDivElement>(null)

  // Data fetching (same as InteractiveBillPage)
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
      const { data, error } = await supabase!.rpc('get_items_by_token', { bill_token: id })
      if (error) throw error
      return data || []
    },
    enabled: !!id && id !== 'new'
  })

  const { data: shares = [] } = useQuery({
    queryKey: ['shares', id],
    queryFn: async () => {
      if (!id || id === 'new') return []
      if (!isSupabaseAvailable()) return []
      const { data, error } = await supabase!.rpc('get_item_shares_by_token', { bill_token: id })
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
          { id: 'p1', name: 'Peyton', avatar_url: null, venmo_handle: 'peyton-doyle' },
          { id: 'p2', name: 'Maggie', avatar_url: null, venmo_handle: 'maggie-m' },
          { id: 'p3', name: 'Kaley', avatar_url: null, venmo_handle: 'kaley-k' }
        ]
      }
      const { data, error } = await supabase!.rpc('get_people_by_token', { bill_token: id })
      if (error) throw error
      return data || []
    },
    enabled: !!id && id !== 'new'
  })

  // Mutations
  const assignItemMutation = useMutation({
    mutationFn: async ({ itemId, personId, weight = 1 }: { itemId: string, personId: string, weight?: number }) => {
      if (!isSupabaseAvailable()) return { item_id: itemId, person_id: personId, weight }
      const { data, error } = await supabase!.rpc('upsert_item_share_with_editor_token', {
        etoken: bill?.editor_token || '',
        item_id: itemId,
        person_id: personId,
        weight
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares', id] })
    }
  })

  const multiAssignMutation = useMutation({
    mutationFn: async ({ itemId, assignments }: { itemId: string, assignments: { personId: string; weight: number }[] }) => {
      if (!isSupabaseAvailable()) return assignments
      
      // Delete existing shares for this item
      await supabase!.rpc('delete_item_shares', {
        etoken: bill?.editor_token || '',
        item_id: itemId
      })
      
      // Create new shares
      const promises = assignments.map(({ personId, weight }) =>
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

  // Computed data
  const processedPeople: Person[] = people.map(person => {
    const personShares = shares.filter(s => s.person_id === person.id)
    const personItems = personShares.map(share => {
      const item = items.find(i => i.id === share.item_id)
      if (!item) return null
      return {
        id: item.id,
        label: item.label,
        price: item.price,
        emoji: item.emoji,
        weight: share.weight,
        shareAmount: item.price * share.weight
      }
    }).filter(Boolean) as Person['items']
    
    return {
      id: person.id,
      name: person.name,
      avatar: person.avatar_url,
      total: personItems.reduce((sum, item) => sum + item.shareAmount, 0),
      itemCount: personItems.length,
      items: personItems
    }
  })

  const billData = {
    title: bill?.title || 'New Bill',
    location: bill?.place || undefined,
    date: bill?.date || getCurrentDate().iso,
    subtotal: items.reduce((sum, item) => sum + item.price, 0),
    tax: bill?.sales_tax || 0,
    tip: bill?.tip || 0,
    total: items.reduce((sum, item) => sum + item.price, 0) + (bill?.sales_tax || 0) + (bill?.tip || 0)
  }

  const unassignedItems = items.filter(item => 
    !shares.some(share => share.item_id === item.id)
  )


  // Event handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const itemId = active.id as string
    const personId = over.id as string

    if (people.some(p => p.id === personId)) {
      assignItemMutation.mutate({ itemId, personId })
    }
  }

  const handleMultiAssign = (item: Item) => {
    setSelectedItem(item)
    setShowMultiAssign(true)
  }

  const handleMultiAssignSubmit = (itemId: string, assignments: { personId: string; weight: number }[]) => {
    multiAssignMutation.mutate({ itemId, assignments })
    setShowMultiAssign(false)
    setSelectedItem(null)
  }



  // Export handlers
  const handleExportIndividual = async (personId: string) => {
    const person = processedPeople.find(p => p.id === personId)
    if (!person || !personCardRef.current) return

    setExportingPerson(personId)
    
    // Wait for render
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      await exportReceiptCard(
        personCardRef.current,
        person.name,
        billData.title
      )
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setExportingPerson(null)
    }
  }

  const handleExportGroup = async () => {
    if (!groupCardRef.current) return
    
    // Wait for render
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      await exportGroupReceipt(groupCardRef.current, billData.title)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  // Share handlers
  const handleShareGroup = async () => {
    const shareData = createShareableText({
      billTitle: billData.title,
      location: billData.location,
      date: billData.date,
      people: processedPeople.map(p => ({ name: p.name, total: p.total })),
      total: billData.total
    })

    try {
      await shareContent(shareData)
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  const handleShareIndividual = async (personId: string) => {
    const person = processedPeople.find(p => p.id === personId)
    if (!person) return

    const shareData = createIndividualShareText({
      billTitle: billData.title,
      location: billData.location,
      date: billData.date,
      personName: person.name,
      items: person.items.map(item => ({
        label: item.label,
        emoji: item.emoji,
        price: item.price,
        weight: item.weight
      })),
      total: person.total
    })

    try {
      await shareContent(shareData)
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  // Route guards
  if (id === 'new' && import.meta.env.DEV) {
    return <Navigate to={`/bill/${SAMPLE_BILL_TOKEN}`} replace />
  }

  if (billLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-white font-bold">Loading bill...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/bills')}
                className="p-2 text-gray-400 hover:text-white bg-gray-700 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold">{billData.title}</h1>
                <p className="text-gray-400">
                  {billData.location && `${billData.location} • `}
                  {new Date(billData.date).toLocaleDateString()}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto p-6">
          {/* Bill Summary Toggle */}

          {/* Assignment Interface */}
          {viewMode === 'assignment' && (
            <div className="mt-8">
              {people.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-2xl font-bold mb-4">Add People to Split</h3>
                  <button
                    onClick={() => setShowAddPeople(true)}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold"
                  >
                    + Add People
                  </button>
                </div>
              ) : (
                <DragDropAssign
                  people={people.map(p => ({
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar_url,
                    color: 'bg-blue-500'
                  }))}
                  items={items.map(item => ({
                    ...item,
                    assignedTo: shares.filter(s => s.item_id === item.id).map(s => s.person_id)
                  }))}
                  onItemAssign={(itemId, personId) => {
                    assignItemMutation.mutate({ itemId, personId })
                  }}
                  onItemUnassign={() => {}} // Not used in current implementation
                  onMultiAssign={(itemId) => {
                    const item = items.find(i => i.id === itemId)
                    if (item) {
                      handleMultiAssign({ ...item, assignedTo: [] })
                    }
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && (
            <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {items.find(item => item.id === activeId)?.emoji}
                </span>
                <span className="font-bold text-white">
                  {items.find(item => item.id === activeId)?.label}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>


      {/* Hidden Export Components */}
      <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none">
        {exportingPerson && (
          <PersonReceiptCard
            ref={personCardRef}
            person={processedPeople.find(p => p.id === exportingPerson)!}
            items={processedPeople.find(p => p.id === exportingPerson)?.items || []}
            billData={billData}
            totals={{
              subtotal: processedPeople.find(p => p.id === exportingPerson)?.total || 0,
              taxShare: 0,
              tipShare: 0,
              total: processedPeople.find(p => p.id === exportingPerson)?.total || 0
            }}
          />
        )}
        
        <GroupReceiptExport
          ref={groupCardRef}
          billData={billData}
          people={processedPeople}
          allItems={items.map(item => ({
            ...item,
            assignedTo: shares.filter(s => s.item_id === item.id).map(s => s.person_id)
          }))}
        />
      </div>

      {/* Modals */}
      <MultiAssignModal
        isOpen={showMultiAssign}
        onClose={() => {
          setShowMultiAssign(false)
          setSelectedItem(null)
        }}
        item={selectedItem}
        people={people}
        onAssign={handleMultiAssignSubmit}
      />


      <ShareFlowModal
        isOpen={showShareFlow}
        onClose={() => setShowShareFlow(false)}
        people={processedPeople}
        billData={billData}
        onShareGroup={handleShareGroup}
        onShareIndividual={handleShareIndividual}
        onExportGroup={handleExportGroup}
        onExportIndividual={handleExportIndividual}
      />

      <AddPeopleModal
        isOpen={showAddPeople}
        onClose={() => setShowAddPeople(false)}
        onAddPeople={(newPeople) => {
          // TODO: Add people to bill
          setShowAddPeople(false)
          queryClient.invalidateQueries({ queryKey: ['people', id] })
        }}
      />

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