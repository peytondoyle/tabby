// Types for the math engine
export interface AssignedLine {
  item_id: string
  emoji: string
  label: string
  price: number
  quantity: number
  weight: number
  share_amount: number
}

export interface Item {
  id: string
  emoji?: string
  label: string
  price: number
  quantity: number
  unit_price: number
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

/**
 * Derive assigned items map from items and shares data
 * @param items Array of items with their details
 * @param shares Array of item shares (item_id, person_id, weight)
 * @returns Record mapping person_id to array of assigned items with computed share amounts
 */
export function deriveAssignedMap(
  items: Item[],
  shares: ItemShare[]
): Record<string, AssignedLine[]> {
  // Build Map(item_id -> item) for quick lookup
  const itemMap = new Map(items.map(item => [item.id, item]))
  
  // Group shares by person_id
  const sharesByPerson = new Map<string, ItemShare[]>()
  
  for (const share of shares) {
    if (!sharesByPerson.has(share.person_id)) {
      sharesByPerson.set(share.person_id, [])
    }
    sharesByPerson.get(share.person_id)!.push(share)
  }
  
  // Compute assigned items for each person
  const result: Record<string, AssignedLine[]> = {}
  
  for (const [personId, personShares] of sharesByPerson) {
    const assignedItems: AssignedLine[] = []
    
    for (const share of personShares) {
      const item = itemMap.get(share.item_id)
      if (!item) continue // Skip if item not found
      
      // Calculate total weight for this item across all shares
      const totalWeight = shares
        .filter(s => s.item_id === share.item_id)
        .reduce((sum, s) => sum + s.weight, 0)
      
      // Calculate share price based on weight proportion
      const sharePrice = (item.price * share.weight) / totalWeight
      
      assignedItems.push({
        item_id: share.item_id,
        emoji: item.emoji || '📦',
        label: item.label,
        price: item.price,
        quantity: item.quantity,
        weight: share.weight,
        share_amount: sharePrice
      })
    }
    
    result[personId] = assignedItems
  }
  
  return result
}
