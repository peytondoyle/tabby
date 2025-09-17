import { createDraftFromParseResult, saveDraftToLocal, loadDraftFromLocal, type DraftBill } from './draft'
import type { ParseResult } from './receiptScanning'

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-token-123')
}))

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('draft utilities', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
  })

  describe('createDraftFromParseResult', () => {
    it('should create a draft with token and normalized items', () => {
      const mockParseResult: ParseResult = {
        place: 'Test Restaurant',
        date: '2025-01-01',
        items: [
          { id: 'item-1', label: 'Pizza', price: 18.00, emoji: '🍕', quantity: 1, unit_price: 18.00 },
          { id: 'item-2', label: 'Beer', price: 6.00, emoji: '🍺', quantity: 1, unit_price: 6.00 }
        ],
        subtotal: 24.00,
        tax: 2.16,
        tip: 4.80,
        total: 30.96
      }

      const draft = createDraftFromParseResult(mockParseResult)

      expect(draft.token).toBe('mock-token-123')
      expect(draft.place).toBe('Test Restaurant')
      expect(draft.date).toBe('2025-01-01')
      expect(draft.items).toHaveLength(2)
      expect(draft.items[0]).toEqual({ id: 'item-1', label: 'Pizza', price: 18.00 })
      expect(draft.items[1]).toEqual({ id: 'item-2', label: 'Beer', price: 6.00 })
      expect(draft.subtotal).toBe(24.00)
      expect(draft.tax).toBe(2.16)
      expect(draft.tip).toBe(4.80)
      expect(draft.total).toBe(30.96)
    })

    it('should handle empty or null values gracefully', () => {
      const mockParseResult: ParseResult = {
        place: null,
        date: null,
        items: [
          { id: 'item-1', label: '', price: 0, quantity: 1, unit_price: 0 }
        ],
        subtotal: null,
        tax: null,
        tip: null,
        total: null
      }

      const draft = createDraftFromParseResult(mockParseResult)

      expect(draft.token).toBe('mock-token-123')
      expect(draft.place).toBeUndefined()
      expect(draft.date).toBeUndefined()
      expect(draft.items).toHaveLength(1)
      expect(draft.items[0]).toEqual({ id: 'item-1', label: '', price: 0 })
      expect(draft.subtotal).toBeUndefined()
    })

    it('should ensure at least one item when input has items', () => {
      const mockParseResult: ParseResult = {
        items: [
          { id: 'item-1', label: 'Test Item', price: 10.00, quantity: 1, unit_price: 10.00 }
        ]
      }

      const draft = createDraftFromParseResult(mockParseResult)

      expect(draft.items).toHaveLength(1)
      expect(draft.items[0].id).toBe('item-1')
    })
  })

  describe('localStorage operations', () => {
    it('should save and load draft successfully', () => {
      const mockDraft: DraftBill = {
        token: 'test-token-123',
        place: 'Test Place',
        date: '2025-01-01',
        items: [
          { id: 'item-1', label: 'Item 1', price: 10.00 },
          { id: 'item-2', label: 'Item 2', price: 15.00 }
        ],
        subtotal: 25.00,
        tax: 2.00,
        tip: 5.00,
        total: 32.00
      }

      // Save draft
      saveDraftToLocal(mockDraft)

      // Verify it was saved
      const stored = mockLocalStorage.getItem('draft:test-token-123')
      expect(stored).toBeDefined()

      // Load draft
      const loadedDraft = loadDraftFromLocal('test-token-123')
      expect(loadedDraft).toEqual(mockDraft)
    })

    it('should return null for non-existent draft', () => {
      const result = loadDraftFromLocal('non-existent-token')
      expect(result).toBeNull()
    })

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.setItem('draft:corrupted-token', 'invalid-json{')
      
      const result = loadDraftFromLocal('corrupted-token')
      expect(result).toBeNull()
    })

    it('should round-trip data correctly', () => {
      const mockParseResult: ParseResult = {
        place: 'Round Trip Cafe',
        items: [
          { id: 'item-1', label: 'Coffee', price: 4.50, quantity: 1, unit_price: 4.50 },
          { id: 'item-2', label: 'Muffin', price: 3.25, quantity: 1, unit_price: 3.25 }
        ],
        total: 7.75
      }

      // Create draft from parse result
      const originalDraft = createDraftFromParseResult(mockParseResult)
      
      // Save to localStorage
      saveDraftToLocal(originalDraft)
      
      // Load from localStorage
      const loadedDraft = loadDraftFromLocal(originalDraft.token)
      
      // Should be identical
      expect(loadedDraft).toEqual(originalDraft)
    })
  })
})