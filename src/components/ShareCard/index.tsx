import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, isSupabaseAvailable } from '../../lib/supabaseClient'
import { logServer } from '@/lib/errorLogger'
import { SkeletonText, TextWithTooltip } from '@/components/design-system'
import { Card } from '@/components/design-system'

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

        // Fetch item shares (only has weight, not share_amount - we calculate it)
        const { data: sharesData, error: sharesError } = await supabase!.rpc('get_item_shares_by_token', {
          token: billToken
        })
        if (sharesError) throw sharesError

        // Calculate share_amount from weights and item prices
        // Group shares by item to compute total weight per item
        const itemWeightTotals = new Map<string, number>()
        sharesData.forEach((share: { item_id: string; weight: number }) => {
          const current = itemWeightTotals.get(share.item_id) || 0
          itemWeightTotals.set(share.item_id, current + share.weight)
        })

        // Now compute share_amount for each share
        const sharesWithAmounts: ItemShare[] = sharesData.map((share: { item_id: string; person_id: string; weight: number }) => {
          const item = itemsData.find((i: Item) => i.id === share.item_id)
          const totalWeight = itemWeightTotals.get(share.item_id) || 1
          const shareAmount = item ? Math.round(((share.weight / totalWeight) * item.price) * 100) / 100 : 0
          return {
            ...share,
            share_amount: shareAmount
          }
        })
        setItemShares(sharesWithAmounts)

        // Calculate person totals with proper rounding
        const totals = peopleData.map((person: Person) => {
          const personShares = sharesWithAmounts.filter((share: ItemShare) => share.person_id === person.id)
          const subtotal = Math.round(personShares.reduce((sum: number, share: ItemShare) => sum + share.share_amount, 0) * 100) / 100
          const taxShare = billData.subtotal > 0 ? Math.round(((subtotal / billData.subtotal) * billData.sales_tax) * 100) / 100 : 0
          const tipShare = billData.subtotal > 0 ? Math.round(((subtotal / billData.subtotal) * billData.tip) * 100) / 100 : 0
          const total = Math.round((subtotal + taxShare + tipShare) * 100) / 100

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
      <CardShell className={`max-w-[560px] mx-auto p-4 sm:p-5 ${className}`}>
        <div className="space-y-4">
          <SkeletonText lines={1} className="h-6" />
          <SkeletonText lines={1} className="h-4 w-2/3" />
          <SkeletonText lines={3} />
        </div>
      </CardShell>
    )
  }

  if (error || !bill) {
    return (
      <CardShell className={`max-w-[560px] mx-auto p-4 sm:p-5 ${className}`}>
        <div className="text-center text-text-secondary">
          <p>Unable to load receipt</p>
        </div>
      </CardShell>
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
    <div className={`w-[720px] max-w-full bg-white text-black p-6 ${className} ${isExport ? 'print:shadow-none print:border-0' : ''}`}>
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">{bill.title}</h1>
        <div className="text-sm text-text-secondary">{`${bill.place} • ${formatDate(bill.date)}`}</div>
      </header>

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
            <div className="space-y-2 mb-4">
              {people.map((person) => {
                const totals = personTotals.find(t => t.person_id === person.id)
                return (
                  <div key={person.id} className="flex items-center justify-between p-3 bg-surface/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{person.avatar_url || '👤'}</span>
                      <span className="font-medium text-text-primary">{person.name}</span>
                    </div>
                    <span className="price-tabular font-semibold text-text-primary">
                      {totals ? formatCurrency(totals.total) : '$0.00'}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Bill Total */}
            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-text-primary">Total Bill</span>
                <span className="price-tabular text-xl font-bold text-text-primary">
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
            <div className="space-y-4">
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
                  <div key={person.id} className="border-b border-border pb-3 last:border-b-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{person.avatar_url || '👤'}</span>
                      <span className="font-bold text-text-primary">{person.name}'s Share</span>
                    </div>

                    {/* Items */}
                    <section className="divide-y divide-border">
                      {personItems.map((share) => (
                        <div key={share.item_id} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-x-3 py-2">
                          <span className="text-base leading-none">{share.item?.emoji ?? '•'}</span>
                          <span className="text-sm">{share.item?.label}</span>
                          <span className="price-tabular text-sm">{formatCurrency(share.share_amount)}</span>
                        </div>
                      ))}
                    </section>

                    {/* Person Totals */}
                    {totals && (
                      <section className="mt-3 border-t border-border pt-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span className="price-tabular">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tax share:</span>
                          <span className="price-tabular">{formatCurrency(totals.tax_share)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tip share:</span>
                          <span className="price-tabular">{formatCurrency(totals.tip_share)}</span>
                        </div>
                        <div className="flex justify-between text-base font-semibold pt-1 border-t border-border mt-2">
                          <span>Total:</span>
                          <span className="price-tabular">{formatCurrency(totals.total)}</span>
                        </div>
                      </section>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-4 text-xs text-text-tertiary">Split with Tabby 🐱</footer>
    </div>
  )
}
