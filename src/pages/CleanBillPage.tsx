import React, { useState, useMemo } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getBillByToken } from '@/lib/billUtils'
import { computeTotals } from '@/lib/computeTotals'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'

const SAMPLE_BILL_TOKEN = 'e047f028995f1775e49463406db9943d'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  items: any[]
  shares: any[]
  people: any[]
  billTotals: any
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, items, shares, people, billTotals }) => {
  const [currentPage, setCurrentPage] = useState(0)
  
  const getPersonItems = (personId: string) => {
    const personShares = shares.filter(s => s.person_id === personId)
    return personShares.map(share => {
      const item = items.find(i => i.id === share.item_id)
      return item ? { ...item, share } : null
    }).filter(Boolean)
  }

  const getPersonTotal = (personId: string) => {
    if (!billTotals) return null
    return billTotals.person_totals.find((pt: any) => pt.person_id === personId)
  }

  const subtotal = 60.14
  const salesTax = 5.16
  const tip = 13.06
  const total = 78.36

  const pages = [
    // Detailed breakdown
    () => (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-center mb-6">Share Bill</h2>
        <div className="bg-gray-50 rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-center">Billy's Cafe</h3>
          <p className="text-sm text-gray-500 text-center mb-4">Goodfood, USA • Aug 24, 2025</p>
          
          {people.map(person => {
            const personItems = getPersonItems(person.id)
            const personTotal = getPersonTotal(person.id)
            
            return (
              <div key={person.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm">👤</span>
                  </div>
                  <span className="font-semibold">{person.name} {person.last_name || 'Gruber'}</span>
                </div>
                
                <div className="space-y-2 pl-10">
                  {personItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{item.emoji}</span>
                        <span>{item.label}</span>
                      </div>
                      <span>${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                  
                  {personTotal && (
                    <div className="pt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span>${personTotal.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax:</span>
                        <span>${personTotal.tax_share.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tip:</span>
                        <span>${personTotal.tip_share.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1 border-t">
                        <span>Total:</span>
                        <span>${personTotal.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          
          <div className="border-t pt-4 mt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>SALES TAX:</span>
              <span>${salesTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tip:</span>
              <span>${tip.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2">
              <span>Bill Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">🍴 Split with Billy</p>
          </div>
        </div>
        <p className="text-center text-gray-400 text-sm mt-4">Split by Person</p>
      </div>
    ),
    // Summary
    () => (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-center mb-6">Share Bill</h2>
        <div className="bg-gray-50 rounded-2xl p-6">
          <h3 className="text-2xl font-bold text-center">Billy's Cafe</h3>
          <p className="text-gray-500 text-center mb-6">Goodfood, USA • Aug 24, 2025</p>
          
          <div className="space-y-4">
            {people.map(person => {
              const personTotal = getPersonTotal(person.id)
              return (
                <div key={person.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span>👤</span>
                    </div>
                    <span className="font-semibold text-lg">{person.name} {person.last_name || (person.name === 'Louis' ? 'Gruber' : 'Doyle')}</span>
                  </div>
                  <span className="text-lg font-bold">
                    ${personTotal ? personTotal.total.toFixed(2) : '0.00'}
                  </span>
                </div>
              )
            })}
          </div>
          
          <div className="border-t mt-6 pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span>Bill Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">🍴 Split with Billy</p>
          </div>
        </div>
        <p className="text-center text-gray-400 text-sm mt-4">Split Totals</p>
      </div>
    )
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-4">
              <button onClick={onClose} className="text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              {pages[currentPage]()}
            </div>
            
            <div className="flex justify-center gap-2 pb-4">
              {pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    currentPage === index ? 'bg-gray-800' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <div className="p-4 border-t">
              <button className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
                  </svg>
                  Share Receipt
                </div>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const CleanBillPage: React.FC = () => {
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
        return [
          { item_id: '1', person_id: 'p2', weight: 1 },
          { item_id: '2', person_id: 'p2', weight: 1 },
          { item_id: '3', person_id: 'p2', weight: 1 },
          { item_id: '4', person_id: 'p1', weight: 1 },
          { item_id: '5', person_id: 'p1', weight: 1 },
          { item_id: '6', person_id: 'p1', weight: 1 },
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
      5.16,
      13.06,
      'proportional',
      'proportional',
      false
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

  const getPersonItems = (personId: string) => {
    const personShares = shares.filter(s => s.person_id === personId)
    return personShares.map(share => {
      const item = items.find(i => i.id === share.item_id)
      return item ? { ...item, share } : null
    }).filter(Boolean)
  }

  const getPersonTotal = (personId: string) => {
    if (!billTotals) return 0
    const personTotal = billTotals.person_totals.find((pt: any) => pt.person_id === personId)
    return personTotal ? personTotal.total : 0
  }

  const subtotal = 60.14
  const salesTax = 5.16
  const tip = 13.06
  const total = 78.36

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="max-w-screen-sm mx-auto w-full flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-12 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-xs">📄</span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Billy's Cafe</h1>
                  <p className="text-sm text-gray-500">Goodfood, USA • Aug 24, 2025</p>
                </div>
              </div>
              <button onClick={() => setShowShareModal(true)} className="p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex">
            <button
              className={`flex-1 py-3 text-sm font-medium relative ${
                activeTab === 'items' ? 'text-blue-600' : 'text-gray-400'
              }`}
              onClick={() => setActiveTab('items')}
            >
              All Items
              {activeTab === 'items' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium relative ${
                activeTab === 'person' ? 'text-blue-600' : 'text-gray-400'
              }`}
              onClick={() => setActiveTab('person')}
            >
              By Person
              {activeTab === 'person' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'items' ? (
              <motion.div
                key="items"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.emoji}</span>
                        <span className="font-normal text-base">{item.label}</span>
                      </div>
                      <span className="font-semibold text-base">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SALES TAX:</span>
                    <span className="font-semibold">${salesTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tip:</span>
                    <span className="font-semibold">${tip.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-3">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="person"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <div className="space-y-4">
                  {people.map((person) => {
                    const personItems = getPersonItems(person.id)
                    const personTotal = getPersonTotal(person.id)
                    
                    return (
                      <div key={person.id} className="bg-gray-50 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span>👤</span>
                            </div>
                            <span className="font-semibold text-lg">{person.name}</span>
                          </div>
                          <span className="text-lg font-bold">${personTotal.toFixed(2)}</span>
                        </div>

                        <div className="space-y-2 pl-2">
                          {personItems.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{item.emoji}</span>
                                <span className="text-sm">{item.label}</span>
                              </div>
                              <span className="text-sm font-medium">${item.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Options Button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <button
            onClick={() => setShowShareModal(true)}
            className="w-full py-3 bg-blue-50 text-blue-600 font-medium rounded-xl"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl leading-none">•••</span>
              <span>Options</span>
            </div>
          </button>
        </div>

        {/* Bottom Navigation - Hidden for now */}
        <div className="hidden">
          <div className="flex justify-around py-2 border-t">
            <button className="flex flex-col items-center p-2 text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs mt-1">People</span>
            </button>
            <button className="flex flex-col items-center p-2 text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs mt-1">Receipt</span>
            </button>
            <button className="flex flex-col items-center p-2 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
              </svg>
              <span className="text-xs mt-1">Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        items={items}
        shares={shares}
        people={people}
        billTotals={billTotals}
      />
    </div>
  )
}