import { describe, it, expect } from '@jest/globals'
import { computeTotals, reconcilePennies, type Item, type Person, type ItemShare } from '../src/lib/computeTotals'

describe('computeTotals', () => {
  const mockItems: Item[] = [
    { id: '1', emoji: '🍔', label: 'Burger', price: 12.99, quantity: 1 },
    { id: '2', emoji: '🍟', label: 'Fries', price: 4.99, quantity: 1 },
    { id: '3', emoji: '🥤', label: 'Soda', price: 2.99, quantity: 2 }
  ]

  const mockPeople: Person[] = [
    { id: '1', name: 'Alice', is_paid: false },
    { id: '2', name: 'Bob', is_paid: false },
    { id: '3', name: 'Charlie', is_paid: false }
  ]

  const mockShares: ItemShare[] = [
    { item_id: '1', person_id: '1', weight: 1.0 }, // Alice gets full burger
    { item_id: '2', person_id: '2', weight: 1.0 }, // Bob gets full fries
    { item_id: '3', person_id: '1', weight: 0.5 }, // Alice gets 1 soda
    { item_id: '3', person_id: '2', weight: 0.5 }  // Bob gets 1 soda
  ]

  it('should calculate basic totals', () => {
    const result = computeTotals(mockItems, mockShares, mockPeople, 2.50, 4.00)
    
    expect(result.subtotal).toBe(23.96) // 12.99 + 4.99 + (2.99 * 2)
    expect(result.tax).toBe(2.50)
    expect(result.tip).toBe(4.00)
    expect(result.grand_total).toBe(30.46)
  })

  it('should handle proportional tax split', () => {
    // TODO: Test proportional tax distribution
  })

  it('should handle even tax split', () => {
    // TODO: Test even tax distribution
  })

  it('should handle proportional tip split', () => {
    // TODO: Test proportional tip distribution
  })

  it('should handle even tip split', () => {
    // TODO: Test even tip distribution
  })

  it('should handle shared items correctly', () => {
    // TODO: Test item sharing with weights
  })

  it('should handle zero-item people in even splits', () => {
    // TODO: Test includeZeroPeople flag
  })

  it('should reconcile pennies correctly', () => {
    // TODO: Test penny reconciliation algorithm
  })
})

describe('reconcilePennies', () => {
  it('should distribute rounding differences to largest amounts', () => {
    // TODO: Test penny reconciliation
  })

  it('should handle edge cases with very small differences', () => {
    // TODO: Test edge cases
  })
})
