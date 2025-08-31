import React, { useState, useCallback, useRef, useMemo } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getBillByToken } from '@/lib/billUtils'
import { computeTotals } from '@/lib/computeTotals'
import { ReceiptPanel } from '../components/ReceiptPanel'
import { PeopleDock } from '../components/PeopleDock'
import { CompactTotals } from '../components/TotalsPanel/CompactTotals'
import { BillSettings } from '../components/BillSettings'
import { SmokeCheck } from '../components/SmokeCheck'
import { showSuccess } from '../lib/toast'
import { useAssignItems } from '@/api/mutations'
import { supabase } from '@/lib/supabaseClient'
import { DEBUG_UI } from '@/lib/flags'




// Sample bill token from seed data
const SAMPLE_BILL_TOKEN = 'e047f028995f1775e49463406db9943d'

export const BillPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  
  // For testing: redirect 'new' to sample bill in development (MUST be before other hooks)
  if (id === 'new' && import.meta.env.DEV) {
    console.log('Redirecting to sample bill:', SAMPLE_BILL_TOKEN)
    return <Navigate to={`/bill/${SAMPLE_BILL_TOKEN}`} replace />
  }
  
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const peopleDockRef = useRef<{ handleDropSuccess: (personId: string) => void } | null>(null)
  
  // Assignment mutation
  const assignItemsMutation = useAssignItems(id || '')

  // Show toast on load in production
  React.useEffect(() => {
    if (!import.meta.env.DEV && id && id !== 'new') {
      showSuccess('Bill loaded ✓')
    }
  }, [id])

  // Get editor token from bill data
  const { data: bill, isLoading: billLoading, error: billError } = useQuery({
    queryKey: ['bill', id],
    queryFn: async () => {
      if (!id || id === 'new') return null
      return await getBillByToken(id)
    },
    enabled: !!id && id !== 'new'
  })
  
  // Show loading state
  if (billLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-2xl">🔄</div>
          <div className="text-ink-dim">Loading bill...</div>
        </div>
      </div>
    )
  }
  
  // Show error state
  if (billError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-2xl">❌</div>
          <div className="text-ink-dim">Error loading bill</div>
          <div className="text-xs text-red-500 mt-2">{String(billError)}</div>
        </div>
      </div>
    )
  }
  
  // Fetch items, shares, and people for math calculations
  const { data: items = [] } = useQuery({
    queryKey: ['items', id],
    queryFn: async () => {
      if (!id || id === 'new') return []
      if (!supabase) {
        // Return mock items for development
        return [
          { id: '1', emoji: '🍕', label: 'Large Pizza', price: 24.00, quantity: 1, unit_price: 24.00 },
          { id: '2', emoji: '🍺', label: 'Beer (2x)', price: 12.00, quantity: 2, unit_price: 6.00 },
          { id: '3', emoji: '🥗', label: 'Caesar Salad', price: 14.00, quantity: 1, unit_price: 14.00 }
        ]
      }
      const { data, error } = await supabase.rpc('get_items_by_token', {
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
      if (!supabase) {
        // Return mock shares for development
        return [
          { item_id: '1', person_id: 'p1', weight: 0.5 }, // Alice gets half pizza
          { item_id: '1', person_id: 'p2', weight: 0.5 }, // Bob gets half pizza
          { item_id: '2', person_id: 'p2', weight: 1 },   // Bob gets both beers
          { item_id: '3', person_id: 'p3', weight: 1 }    // Charlie gets salad
        ]
      }
      const { data, error } = await supabase.rpc('get_shares_by_token', {
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
      if (!supabase) {
        // Return mock people for development
        return [
          { id: 'p1', name: 'Alice', avatar_url: '👩', venmo_handle: 'alice-smith', is_archived: false },
          { id: 'p2', name: 'Bob', avatar_url: '👨', venmo_handle: 'bob-jones', is_archived: false },
          { id: 'p3', name: 'Charlie', avatar_url: '🧑', venmo_handle: 'charlie-brown', is_archived: false }
        ]
      }
      const { data, error } = await supabase.rpc('get_people_by_token', {
        bill_token: id
      })
      if (error) throw error
      return data || []
    },
    enabled: !!id && id !== 'new'
  })
  
  // Calculate totals using the math engine
  const billTotals = useMemo(() => {
    if (!bill || !items.length || !people.length) return null
    
    return computeTotals(
      items,
      shares,
      people.map(p => ({ ...p, is_paid: false })), // Add is_paid field
      bill.sales_tax,
      bill.tip,
      bill.tax_split_method,
      bill.tip_split_method,
      bill.include_zero_item_people
    )
  }, [bill, items, shares, people])

  const handleItemAssigned = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleDropSuccess = useCallback((personId: string) => {
    // Forward the drop success to the PeopleDock component
    peopleDockRef.current?.handleDropSuccess(personId)
  }, [])

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => [...prev, itemId])
  }

  const handleItemDeselect = (itemId: string) => {
    setSelectedItems(prev => prev.filter(id => id !== itemId))
  }

  const handleClearSelection = () => {
    setSelectedItems([])
  }

  const handleAssignSelected = (assignedItems: string[], personId?: string) => {
    // Clear selection after assignment
    setSelectedItems([])
    handleItemAssigned()
  }

  const handleAssignItems = (itemIds: string[], personId: string) => {
    assignItemsMutation.mutate(
      { itemIds, personId, editorToken: bill?.editor_token || '' },
      {
        onSuccess: () => {
          showSuccess(`Assigned ${itemIds.length} item(s)`)
          setSelectedItems([]) // Clear selection
        },
        onError: (error) => {
          console.error('Error assigning items:', error)
        }
      }
    )
  }

  
  // Debug: log the current id and data
  React.useEffect(() => {
    console.log('BillPage mounted with id:', id)
    console.log('DEV mode:', import.meta.env.DEV)
    console.log('DEBUG_UI:', DEBUG_UI)
    console.log('Bill data:', bill)
    console.log('Items:', items)
    console.log('People:', people)
    console.log('Shares:', shares)
    console.log('BillTotals:', billTotals)
  }, [id, bill, items, people, shares, billTotals])
  
  // Convert person totals to a Map for easy lookup
  const personTotalsMap = useMemo(() => {
    if (!billTotals) return undefined
    return new Map(billTotals.person_totals.map(pt => [
      pt.person_id, 
      {
        subtotal: pt.subtotal,
        tax_share: pt.tax_share,
        tip_share: pt.tip_share,
        total: pt.total
      }
    ]))
  }, [billTotals])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* DEBUG: SmokeCheck component for live data verification */}
      {DEBUG_UI && id && id !== 'new' && (
        <SmokeCheck billToken={id} />
      )}

      {/* Dock: Sticky people row */}
      <PeopleDock 
        ref={peopleDockRef}
        billToken={id} 
        editorToken={bill?.editor_token || ''} 
        selectedItems={selectedItems}
        onAssignSelected={handleAssignSelected}
        personTotals={personTotalsMap}
      />

      {/* Content: Receipt list + totals */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Receipt Panel - fills available space */}
        <div className="flex-1 overflow-y-auto">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <ReceiptPanel 
                billToken={id} 
                editorToken={bill?.editor_token || ''}
                selectedItems={selectedItems}
                onItemSelect={handleItemSelect}
                onItemDeselect={handleItemDeselect}
                onClearSelection={handleClearSelection}
                onAssignItems={handleAssignItems}
                key={`receipt-${refreshTrigger}`} 
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Bill Settings - temporarily disabled for debugging */}
        {/*{bill && (
          <div className="px-4 py-2">
            <BillSettings 
              bill={bill} 
              editorToken={bill.editor_token}
              onUpdate={() => setRefreshTrigger(prev => prev + 1)}
            />
          </div>
        )}*/}
        
        {/* Compact Totals - sticky bottom */}
        <CompactTotals billTotals={billTotals} />
      </div>
    </div>
  )
}
