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
        <h2 className="text-xl font-bold text-center mb-6 retro-text-shadow">Share Bill</h2>
        <div className="bg-gray-50 rounded-2xl p-5 retro-shadow">
          <h3 className="text-lg font-bold text-center">Billy's Cafe</h3>
          <p className="text-sm text-gray-600 text-center mb-4">Goodfood, USA • Aug 24, 2025</p>
          
          {people.map(person => {
            const personItems = getPersonItems(person.id)
            const personTotal = getPersonTotal(person.id)
            
            return (
              <div key={person.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center pixel-perfect">
                    <span className="text-sm">👤</span>
                  </div>
                  <span className="font-bold">{person.name} {person.last_name || (person.name === 'Louis' ? 'Gruber' : 'Doyle')}</span>
                </div>
                
                <div className="space-y-2 pl-10 font-mono text-sm">
                  {personItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <span className="pixel-perfect">{item.emoji}</span>
                        <span>{item.label}</span>
                      </div>
                      <span className="font-bold">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                  
                  {personTotal && (
                    <div className="pt-2 space-y-1 border-t border-gray-300">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-bold">${personTotal.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-bold">${personTotal.tax_share.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tip:</span>
                        <span className="font-bold">${personTotal.tip_share.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-gray-400">
                        <span>Total:</span>
                        <span>${personTotal.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          
          <div className="border-t-2 border-gray-400 pt-4 mt-4 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-bold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>SALES TAX:</span>
              <span className="font-bold">${salesTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tip:</span>
              <span className="font-bold">${tip.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t-2 border-black">
              <span>Bill Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">🍴 Split with Billy</p>
          </div>
        </div>
        <p className="text-center text-gray-400 text-sm mt-4 font-mono">Split by Person</p>
      </div>
    ),
    // Summary
    () => (
      <div className="p-6">
        <h2 className="text-xl font-bold text-center mb-6 retro-text-shadow">Share Bill</h2>
        <div className="bg-gray-50 rounded-2xl p-6 retro-shadow">
          <h3 className="text-2xl font-bold text-center retro-text-shadow">Billy's Cafe</h3>
          <p className="text-gray-600 text-center mb-6 font-mono">Goodfood, USA • Aug 24, 2025</p>
          
          <div className="space-y-4">
            {people.map(person => {
              const personTotal = getPersonTotal(person.id)
              return (
                <div key={person.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center pixel-perfect">
                      <span>👤</span>
                    </div>
                    <span className="font-bold text-lg">{person.name} {person.last_name || (person.name === 'Louis' ? 'Gruber' : 'Doyle')}</span>
                  </div>
                  <span className="text-lg font-bold font-mono">
                    ${personTotal ? personTotal.total.toFixed(2) : '0.00'}
                  </span>
                </div>
              )
            })}
          </div>
          
          <div className="border-t-2 border-gray-400 mt-6 pt-4">
            <div className="flex justify-between text-xl font-bold font-mono">
              <span>Bill Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">🍴 Split with Billy</p>
          </div>
        </div>
        <p className="text-center text-gray-400 text-sm mt-4 font-mono">Split Totals</p>
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
            initial={{ y: '100%', scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: '100%', scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden retro-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-4">
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
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
                  className={`w-3 h-3 rounded-full transition-colors pixel-perfect retro-shadow ${
                    currentPage === index ? 'bg-gray-800' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <div className="p-4 border-t-2 border-gray-200">
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl retro-shadow transition-all hover:translate-y-[-1px]">
                <div className="flex items-center justify-center gap-2 font-mono">
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

export const RetroBillPage: React.FC = () => {
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
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="text-4xl pixel-perfect">🔄</div>
          <div className="text-gray-600 font-mono font-bold mt-2">Loading bill...</div>
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
    <div className="min-h-screen bg-white">
      {/* Mobile View */}
      <div className="lg:hidden">
        <div className="max-w-screen-sm mx-auto w-full flex flex-col min-h-screen">
          {/* Mobile Header */}
          <div className="bg-white border-b-2 border-gray-300">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-12 bg-gray-100 rounded border-2 border-gray-300 flex items-center justify-center pixel-perfect retro-shadow">
                    <span className="text-xs">📄</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold retro-text-shadow">Billy's Cafe</h1>
                    <p className="text-sm text-gray-600 font-mono">Goodfood, USA • Aug 24, 2025</p>
                  </div>
                </div>
                <button onClick={() => setShowShareModal(true)} className="p-2 hover:bg-gray-100 rounded retro-shadow">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Mobile Tabs */}
            <div className="flex border-t-2 border-gray-300">
              <button
                className={`flex-1 py-3 font-bold font-mono relative ${
                  activeTab === 'items' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
                }`}
                onClick={() => setActiveTab('items')}
              >
                All Items
                {activeTab === 'items' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 pixel-perfect" />
                )}
              </button>
              <button
                className={`flex-1 py-3 font-bold font-mono relative ${
                  activeTab === 'person' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
                }`}
                onClick={() => setActiveTab('person')}
              >
                By Person
                {activeTab === 'person' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 pixel-perfect" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Content */}
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
                      <div key={item.id} className="flex items-center justify-between py-3 hover:bg-gray-50 rounded px-2 retro-shadow">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl pixel-perfect">{item.emoji}</span>
                          <span className="font-bold font-mono">{item.label}</span>
                        </div>
                        <span className="font-bold text-base font-mono">${item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-4 border-t-2 border-gray-300 space-y-3 font-mono">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-bold">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SALES TAX:</span>
                      <span className="font-bold">${salesTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tip:</span>
                      <span className="font-bold">${tip.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-black">
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
                        <div key={person.id} className="bg-gray-50 rounded-2xl p-4 retro-shadow border-2 border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center pixel-perfect border-2 border-gray-300">
                                <span>👤</span>
                              </div>
                              <span className="font-bold text-lg font-mono">{person.name}</span>
                            </div>
                            <span className="text-lg font-bold font-mono">${personTotal.toFixed(2)}</span>
                          </div>

                          <div className="space-y-2 pl-2 font-mono">
                            {personItems.map((item: any) => (
                              <div key={item.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg pixel-perfect">{item.emoji}</span>
                                  <span className="text-sm font-bold">{item.label}</span>
                                </div>
                                <span className="text-sm font-bold">${item.price.toFixed(2)}</span>
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

          {/* Mobile Bottom Options Button */}
          <div className="sticky bottom-0 bg-white border-t-2 border-gray-300 p-4">
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-xl retro-shadow border-2 border-blue-200 transition-all hover:translate-y-[-1px]"
            >
              <div className="flex items-center justify-center gap-2 font-mono">
                <span className="text-2xl leading-none">•••</span>
                <span>Options</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Desktop Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-20 bg-gray-100 rounded border-2 border-gray-300 flex items-center justify-center pixel-perfect retro-shadow">
                  <span className="text-lg">📄</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold retro-text-shadow">Billy's Cafe</h1>
                  <p className="text-lg text-gray-600 font-mono">Goodfood, USA • Aug 24, 2025</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl retro-shadow transition-all hover:translate-y-[-1px] font-mono"
              >
                Share Bill
              </button>
            </div>
          </div>

          {/* Desktop Content - Side by Side Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Receipt Items Panel */}
            <div className="bg-white rounded-2xl border-2 border-gray-300 retro-shadow p-6">
              <h2 className="text-2xl font-bold mb-4 retro-text-shadow font-mono">Receipt Items</h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-3 retro-shadow border border-gray-200">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl pixel-perfect">{item.emoji}</span>
                      <span className="font-bold text-lg font-mono">{item.label}</span>
                    </div>
                    <span className="font-bold text-lg font-mono">${item.price.toFixed(2)}</span>
                  </div>
                ))}
                
                <div className="mt-8 pt-4 border-t-2 border-gray-300 space-y-4 font-mono">
                  <div className="flex justify-between text-lg">
                    <span>Subtotal:</span>
                    <span className="font-bold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>SALES TAX:</span>
                    <span className="font-bold">${salesTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>Tip:</span>
                    <span className="font-bold">${tip.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-bold pt-4 border-t-2 border-black">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* People Panel */}
            <div className="bg-white rounded-2xl border-2 border-gray-300 retro-shadow p-6">
              <h2 className="text-2xl font-bold mb-4 retro-text-shadow font-mono">Split by Person</h2>
              <div className="space-y-4">
                {people.map((person) => {
                  const personItems = getPersonItems(person.id)
                  const personTotal = getPersonTotal(person.id)
                  
                  return (
                    <div key={person.id} className="bg-gray-50 rounded-2xl p-5 retro-shadow border-2 border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center pixel-perfect border-2 border-gray-300">
                            <span className="text-lg">👤</span>
                          </div>
                          <span className="font-bold text-xl font-mono">{person.name}</span>
                        </div>
                        <span className="text-xl font-bold font-mono">${personTotal.toFixed(2)}</span>
                      </div>

                      <div className="space-y-3 pl-4 font-mono">
                        {personItems.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xl pixel-perfect">{item.emoji}</span>
                              <span className="font-bold">{item.label}</span>
                            </div>
                            <span className="font-bold">${item.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
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