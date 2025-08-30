import { computeTotals, reconcilePennies } from './computeTotals'
import type { Item, Person, ItemShare } from './computeTotals'

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
        'proportional',
        'proportional',
        true
      )
      
      expect(result.person_totals[0].subtotal).toBe(10.00) // Half of $20
      expect(result.person_totals[1].subtotal).toBe(10.00) // Half of $20
      expect(result.person_totals[2].subtotal).toBe(8.00)  // All of $8
    })
  })
  
  describe('penny reconciliation', () => {
    it('should distribute rounding differences to ensure totals match', () => {
      const personTotals = [
        {
          person_id: 'p1',
          name: 'Alice',
          subtotal: 10.333,
          tax_share: 1.111,
          tip_share: 2.222,
          total: 13.666,
          items: []
        },
        {
          person_id: 'p2',
          name: 'Bob',
          subtotal: 10.333,
          tax_share: 1.111,
          tip_share: 2.222,
          total: 13.666,
          items: []
        },
        {
          person_id: 'p3',
          name: 'Charlie',
          subtotal: 10.334,
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
      const personTotals = [
        {
          person_id: 'p1',
          name: 'Alice',
          subtotal: 20.00,
          tax_share: 2.00,
          tip_share: 3.00,
          total: 25.00,
          items: []
        },
        {
          person_id: 'p2',
          name: 'Bob',
          subtotal: 10.00,
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
  })
})