import { computeTotals, reconcilePennies, validateBillTotals, buildSharesFromPeopleItems } from './computeTotals'
import type { Item, Person, ItemShare, PersonTotal } from './computeTotals'

describe('computeTotals', () => {
  const mockItems: Item[] = [
    { id: '1', emoji: '🍕', label: 'Pizza', price: 20.00, quantity: 1, unit_price: 20.00 },
    { id: '2', emoji: '🍺', label: 'Beer', price: 8.00, quantity: 1, unit_price: 8.00 },
    { id: '3', emoji: '🥗', label: 'Salad', price: 12.00, quantity: 1, unit_price: 12.00 }
  ]

  const mockPeople: Person[] = [
    { id: 'p1', name: 'Alice', is_paid: false },
    { id: 'p2', name: 'Bob', is_paid: false },
    { id: 'p3', name: 'Charlie', is_paid: false }
  ]

  describe('proportional tax/tip splitting', () => {
    it('should split tax and tip proportionally based on item totals', () => {
      const shares: ItemShare[] = [
        { item_id: '1', person_id: 'p1', weight: 1 }, // Alice gets pizza ($20)
        { item_id: '2', person_id: 'p2', weight: 1 }, // Bob gets beer ($8)
        { item_id: '3', person_id: 'p3', weight: 1 }  // Charlie gets salad ($12)
      ]

      const result = computeTotals(
        mockItems,
        shares,
        mockPeople,
        4.00, // tax
        6.00, // tip
        0,    // discount
        0,    // service_fee
        'proportional',
        'proportional',
        true
      )

      // Alice should pay 50% of tax/tip (20/40)
      expect(result.person_totals[0].subtotal).toBe(20.00)
      expect(result.person_totals[0].tax_share).toBe(2.00)
      expect(result.person_totals[0].tip_share).toBe(3.00)
      expect(result.person_totals[0].total).toBe(25.00)

      // Bob should pay 20% of tax/tip (8/40)
      expect(result.person_totals[1].subtotal).toBe(8.00)
      expect(result.person_totals[1].tax_share).toBe(0.80)
      expect(result.person_totals[1].tip_share).toBe(1.20)
      expect(result.person_totals[1].total).toBe(10.00)

      // Charlie should pay 30% of tax/tip (12/40)
      expect(result.person_totals[2].subtotal).toBe(12.00)
      expect(result.person_totals[2].tax_share).toBe(1.20)
      expect(result.person_totals[2].tip_share).toBe(1.80)
      expect(result.person_totals[2].total).toBe(15.00)

      // Total should match exactly
      expect(result.grand_total).toBe(50.00)
      const sumOfTotals = result.person_totals.reduce((sum, p) => sum + p.total, 0)
      expect(sumOfTotals).toBe(result.grand_total)
    })
  })

  describe('even tax/tip splitting', () => {
    it('should split tax and tip evenly among people with items', () => {
      const shares: ItemShare[] = [
        { item_id: '1', person_id: 'p1', weight: 1 }, // Alice gets pizza ($20)
        { item_id: '2', person_id: 'p2', weight: 1 }  // Bob gets beer ($8)
        // Charlie gets nothing
      ]

      const result = computeTotals(
        mockItems,
        shares,
        mockPeople,
        4.00, // tax
        6.00, // tip
        0,    // discount
        0,    // service_fee
        'even',
        'even',
        false // don't include zero-item people
      )

      // Only Alice and Bob should split tax/tip evenly
      expect(result.person_totals[0].tax_share).toBe(2.00) // 4/2
      expect(result.person_totals[0].tip_share).toBe(3.00) // 6/2
      expect(result.person_totals[1].tax_share).toBe(2.00) // 4/2
      expect(result.person_totals[1].tip_share).toBe(3.00) // 6/2

      // Charlie should get nothing
      expect(result.person_totals[2].tax_share).toBe(0)
      expect(result.person_totals[2].tip_share).toBe(0)
    })

    it('should include zero-item people when flag is true', () => {
      const shares: ItemShare[] = [
        { item_id: '1', person_id: 'p1', weight: 1 } // Only Alice gets pizza
      ]

      const result = computeTotals(
        mockItems,
        shares,
        mockPeople,
        3.00, // tax
        6.00, // tip
        0,    // discount
        0,    // service_fee
        'even',
        'even',
        true // include zero-item people
      )

      // All three people should split tax/tip evenly
      expect(result.person_totals[0].tax_share).toBe(1.00) // 3/3
      expect(result.person_totals[0].tip_share).toBe(2.00) // 6/3
      expect(result.person_totals[1].tax_share).toBe(1.00) // 3/3
      expect(result.person_totals[1].tip_share).toBe(2.00) // 6/3
      expect(result.person_totals[2].tax_share).toBe(1.00) // 3/3
      expect(result.person_totals[2].tip_share).toBe(2.00) // 6/3
    })
  })

  describe('shared items', () => {
    it('should split shared items based on weights', () => {
      const shares: ItemShare[] = [
        { item_id: '1', person_id: 'p1', weight: 0.5 }, // Alice gets half of pizza
        { item_id: '1', person_id: 'p2', weight: 0.5 }, // Bob gets half of pizza
        { item_id: '2', person_id: 'p3', weight: 1 }    // Charlie gets all of beer
      ]

      const result = computeTotals(
        mockItems,
        shares,
        mockPeople,
        0, // no tax
        0, // no tip
        0, // no discount
        0, // no service_fee
        'proportional',
        'proportional',
        true
      )

      expect(result.person_totals[0].subtotal).toBe(10.00) // Half of $20
      expect(result.person_totals[1].subtotal).toBe(10.00) // Half of $20
      expect(result.person_totals[2].subtotal).toBe(8.00)  // All of $8
    })
  })

  describe('discount and service fee', () => {
    // Use only 2 items for these tests to make the math cleaner
    const twoItems: Item[] = [
      { id: '1', emoji: '🍕', label: 'Pizza', price: 20.00, quantity: 1, unit_price: 20.00 },
      { id: '2', emoji: '🍺', label: 'Beer', price: 8.00, quantity: 1, unit_price: 8.00 }
    ]
    const twoPeople: Person[] = [
      { id: 'p1', name: 'Alice', is_paid: false },
      { id: 'p2', name: 'Bob', is_paid: false }
    ]

    it('should subtract discount proportionally from each person total', () => {
      const shares: ItemShare[] = [
        { item_id: '1', person_id: 'p1', weight: 1 }, // Alice gets pizza ($20)
        { item_id: '2', person_id: 'p2', weight: 1 }  // Bob gets beer ($8)
      ]

      const result = computeTotals(
        twoItems,
        shares,
        twoPeople,
        0,     // no tax
        0,     // no tip
        7.00,  // $7 discount (positive number, will be subtracted)
        0,     // no service_fee
        'proportional',
        'proportional',
        true
      )

      // Subtotal is $28, discount is $7
      // Grand total should be $28 - $7 = $21
      expect(result.grand_total).toBe(21.00)

      // Alice has 20/28 of subtotal, so her discount share is (20/28) * 7 = $5
      expect(result.person_totals[0].discount_share).toBe(5.00)
      expect(result.person_totals[0].total).toBe(15.00) // 20 - 5 = 15

      // Bob has 8/28 of subtotal, so his discount share is (8/28) * 7 = $2
      expect(result.person_totals[1].discount_share).toBe(2.00)
      expect(result.person_totals[1].total).toBe(6.00) // 8 - 2 = 6

      // Sum of totals should match grand total
      const sumOfTotals = result.person_totals.reduce((sum, p) => sum + p.total, 0)
      expect(sumOfTotals).toBe(result.grand_total)
    })

    it('should add service fee proportionally to each person total', () => {
      const shares: ItemShare[] = [
        { item_id: '1', person_id: 'p1', weight: 1 }, // Alice gets pizza ($20)
        { item_id: '2', person_id: 'p2', weight: 1 }  // Bob gets beer ($8)
      ]

      const result = computeTotals(
        twoItems,
        shares,
        twoPeople,
        0,     // no tax
        0,     // no tip
        0,     // no discount
        5.60,  // $5.60 service fee
        'proportional',
        'proportional',
        true
      )

      // Subtotal is $28, service fee is $5.60
      // Grand total should be $28 + $5.60 = $33.60
      expect(result.grand_total).toBe(33.60)

      // Alice has 20/28 of subtotal, so her service_fee share is (20/28) * 5.60 = $4
      expect(result.person_totals[0].service_fee_share).toBe(4.00)
      expect(result.person_totals[0].total).toBe(24.00) // 20 + 4 = 24

      // Bob has 8/28 of subtotal, so his service_fee share is (8/28) * 5.60 = $1.60
      expect(result.person_totals[1].service_fee_share).toBe(1.60)
      expect(result.person_totals[1].total).toBe(9.60) // 8 + 1.60 = 9.60

      // Sum of totals should match grand total
      const sumOfTotals = result.person_totals.reduce((sum, p) => sum + p.total, 0)
      expect(sumOfTotals).toBe(result.grand_total)
    })

    it('should handle discount and service fee together', () => {
      const shares: ItemShare[] = [
        { item_id: '1', person_id: 'p1', weight: 1 }, // Alice gets pizza ($20)
        { item_id: '2', person_id: 'p2', weight: 1 }  // Bob gets beer ($8)
      ]

      const result = computeTotals(
        twoItems,
        shares,
        twoPeople,
        2.80,  // tax
        5.60,  // tip
        5.00,  // $5 discount
        3.00,  // $3 service fee
        'proportional',
        'proportional',
        true
      )

      // Subtotal: $28
      // Grand total: $28 - $5 + $3 + $2.80 + $5.60 = $34.40
      expect(result.grand_total).toBe(34.40)

      // Verify totals sum correctly
      const sumOfTotals = result.person_totals.reduce((sum, p) => sum + p.total, 0)
      expect(sumOfTotals).toBeCloseTo(result.grand_total, 2)
    })
  })

  describe('penny reconciliation', () => {
    it('should distribute rounding differences to ensure totals match', () => {
      const personTotals: PersonTotal[] = [
        {
          person_id: 'p1',
          name: 'Alice',
          subtotal: 10.333,
          discount_share: 0,
          service_fee_share: 0,
          tax_share: 1.111,
          tip_share: 2.222,
          total: 13.666,
          items: []
        },
        {
          person_id: 'p2',
          name: 'Bob',
          subtotal: 10.333,
          discount_share: 0,
          service_fee_share: 0,
          tax_share: 1.111,
          tip_share: 2.222,
          total: 13.666,
          items: []
        },
        {
          person_id: 'p3',
          name: 'Charlie',
          subtotal: 10.334,
          discount_share: 0,
          service_fee_share: 0,
          tax_share: 1.111,
          tip_share: 2.223,
          total: 13.668,
          items: []
        }
      ]

      const targetTotal = 41.00
      const result = reconcilePennies(personTotals, targetTotal)

      // Should round all values to 2 decimal places
      result.forEach(person => {
        expect(Number.isInteger(person.total * 100)).toBe(true)
      })

      // Total should match exactly after reconciliation
      const sumAfter = result.reduce((sum, p) => sum + p.total, 0)
      expect(sumAfter).toBeCloseTo(targetTotal, 2)
    })

    it('should distribute pennies to largest amounts first', () => {
      const personTotals: PersonTotal[] = [
        {
          person_id: 'p1',
          name: 'Alice',
          subtotal: 20.00,
          discount_share: 0,
          service_fee_share: 0,
          tax_share: 2.00,
          tip_share: 3.00,
          total: 25.00,
          items: []
        },
        {
          person_id: 'p2',
          name: 'Bob',
          subtotal: 10.00,
          discount_share: 0,
          service_fee_share: 0,
          tax_share: 1.00,
          tip_share: 1.50,
          total: 12.50,
          items: []
        }
      ]

      const targetTotal = 37.52 // Need to add 2 cents
      const result = reconcilePennies(personTotals, targetTotal)

      // Alice should get the first penny, Bob gets the second
      expect(result[0].total).toBe(25.01)
      expect(result[1].total).toBe(12.51)

      const sumAfter = result.reduce((sum, p) => sum + p.total, 0)
      expect(sumAfter).toBe(targetTotal)
    })

    it('should handle three-way split with penny distribution', () => {
      // $10 split 3 ways = $3.33 + $3.33 + $3.34
      const shares: ItemShare[] = [
        { item_id: '1', person_id: 'p1', weight: 1 },
        { item_id: '1', person_id: 'p2', weight: 1 },
        { item_id: '1', person_id: 'p3', weight: 1 }
      ]

      const singleItem: Item[] = [
        { id: '1', emoji: '🍕', label: 'Pizza', price: 10.00, quantity: 1, unit_price: 10.00 }
      ]

      const result = computeTotals(
        singleItem,
        shares,
        mockPeople,
        0, 0, 0, 0,
        'proportional',
        'proportional',
        true
      )

      // Grand total should be exactly $10
      expect(result.grand_total).toBe(10.00)

      // Each person should get roughly $3.33, with penny reconciliation
      const totals = result.person_totals.map(p => p.total)
      expect(totals.reduce((sum, t) => sum + t, 0)).toBe(10.00)

      // Should have two at $3.33 and one at $3.34 (or similar valid distribution)
      expect(totals.every(t => t >= 3.33 && t <= 3.34)).toBe(true)
    })
  })

  describe('validateBillTotals', () => {
    it('should return valid for correct totals', () => {
      const shares: ItemShare[] = [
        { item_id: '1', person_id: 'p1', weight: 1 },
        { item_id: '2', person_id: 'p2', weight: 1 }
      ]

      const result = computeTotals(
        mockItems,
        shares,
        mockPeople,
        4.00, 6.00, 0, 0,
        'proportional', 'proportional', true
      )

      const validation = validateBillTotals(result)
      expect(validation.valid).toBe(true)
      expect(validation.error).toBeUndefined()
    })
  })
})

