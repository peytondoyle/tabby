import { describe, it, expect } from '@jest/globals'
import { computeTotals, reconcilePennies as _reconcilePennies, deriveAssignedMap, type Item, type Person, type ItemShare } from '../src/lib/computeTotals'

describe('computeTotals', () => {
  it('should compute totals correctly', () => {
    const items: Item[] = [
      { id: '1', emoji: '🍔', label: 'Burger', price: 12.99, quantity: 1, unit_price: 12.99 },
      { id: '2', emoji: '🍟', label: 'Fries', price: 4.99, quantity: 1, unit_price: 4.99 },
      { id: '3', emoji: '🥤', label: 'Soda', price: 2.99, quantity: 2, unit_price: 1.495 }
    ]

    const people: Person[] = [
      { id: '1', name: 'Alice', is_paid: false },
      { id: '2', name: 'Bob', is_paid: false }
    ]

    const itemShares: ItemShare[] = [
      { item_id: '1', person_id: '1', weight: 1 },
      { item_id: '2', person_id: '1', weight: 0.5 },
      { item_id: '2', person_id: '2', weight: 0.5 },
      { item_id: '3', person_id: '2', weight: 1 }
    ]

    const result = computeTotals(items, itemShares, people, 1.5, 2.5)

    expect(result.subtotal).toBeCloseTo(23.96, 2) // 12.99 + 4.99 + (2.99 * 2)
    expect(result.tax).toBe(1.5)
    expect(result.tip).toBe(2.5)
    expect(result.grand_total).toBeCloseTo(27.96, 2)
    expect(result.person_totals).toHaveLength(2)
  })

  it('should handle penny reconciliation', () => {
    const items: Item[] = [
      { id: '1', emoji: '🍕', label: 'Pizza', price: 10.00, quantity: 1, unit_price: 10.00 }
    ]

    const people: Person[] = [
      { id: '1', name: 'Alice', is_paid: false },
      { id: '2', name: 'Bob', is_paid: false },
      { id: '3', name: 'Charlie', is_paid: false }
    ]

    const itemShares: ItemShare[] = [
      { item_id: '1', person_id: '1', weight: 1/3 },
      { item_id: '1', person_id: '2', weight: 1/3 },
      { item_id: '1', person_id: '3', weight: 1/3 }
    ]

    const result = computeTotals(items, itemShares, people, 0, 0)

    expect(result.subtotal).toBe(10.00)
    expect(result.person_totals).toHaveLength(3)
  })
})

describe('deriveAssignedMap', () => {
  it('should compute multi-share splits correctly', () => {
    const items: Item[] = [
      {
        id: 'item-1',
        emoji: '🍕',
        label: 'Pizza',
        price: 20.00,
        quantity: 1,
        unit_price: 20.00
      },
      {
        id: 'item-2',
        emoji: '🍷',
        label: 'Wine',
        price: 30.00,
        quantity: 1,
        unit_price: 30.00
      }
    ]

    const shares: ItemShare[] = [
      // Pizza split 1/2 and 1/2
      { item_id: 'item-1', person_id: 'person-1', weight: 0.5 },
      { item_id: 'item-1', person_id: 'person-2', weight: 0.5 },
      // Wine split 1/3, 1/3, 1/3
      { item_id: 'item-2', person_id: 'person-1', weight: 1/3 },
      { item_id: 'item-2', person_id: 'person-2', weight: 1/3 },
      { item_id: 'item-2', person_id: 'person-3', weight: 1/3 }
    ]

    const result = deriveAssignedMap(items, shares)

    // Person 1 should have pizza (50% = $10) + wine (33.33% = $10)
    expect(result['person-1']).toHaveLength(2)
    expect(result['person-1']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_id: 'item-1',
          label: 'Pizza',
          weight: 0.5,
          share_amount: 10.00
        }),
        expect.objectContaining({
          item_id: 'item-2',
          label: 'Wine',
          weight: 1/3,
          share_amount: 10.00
        })
      ])
    )

    // Person 2 should have pizza (50% = $10) + wine (33.33% = $10)
    expect(result['person-2']).toHaveLength(2)
    expect(result['person-2']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_id: 'item-1',
          label: 'Pizza',
          weight: 0.5,
          share_amount: 10.00
        }),
        expect.objectContaining({
          item_id: 'item-2',
          label: 'Wine',
          weight: 1/3,
          share_amount: 10.00
        })
      ])
    )

    // Person 3 should have only wine (33.33% = $10)
    expect(result['person-3']).toHaveLength(1)
    expect(result['person-3'][0]).toEqual(
      expect.objectContaining({
        item_id: 'item-2',
        label: 'Wine',
        weight: 1/3,
        share_amount: 10.00
      })
    )
  })

  it('should handle single person assignments', () => {
    const items: Item[] = [
      {
        id: 'item-1',
        emoji: '☕',
        label: 'Coffee',
        price: 5.00,
        quantity: 1,
        unit_price: 5.00
      }
    ]

    const shares: ItemShare[] = [
      { item_id: 'item-1', person_id: 'person-1', weight: 1 }
    ]

    const result = deriveAssignedMap(items, shares)

    expect(result['person-1']).toHaveLength(1)
    expect(result['person-1'][0]).toEqual(
      expect.objectContaining({
        item_id: 'item-1',
        label: 'Coffee',
        weight: 1,
        share_amount: 5.00
      })
    )
  })

  it('should handle empty shares', () => {
    const items: Item[] = [
      {
        id: 'item-1',
        emoji: '🍕',
        label: 'Pizza',
        price: 20.00,
        quantity: 1,
        unit_price: 20.00
      }
    ]

    const shares: ItemShare[] = []

    const result = deriveAssignedMap(items, shares)

    expect(result).toEqual({})
  })

  it('should skip items not found in item map', () => {
    const items: Item[] = [
      {
        id: 'item-1',
        emoji: '🍕',
        label: 'Pizza',
        price: 20.00,
        quantity: 1,
        unit_price: 20.00
      }
    ]

    const shares: ItemShare[] = [
      { item_id: 'item-1', person_id: 'person-1', weight: 1 },
      { item_id: 'item-2', person_id: 'person-1', weight: 1 } // This item doesn't exist
    ]

    const result = deriveAssignedMap(items, shares)

    expect(result['person-1']).toHaveLength(1)
    expect(result['person-1'][0].item_id).toBe('item-1')
  })

  it('should use fallback emoji when item has no emoji', () => {
    const items: Item[] = [
      {
        id: 'item-1',
        label: 'Unknown Item',
        price: 10.00,
        quantity: 1,
        unit_price: 10.00
        // No emoji
      }
    ]

    const shares: ItemShare[] = [
      { item_id: 'item-1', person_id: 'person-1', weight: 1 }
    ]

    const result = deriveAssignedMap(items, shares)

    expect(result['person-1'][0].emoji).toBe('📦')
  })
})
