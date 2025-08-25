// Types for the math engine
export interface Item {
  id: string
  emoji: string
  label: string
  price: number
  quantity: number
}

export interface Person {
  id: string
  name: string
  avatar_url?: string
  venmo_handle?: string
  is_paid: boolean
}

export interface ItemShare {
  item_id: string
  person_id: string
  weight: number // 0.0 to 1.0, e.g., 0.5 for 50/50 split
}

export interface PersonTotal {
  person_id: string
  name: string
  subtotal: number
  tax_share: number
  tip_share: number
  total: number
  items: Array<{
    item_id: string
    emoji: string
    label: string
    price: number
    quantity: number
    weight: number
    share_amount: number
  }>
}

export interface BillTotals {
  subtotal: number
  tax: number
  tip: number
  grand_total: number
  person_totals: PersonTotal[]
  penny_reconciliation: {
    distributed: number
    method: 'round_up' | 'round_down' | 'distribute_largest'
  }
}

export type TaxMode = 'proportional' | 'even'
export type TipMode = 'proportional' | 'even'

/**
 * Compute totals for a bill with tax/tip split options and penny reconciliation
 * 
 * @param items - Array of items on the bill
 * @param shares - Array of item shares (who gets what portion of each item)
 * @param people - Array of people splitting the bill
 * @param tax - Tax amount
 * @param tip - Tip amount
 * @param taxMode - How to split tax: 'proportional' (by item totals) or 'even' (equal split)
 * @param tipMode - How to split tip: 'proportional' (by item totals) or 'even' (equal split)
 * @param includeZeroPeople - Whether to include people with no items in even splits
 * @returns BillTotals with per-person breakdowns
 */
export function computeTotals(
  items: Item[],
  shares: ItemShare[],
  people: Person[],
  tax: number,
  tip: number,
  taxMode: TaxMode = 'proportional',
  tipMode: TipMode = 'proportional',
  includeZeroPeople: boolean = true
): BillTotals {
  // Suppress unused parameter warnings
  void shares;
  void taxMode;
  void tipMode;
  void includeZeroPeople;
  // TODO: Implement the math engine
  // 1. Calculate subtotal from items
  // 2. Distribute items to people based on shares
  // 3. Split tax based on taxMode
  // 4. Split tip based on tipMode
  // 5. Reconcile pennies to ensure totals add up exactly
  // 6. Return detailed breakdown per person

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const grand_total = subtotal + tax + tip

  // Placeholder implementation
  const person_totals: PersonTotal[] = people.map(person => ({
    person_id: person.id,
    name: person.name,
    subtotal: 0,
    tax_share: 0,
    tip_share: 0,
    total: 0,
    items: []
  }))

  return {
    subtotal,
    tax,
    tip,
    grand_total,
    person_totals,
    penny_reconciliation: {
      distributed: 0,
      method: 'distribute_largest'
    }
  }
}

/**
 * Penny reconciliation algorithm to ensure totals add up exactly
 * Distributes rounding differences to the largest amounts first
 */
export function reconcilePennies(
  personTotals: PersonTotal[],
  targetTotal: number
): PersonTotal[] {
  // Suppress unused parameter warnings
  void targetTotal;
  // TODO: Implement penny reconciliation
  // 1. Calculate current total
  // 2. Find difference from target
  // 3. Distribute difference to largest amounts first
  // 4. Return adjusted totals
  return personTotals
}
