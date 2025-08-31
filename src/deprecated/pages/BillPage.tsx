import React, { useState, useCallback, useRef, useMemo } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getBillByToken } from '@/lib/billUtils'
import { computeTotals } from '@/lib/computeTotals'
import { mockDataStore } from '@/lib/mockData'
import { ReceiptPanel } from '../components/ReceiptPanel'
import { PeopleDock } from '../components/PeopleDock'
import { CompactTotals } from '../components/TotalsPanel/CompactTotals'
import { SmokeCheck } from '../components/SmokeCheck'
import { ReceiptUploadModal } from '../components/ReceiptUploadModal'
import { showSuccess } from '../lib/toast'
import { useAssignItems } from '@/api/mutations'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'
import { DEBUG_UI } from '@/lib/flags'

// Sample bill token from seed data
const SAMPLE_BILL_TOKEN = 'e047f028995f1775e49463406db9943d'

export const BillPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  // Always call all hooks first, regardless of conditions
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const peopleDockRef = useRef<{ handleDropSuccess: (personId: string) => void } | null>(null)
  
  // Assignment mutation - always called
  const assignItemsMutation = useAssignItems(id || '')

  // Show toast on load in production - always called
  React.useEffect(() => {
    if (!import.meta.env.DEV && id && id !== 'new') {
      showSuccess('Bill loaded ✓')
    }
  }, [id])

  // Always call all queries with consistent conditions
  const { data: bill, isLoading: billLoading, error: billError } = useQuery({
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
      if (!isSupabaseAvailable()) {
        // Use the mock data store so changes persist
        return mockDataStore.getShares()
      }
      const { data, error } = await supabase.rpc('get_item_shares_by_token', {
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
  
  // Calculate totals - always called
  const billTotals = useMemo(() => {
    if (!bill || !items.length || !people.length) return null
    
    return computeTotals(
      items,
      shares,
      people.map(p => ({ ...p, is_paid: false })),
      bill.sales_tax,
      bill.tip,
      bill.tax_split_method,
      bill.tip_split_method,
      bill.include_zero_item_people
    )
  }, [bill, items, shares, people])

  // Debug logging - always called
  React.useEffect(() => {
    console.log('BillPage mounted with id:', id)
    console.log('DEV mode:', import.meta.env.DEV)
    console.log('DEBUG_UI:', DEBUG_UI)
    console.log('Environment variables:', {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '***PRESENT***' : 'MISSING'
    })
    console.log('Bill data:', bill)
    console.log('Items:', items)
    console.log('People:', people)
    console.log('Shares:', shares)
    console.log('BillTotals:', billTotals)
  }, [id, bill, items, people, shares, billTotals])
  
  // Convert person totals to a Map - always called
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

  // Event handlers - always defined
  const handleItemAssigned = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  const handleDropSuccess = useCallback((personId: string) => {
    peopleDockRef.current?.handleDropSuccess(personId)
  }, [])

  const handleItemSelect = useCallback((itemId: string) => {
    setSelectedItems(prev => [...prev, itemId])
  }, [])

  const handleItemDeselect = useCallback((itemId: string) => {
    setSelectedItems(prev => prev.filter(id => id !== itemId))
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])

  const handleAssignSelected = useCallback((assignedItems: string[], personId?: string) => {
    setSelectedItems([])
    handleItemAssigned()
  }, [handleItemAssigned])

  const handleAssignItems = useCallback((itemIds: string[], personId: string) => {
    assignItemsMutation.mutate(
      { itemIds, personId, editorToken: bill?.editor_token || '' },
      {
        onSuccess: () => {
          showSuccess(`Assigned ${itemIds.length} item(s)`)
          setSelectedItems([])
        },
        onError: (error) => {
          console.error('Error assigning items:', error)
        }
      }
    )
  }, [assignItemsMutation, bill?.editor_token])

  // ALL HOOKS MUST BE CALLED ABOVE THIS POINT

  // Now check for redirect AFTER all hooks are called
  if (id === 'new' && import.meta.env.DEV) {
    console.log('Redirecting to sample bill:', SAMPLE_BILL_TOKEN)
    return <Navigate to={`/bill/${SAMPLE_BILL_TOKEN}`} replace />
  }

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
    <div className="min-h-screen flex flex-col bg-paper">
      {/* Debug panel for development */}
      {DEBUG_UI && (
        <SmokeCheck billToken={id} />
      )}

      {/* Header with Upload Button */}
      <div className="sticky top-0 z-10 bg-paper/80 backdrop-blur-md border-b border-line px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-ink">
              {bill?.title || 'Loading...'}
            </h1>
            {bill?.place && (
              <span className="text-sm text-ink-dim">• {bill.place}</span>
            )}
          </div>
          
          <motion.button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-brand/10 text-brand hover:bg-brand/20 rounded-lg transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            📷 Upload Receipt
          </motion.button>
        </div>
      </div>

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
        
        {/* Compact Totals - sticky bottom */}
        <CompactTotals billTotals={billTotals} />
      </div>

      {/* Upload Modal */}
      <ReceiptUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onBillCreated={(token) => navigate(`/bill/${token}`)}
      />
    </div>
  )
}