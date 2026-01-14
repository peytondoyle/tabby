import { useMemo } from 'react'
import {
  computeTotals,
  buildSharesFromPeopleItems,
  type BillTotals,
  type Item as ComputeItem,
  type Person as ComputePerson
} from './computeTotals'

/**
 * Input for useBillTotals hook - matches TabbySimple's data model
 * Supports both string[] (item IDs) and { id: string }[] formats for person items
 */
interface UseBillTotalsInput {
  items: { id: string; label?: string; name?: string; price: number; emoji?: string }[]
  people: { id: string; name: string; items?: (string | { id: string })[] }[]
  tax: number
  tip: number
  discount: number
  serviceFee: number
  taxMode?: 'proportional' | 'even'
  tipMode?: 'proportional' | 'even'
}

/**
 * React hook that wraps computeTotals for easy use in components.
 * Automatically converts TabbySimple's UI model to computeTotals' ItemShare format.
 *
 * @param input - Bill data in TabbySimple's format
 * @returns BillTotals with per-person breakdowns, or null if no items
 */
export function useBillTotals(input: UseBillTotalsInput): BillTotals | null {
  const {
    items,
    people,
    tax,
    tip,
    discount,
    serviceFee,
    taxMode = 'proportional',
    tipMode = 'proportional'
  } = input

  return useMemo(() => {
    if (items.length === 0) return null

    // Convert TabbySimple model to computeTotals format
    const shares = buildSharesFromPeopleItems(items, people)

    const normalizedItems: ComputeItem[] = items.map(item => ({
      id: item.id,
      label: item.label || item.name || 'Item',  // Support both label and name fields
      price: item.price,
      quantity: 1,
      unit_price: item.price,
      emoji: item.emoji
    }))

    const normalizedPeople: ComputePerson[] = people.map(p => ({
      id: p.id,
      name: p.name,
      is_paid: false
    }))

    return computeTotals(
      normalizedItems,
      shares,
      normalizedPeople,
      tax,
      tip,
      discount,
      serviceFee,
      taxMode,
      tipMode,
      true // include zero-item people
    )
  }, [items, people, tax, tip, discount, serviceFee, taxMode, tipMode])
}

/**
 * Get a specific person's total from BillTotals.
 * Returns 0 if billTotals is null or person not found.
 *
 * @param billTotals - Result from useBillTotals or computeTotals
 * @param personId - The person's ID to look up
 * @returns The person's total, or 0 if not found
 */
export function getPersonTotal(
  billTotals: BillTotals | null,
  personId: string
): number {
  if (!billTotals) return 0
  return billTotals.person_totals.find(p => p.person_id === personId)?.total ?? 0
}

/**
 * Get a specific person's breakdown from BillTotals.
 * Returns null if billTotals is null or person not found.
 *
 * @param billTotals - Result from useBillTotals or computeTotals
 * @param personId - The person's ID to look up
 * @returns The person's full breakdown, or null if not found
 */
export function getPersonBreakdown(
  billTotals: BillTotals | null,
  personId: string
) {
  if (!billTotals) return null
  return billTotals.person_totals.find(p => p.person_id === personId) ?? null
}