describe('buildSharesFromPeopleItems', () => {
  const testItems = [
    { id: '1', price: 20.00 },
    { id: '2', price: 8.00 },
    { id: '3', price: 12.00 }
  ]

  it('should create shares from person items arrays (string IDs)', () => {
    const people = [
      { id: 'p1', items: ['1'] },
      { id: 'p2', items: ['2'] },
      { id: 'p3', items: ['3'] }
    ]

    const shares = buildSharesFromPeopleItems(testItems, people)

    expect(shares).toHaveLength(3)
    expect(shares[0]).toEqual({ item_id: '1', person_id: 'p1', weight: 1 })
    expect(shares[1]).toEqual({ item_id: '2', person_id: 'p2', weight: 1 })
    expect(shares[2]).toEqual({ item_id: '3', person_id: 'p3', weight: 1 })
  })

  it('should detect and split shared items evenly', () => {
    // Same item assigned to two people
    const people = [
      { id: 'p1', items: ['1'] },
      { id: 'p2', items: ['1'] }  // Both have item 1!
    ]

    const shares = buildSharesFromPeopleItems([{ id: '1', price: 20.00 }], people)

    expect(shares).toHaveLength(2)
    expect(shares[0]).toEqual({ item_id: '1', person_id: 'p1', weight: 0.5 })
    expect(shares[1]).toEqual({ item_id: '1', person_id: 'p2', weight: 0.5 })
  })

  it('should handle three-way split correctly', () => {
    const people = [
      { id: 'p1', items: ['1'] },
      { id: 'p2', items: ['1'] },
      { id: 'p3', items: ['1'] }
    ]

    const shares = buildSharesFromPeopleItems([{ id: '1', price: 30.00 }], people)

    expect(shares).toHaveLength(3)
    // Each person should get 1/3 weight
    expect(shares[0].weight).toBeCloseTo(1/3, 5)
    expect(shares[1].weight).toBeCloseTo(1/3, 5)
    expect(shares[2].weight).toBeCloseTo(1/3, 5)
  })

  it('should handle mixed single and split items', () => {
    const people = [
      { id: 'p1', items: ['1', '2'] },  // Has item 1 and 2
      { id: 'p2', items: ['1', '3'] }   // Has item 1 and 3 (shares item 1)
    ]

    const shares = buildSharesFromPeopleItems(testItems, people)

    expect(shares).toHaveLength(4)

    // Item 1 should be split 50/50
    const item1Shares = shares.filter(s => s.item_id === '1')
    expect(item1Shares).toHaveLength(2)
    expect(item1Shares[0].weight).toBe(0.5)
    expect(item1Shares[1].weight).toBe(0.5)

    // Items 2 and 3 should be fully assigned
    const item2Share = shares.find(s => s.item_id === '2')
    expect(item2Share?.weight).toBe(1)
    const item3Share = shares.find(s => s.item_id === '3')
    expect(item3Share?.weight).toBe(1)
  })

  it('should handle empty people array', () => {
    const shares = buildSharesFromPeopleItems(testItems, [])
    expect(shares).toHaveLength(0)
  })

  it('should handle people with no items', () => {
    const people = [
      { id: 'p1', items: [] },
      { id: 'p2', items: undefined as any }
    ]

    const shares = buildSharesFromPeopleItems(testItems, people)
    expect(shares).toHaveLength(0)
  })

  it('should handle object format for items array', () => {
    // Some components pass items as { id: string }[] instead of string[]
    const people = [
      { id: 'p1', items: [{ id: '1' }, { id: '2' }] },
      { id: 'p2', items: [{ id: '3' }] }
    ]

    const shares = buildSharesFromPeopleItems(testItems, people as any)

    expect(shares).toHaveLength(3)
    expect(shares[0]).toEqual({ item_id: '1', person_id: 'p1', weight: 1 })
    expect(shares[1]).toEqual({ item_id: '2', person_id: 'p1', weight: 1 })
    expect(shares[2]).toEqual({ item_id: '3', person_id: 'p2', weight: 1 })
  })
})
