// Types for the math engine
export type AssignedLine = {
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

export type PersonTotal = {
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
 * Validates that a weight is greater than 0
 * @param weight - The weight to validate
 * @throws Error if weight is <= 0
 */
export function validateWeight(weight: number): void {
  if (weight <= 0) {
    throw new Error('Weight must be greater than 0')
  }
}

/**
 * Validates that an item has at least one person with weight > 0
 * @param itemId - The item ID to check
 * @param shares - Array of all shares
 * @param newWeight - The new weight being added/updated
 * @param personId - The person ID for the new/updated weight
 * @throws Error if all weights would sum to 0
 */
export function validateItemWeights(
  itemId: string, 
  shares: ItemShare[], 
  newWeight: number, 
  personId: string
): void {
  const itemShares = shares.filter(share => share.item_id === itemId)
  const otherWeights = itemShares
    .filter(share => share.person_id !== personId)
    .reduce((sum, share) => sum + share.weight, 0)
  
  if (otherWeights + newWeight <= 0) {
    throw new Error('Each item needs at least one person with weight > 0')
  }
}

/**
 * Checks if a specific (item_id, person_id) combination already exists in shares
 * @param shares - Array of shares to check
 * @param itemId - The item ID
 * @param personId - The person ID
 * @returns The existing share if found, null otherwise
 */
export function findExistingShare(
  shares: ItemShare[], 
  itemId: string, 
  personId: string
): ItemShare | null {
  return shares.find(share => 
    share.item_id === itemId && share.person_id === personId
  ) || null
}

/**
 * Validates multiple shares at once to ensure no item has all weights <= 0
 * @param shares - Array of shares to validate
 * @throws Error if any item would have all weights <= 0
 */
export function validateAllItemWeights(shares: ItemShare[]): void {
  // Group shares by item_id
  const sharesByItem = new Map<string, ItemShare[]>()
  for (const share of shares) {
    if (!sharesByItem.has(share.item_id)) {
      sharesByItem.set(share.item_id, [])
    }
    sharesByItem.get(share.item_id)!.push(share)
  }

  // Check each item
  for (const [itemId, itemShares] of sharesByItem) {
    const totalWeight = itemShares.reduce((sum, share) => sum + share.weight, 0)
    if (totalWeight <= 0) {
      throw new Error(`Item ${itemId} needs at least one person with weight > 0`)
    }
  }
}

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
  // 1. Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const grand_total = subtotal + tax + tip

  // 2. Build lookup maps for quick access
  const itemMap = new Map(items.map(item => [item.id, item]))
  
  // 3. Initialize person totals
  const personTotals: PersonTotal[] = people.map(person => ({
    person_id: person.id,
    name: person.name,
    subtotal: 0,
    tax_share: 0,
    tip_share: 0,
    total: 0,
    items: []
  }))
  
  const personTotalMap = new Map(personTotals.map(pt => [pt.person_id, pt]))
  
  // 4. Calculate total weight for each item (for shared items)
  const itemWeightTotals = new Map<string, number>()
  for (const share of shares) {
    const current = itemWeightTotals.get(share.item_id) || 0
    itemWeightTotals.set(share.item_id, current + share.weight)
  }
  
  // 5. Distribute items to people based on shares
  for (const share of shares) {
    const item = itemMap.get(share.item_id)
    const personTotal = personTotalMap.get(share.person_id)
    
    if (!item || !personTotal) continue
    
    const totalWeight = itemWeightTotals.get(share.item_id) || 1
    const shareRatio = share.weight / totalWeight
    const shareAmount = item.price * shareRatio
    
    // Add to person's subtotal
    personTotal.subtotal += shareAmount
    
    // Add item to person's items list
    personTotal.items.push({
      item_id: share.item_id,
      emoji: item.emoji || '📦',
      label: item.label,
      price: item.price,
      quantity: item.quantity,
      weight: share.weight,
      share_amount: shareAmount
    })
  }
  
  // 6. Calculate tax shares
  if (taxMode === 'proportional') {
    // Split tax proportionally based on each person's subtotal
    for (const personTotal of personTotals) {
      if (subtotal > 0) {
        personTotal.tax_share = (personTotal.subtotal / subtotal) * tax
      }
    }
  } else {
    // Split tax evenly among relevant people
    const relevantPeople = includeZeroPeople 
      ? personTotals 
      : personTotals.filter(p => p.subtotal > 0)
    
    if (relevantPeople.length > 0) {
      const taxPerPerson = tax / relevantPeople.length
      for (const personTotal of relevantPeople) {
        personTotal.tax_share = taxPerPerson
      }
    }
  }
  
  // 7. Calculate tip shares
  if (tipMode === 'proportional') {
    // Split tip proportionally based on each person's subtotal
    for (const personTotal of personTotals) {
      if (subtotal > 0) {
        personTotal.tip_share = (personTotal.subtotal / subtotal) * tip
      }
    }
  } else {
    // Split tip evenly among relevant people
    const relevantPeople = includeZeroPeople 
      ? personTotals 
      : personTotals.filter(p => p.subtotal > 0)
    
    if (relevantPeople.length > 0) {
      const tipPerPerson = tip / relevantPeople.length
      for (const personTotal of relevantPeople) {
        personTotal.tip_share = tipPerPerson
      }
    }
  }
  
  // 8. Calculate raw totals for each person
  for (const personTotal of personTotals) {
    personTotal.total = personTotal.subtotal + personTotal.tax_share + personTotal.tip_share
  }
  
  // 9. Round totals to cents and reconcile pennies
  const reconciledTotals = reconcilePennies(personTotals, grand_total)
  
  // 10. Calculate how much was distributed in reconciliation
  const beforeTotal = personTotals.reduce((sum, p) => sum + Math.round(p.total * 100) / 100, 0)
  const distributed = grand_total - beforeTotal
  
  return {
    subtotal,
    tax,
    tip,
    grand_total,
    person_totals: reconciledTotals,
    penny_reconciliation: {
      distributed: Math.round(distributed * 100) / 100,
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
  // 1. Round all values to cents (2 decimal places)
  const roundedTotals = personTotals.map(person => ({
    ...person,
    subtotal: Math.round(person.subtotal * 100) / 100,
    tax_share: Math.round(person.tax_share * 100) / 100,
    tip_share: Math.round(person.tip_share * 100) / 100,
    total: Math.round(person.total * 100) / 100,
    items: person.items.map(item => ({
      ...item,
      share_amount: Math.round(item.share_amount * 100) / 100
    }))
  }))
  
  // 2. Calculate current total after rounding
  const currentTotal = roundedTotals.reduce((sum, person) => sum + person.total, 0)
  
  // 3. Find the difference (in cents)
  const differenceCents = Math.round((targetTotal - currentTotal) * 100)
  
  // 4. If no difference, return as is
  if (differenceCents === 0) {
    return roundedTotals
  }
  
  // 5. Sort people by their total (descending) to distribute to largest first
  const sortedTotals = [...roundedTotals].sort((a, b) => b.total - a.total)
  
  // 6. Distribute pennies one at a time
  const pennyValue = differenceCents > 0 ? 0.01 : -0.01
  let remaining = Math.abs(differenceCents)
  
  for (let i = 0; remaining > 0 && i < sortedTotals.length; i++) {
    // Distribute one penny to this person
    sortedTotals[i].total += pennyValue
    sortedTotals[i].total = Math.round(sortedTotals[i].total * 100) / 100
    remaining--
    
    // If we still have pennies and we've gone through everyone, loop back
    if (remaining > 0 && i === sortedTotals.length - 1) {
      i = -1 // Will be incremented to 0 on next iteration
    }
  }
  
  // 7. Return the totals in original order
  const resultMap = new Map(sortedTotals.map(p => [p.person_id, p]))
  return personTotals.map(p => resultMap.get(p.person_id)!)
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
