import { formatPrice, formatDate, titleCase } from './format'

describe('Format Utils', () => {
  describe('formatPrice', () => {
    it('should format prices as USD currency', () => {
      expect(formatPrice(0)).toBe('$0.00')
      expect(formatPrice(1.5)).toBe('$1.50')
      expect(formatPrice(12.34)).toBe('$12.34')
      expect(formatPrice(100)).toBe('$100.00')
    })

    it('should handle edge cases', () => {
      expect(formatPrice(-5.50)).toBe('-$5.50')
      expect(formatPrice(0.1)).toBe('$0.10')
      expect(formatPrice(999.99)).toBe('$999.99')
    })
  })

  describe('formatDate', () => {
    it('should format valid date strings', () => {
      const result = formatDate('2025-01-15')
      expect(result).toContain('Jan')
      expect(result).toContain('2025')
      expect(result).toMatch(/1[45]/) // Account for timezone differences
    })

    it('should return original string for invalid dates', () => {
      expect(formatDate('not-a-date')).toBe('not-a-date')
      expect(formatDate('')).toBe('')
    })
  })

  describe('titleCase', () => {
    it('should capitalize first letter of each word', () => {
      expect(titleCase('hello world')).toBe('Hello World')
      expect(titleCase('THE QUICK BROWN FOX')).toBe('The Quick Brown Fox')
      expect(titleCase('single')).toBe('Single')
    })

    it('should handle edge cases', () => {
      expect(titleCase('')).toBe('')
      expect(titleCase('a')).toBe('A')
      expect(titleCase('multiple  spaces')).toBe('Multiple  Spaces')
    })
  })
})