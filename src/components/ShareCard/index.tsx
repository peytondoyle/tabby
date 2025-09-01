import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, isSupabaseAvailable } from '../../lib/supabaseClient'
import { logServer } from '@/lib/errorLogger'

interface ShareCardProps {
  billToken: string
  mode: 'summary' | 'breakdown'
  className?: string
  isExport?: boolean
}

interface Bill {
  id: string
  title: string
  place: string
  date: string
  subtotal: number
  sales_tax: number
  tip: number
  total: number
}

interface Person {
  id: string
  name: string
  avatar_url?: string
  venmo_handle?: string
}

interface Item {
  id: string
  emoji: string
  label: string
  price: number
  quantity: number
}

interface ItemShare {
  item_id: string
  person_id: string
  weight: number
  share_amount: number
}

interface PersonTotals {
  person_id: string
  subtotal: number
  tax_share: number
  tip_share: number
  total: number
}

export const ShareCard: React.FC<ShareCardProps> = ({
  billToken,
  mode,
  className = '',
  isExport = false
}) => {
  const [bill, setBill] = useState<Bill | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [itemShares, setItemShares] = useState<ItemShare[]>([])
  const [personTotals, setPersonTotals] = useState<PersonTotals[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!isSupabaseAvailable()) {
          // Mock data for development
          setBill({
            id: 'mock-bill',
            title: 'Sample Restaurant',
            place: 'San Francisco, CA',
            date: new Date().toLocaleDateString(),
            subtotal: 85.50,
            sales_tax: 8.55,
            tip: 17.10,
            total: 111.15
          })
          setPeople([
            { id: 'p1', name: 'Alice', avatar_url: '👩‍💼' },
            { id: 'p2', name: 'Bob', avatar_url: '👨‍💻' },
            { id: 'p3', name: 'Charlie', avatar_url: '👨‍🍳' }
          ])
          setItems([
            { id: 'i1', emoji: '🍕', label: 'Margherita Pizza', price: 18.00, quantity: 1 },
            { id: 'i2', emoji: '🍝', label: 'Spaghetti Carbonara', price: 22.00, quantity: 1 },
            { id: 'i3', emoji: '🥗', label: 'Caesar Salad', price: 12.00, quantity: 1 },
            { id: 'i4', emoji: '🍷', label: 'House Red Wine', price: 15.00, quantity: 2 },
            { id: 'i5', emoji: '🍰', label: 'Tiramisu', price: 8.50, quantity: 1 }
          ])
          setItemShares([
            { item_id: 'i1', person_id: 'p1', weight: 1, share_amount: 18.00 },
            { item_id: 'i2', person_id: 'p2', weight: 1, share_amount: 22.00 },
            { item_id: 'i3', person_id: 'p3', weight: 1, share_amount: 12.00 },
            { item_id: 'i4', person_id: 'p1', weight: 0.5, share_amount: 7.50 },
            { item_id: 'i4', person_id: 'p2', weight: 0.5, share_amount: 7.50 },
            { item_id: 'i5', person_id: 'p3', weight: 1, share_amount: 8.50 }
          ])
          setPersonTotals([
            { person_id: 'p1', subtotal: 25.50, tax_share: 2.55, tip_share: 5.10, total: 33.15 },
            { person_id: 'p2', subtotal: 29.50, tax_share: 2.95, tip_share: 5.90, total: 38.35 },
            { person_id: 'p3', subtotal: 20.50, tax_share: 2.05, tip_share: 4.10, total: 26.65 }
          ])
          setLoading(false)
          return
        }

        // Fetch bill data
        const { data: billData, error: billError } = await supabase!.rpc('get_bill_by_token', {
          token: billToken
        })
        if (billError) throw billError
        setBill(billData)

        // Fetch people
        const { data: peopleData, error: peopleError } = await supabase!.rpc('get_people_by_token', {
          token: billToken
        })
        if (peopleError) throw peopleError
        setPeople(peopleData)

        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase!.rpc('get_items_by_token', {
          token: billToken
        })
        if (itemsError) throw itemsError
        setItems(itemsData)

        // Fetch item shares
        const { data: sharesData, error: sharesError } = await supabase!.rpc('get_item_shares_by_token', {
          token: billToken
        })
        if (sharesError) throw sharesError
        setItemShares(sharesData)

        // Calculate person totals
        const totals = peopleData.map((person: Person) => {
          const personShares = sharesData.filter((share: ItemShare) => share.person_id === person.id)
          const subtotal = personShares.reduce((sum: number, share: ItemShare) => sum + share.share_amount, 0)
          const taxShare = (subtotal / billData.subtotal) * billData.sales_tax
          const tipShare = (subtotal / billData.subtotal) * billData.tip
          const total = subtotal + taxShare + tipShare
          
          return {
            person_id: person.id,
            subtotal,
            tax_share: taxShare,
            tip_share: tipShare,
            total
          }
        })
        setPersonTotals(totals)

        setLoading(false)
      } catch (err) {
        console.error('Error fetching share data:', err)
        logServer('error', 'Failed to fetch share data', { error: err, context: 'ShareCard.fetchData' })
        setError('Failed to load receipt data')
        setLoading(false)
      }
    }

    fetchData()
  }, [billToken])

  if (loading) {
    return (
      <div className={`max-w-[560px] mx-auto bg-card border border-line rounded-2xl shadow-soft p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-paper rounded"></div>
          <div className="h-4 bg-paper rounded w-2/3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-paper rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !bill) {
    return (
      <div className={`max-w-[560px] mx-auto bg-card border border-line rounded-2xl shadow-soft p-6 ${className}`}>
        <div className="text-center text-ink-dim">
          <p>Unable to load receipt</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <div className={`max-w-[560px] mx-auto bg-card border border-line rounded-2xl shadow-soft p-6 ${className} ${isExport ? 'print:shadow-none print:border-0' : ''}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="font-mono text-xl font-semibold text-ink tracking-wide mb-1">
          {bill.title}
        </h1>
        <p className="text-sm text-ink-dim">
          {bill.place} • {formatDate(bill.date)}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'summary' ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Summary Table */}
            <div className="space-y-3 mb-6">
              {people.map((person) => {
                const totals = personTotals.find(t => t.person_id === person.id)
                return (
                  <div key={person.id} className="flex items-center justify-between p-3 bg-paper/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{person.avatar_url || '👤'}</span>
                      <span className="font-medium text-ink">{person.name}</span>
                    </div>
                    <span className="font-mono font-semibold text-ink">
                      {totals ? formatCurrency(totals.total) : '$0.00'}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Bill Total */}
            <div className="border-t border-line pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-ink">Total Bill</span>
                <span className="font-mono text-xl font-bold text-ink">
                  {formatCurrency(bill.total)}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="breakdown"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Breakdown by Person */}
            <div className="space-y-6">
              {people.map((person) => {
                const totals = personTotals.find(t => t.person_id === person.id)
                const personItems = itemShares
                  .filter(share => share.person_id === person.id)
                  .map(share => {
                    const item = items.find(i => i.id === share.item_id)
                    return { ...share, item }
                  })
                  .filter(share => share.item)

                return (
                  <div key={person.id} className="border-b border-line pb-4 last:border-b-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-lg">{person.avatar_url || '👤'}</span>
                      <span className="font-medium text-ink">{person.name}</span>
                    </div>
                    
                    {/* Items */}
                    <div className="space-y-2 mb-3">
                      {personItems.map((share) => (
                        <div key={share.item_id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span>{share.item?.emoji}</span>
                            <span className="text-ink">{share.item?.label}</span>
                            {share.weight < 1 && (
                              <span className="px-1.5 py-0.5 bg-paper text-xs rounded-full text-ink-dim">
                                {share.weight === 0.5 ? '½' : `${Math.round(share.weight * 100)}%`}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-xs text-ink">
                            {formatCurrency(share.share_amount)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Person Totals */}
                    {totals && (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-ink-dim">Subtotal</span>
                          <span className="font-mono text-ink">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-dim">Tax</span>
                          <span className="font-mono text-ink">{formatCurrency(totals.tax_share)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-dim">Tip</span>
                          <span className="font-mono text-ink">{formatCurrency(totals.tip_share)}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-line pt-1">
                          <span className="text-ink">Total</span>
                          <span className="font-mono text-ink">{formatCurrency(totals.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-line text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-ink-dim">
          <span>🍽️</span>
          <span>Split with Tabby</span>
        </div>
      </div>
    </div>
  )
}
