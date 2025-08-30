import React, { useState, useMemo } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getBillByToken } from '@/lib/billUtils'
import { computeTotals } from '@/lib/computeTotals'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'
import { ShareBillModal } from '../components/ShareBillModal'
import { MobileReceiptView } from '../components/MobileReceiptView'
import { ByPersonView } from '../components/ByPersonView'
import { MobileBottomNav } from '../components/MobileBottomNav'

const SAMPLE_BILL_TOKEN = 'e047f028995f1775e49463406db9943d'

export const MobileBillPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<'items' | 'person'>('items')
  const [showShareModal, setShowShareModal] = useState(false)
  
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
          { id: '1', emoji: '🥧', label: "Shepherd's Pie", price: 12.99, quantity: 1, unit_price: 12.99 },
          { id: '2', emoji: '🍵', label: 'Mountain Mint Tea', price: 3.29, quantity: 1, unit_price: 3.29 },
          { id: '3', emoji: '🍔', label: 'Billy Burger', price: 13.99, quantity: 1, unit_price: 13.99 },
          { id: '4', emoji: '🍰', label: 'GOAT Cheesecake', price: 7.59, quantity: 1, unit_price: 7.59 },
          { id: '5', emoji: '🥗', label: 'Scapegoat Caesar', price: 11.79, quantity: 1, unit_price: 11.79 },
          { id: '6', emoji: '🍳', label: 'Baa-con and Eggs', price: 10.49, quantity: 1, unit_price: 10.49 }
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
        // Mock shares data with proper assignments
        return [
          { item_id: '1', person_id: 'p2', weight: 1 }, // Shepherd's Pie -> Peyton
          { item_id: '2', person_id: 'p2', weight: 1 }, // Mountain Mint Tea -> Peyton
          { item_id: '3', person_id: 'p2', weight: 1 }, // Billy Burger -> Peyton
          { item_id: '4', person_id: 'p1', weight: 1 }, // GOAT Cheesecake -> Louis
          { item_id: '5', person_id: 'p1', weight: 1 }, // Scapegoat Caesar -> Louis
          { item_id: '6', person_id: 'p1', weight: 1 }, // Baa-con and Eggs -> Louis
        ]
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
          { id: 'p1', name: 'Louis', avatar_url: '👤', venmo_handle: 'louis-gruber', is_archived: false },
          { id: 'p2', name: 'Peyton', avatar_url: '👤', venmo_handle: 'peyton-doyle', is_archived: false }
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
  
  const billTotals = useMemo(() => {
    if (!bill || !items.length || !people.length) return null
    
    return computeTotals(
      items,
      shares,
      people.map((p: any) => ({ ...p, is_paid: false })),
      bill.sales_tax || 5.16,
      bill.tip || 13.06,
      bill.tax_split_method || 'proportional',
      bill.tip_split_method || 'proportional',
      bill.include_zero_item_people || false
    )
  }, [bill, items, shares, people])

  if (id === 'new' && import.meta.env.DEV) {
    return <Navigate to={`/bill/${SAMPLE_BILL_TOKEN}`} replace />
  }

  if (billLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-2xl">🔄</div>
          <div className="text-gray-500">Loading bill...</div>
        </div>
      </div>
    )
  }

  const subtotal = items.reduce((sum: number, item: any) => sum + item.price, 0)
  const salesTax = bill?.sales_tax || 5.16
  const tip = bill?.tip || 13.06
  const total = subtotal + salesTax + tip

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-4 py-3 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-12 bg-gray-100 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-xs text-gray-400">📄</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold">Billy's Cafe</h1>
                <p className="text-sm text-gray-500">Goodfood, USA • Aug 24, 2025</p>
              </div>
            </div>
            <button 
              className="p-2"
              onClick={() => setShowShareModal(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-t border-gray-200">
          <button
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === 'items' ? 'text-blue-600' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('items')}
          >
            All Items
            {activeTab === 'items' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
              />
            )}
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === 'person' ? 'text-blue-600' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('person')}
          >
            By Person
            {activeTab === 'person' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
              />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'items' ? (
            <MobileReceiptView
              key="items"
              items={items}
              shares={shares}
              people={people}
              subtotal={subtotal}
              salesTax={salesTax}
              tip={tip}
              total={total}
            />
          ) : (
            <ByPersonView
              key="person"
              items={items}
              shares={shares}
              people={people}
              billTotals={billTotals}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Options Button - Mobile Only */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white p-4 md:hidden">
        <button
          onClick={() => setShowShareModal(true)}
          className="w-full py-3 bg-blue-100 text-blue-600 font-medium rounded-xl flex items-center justify-center gap-2"
        >
          <span className="text-lg">•••</span>
          Options
        </button>
      </div>
      
      {/* Desktop Actions - Hidden on Mobile */}
      <div className="hidden md:block sticky bottom-0 border-t border-gray-200 bg-white p-6">
        <div className="max-w-4xl mx-auto flex justify-end gap-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Share Bill
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNav onShareClick={() => setShowShareModal(true)} />

      {/* Share Modal */}
      <ShareBillModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        bill={bill}
        items={items}
        shares={shares}
        people={people}
        billTotals={billTotals}
      />
    </div>
  )
}