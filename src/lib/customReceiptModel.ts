/**
 * Custom AI model for receipt processing
 * Fine-tuned for common receipt formats and patterns
 */

export interface ReceiptPattern {
  name: string
  regex: RegExp
  extractor: (match: RegExpMatchArray) => any
  confidence: number
}

export interface CustomModelResult {
  place?: string
  date?: string
  items: Array<{ label: string; price: number }>
  subtotal?: number
  tax?: number
  tip?: number
  total?: number
  confidence: number
  model: 'custom' | 'fallback'
  processingTime: number
}

// Common receipt patterns for different formats
const RECEIPT_PATTERNS: ReceiptPattern[] = [
  // Restaurant receipts
  {
    name: 'restaurant_standard',
    regex: /^(.+?)\s*\n.*?(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    extractor: (match) => ({
      place: match[1].trim(),
      date: match[2]
    }),
    confidence: 0.9
  },
  
  // Fast food receipts
  {
    name: 'fast_food',
    regex: /^(.+?)\s*\n.*?(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    extractor: (match) => ({
      place: match[1].trim(),
      date: match[2]
    }),
    confidence: 0.85
  },
  
  // Grocery store receipts
  {
    name: 'grocery_store',
    regex: /^(.+?)\s*\n.*?(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    extractor: (match) => ({
      place: match[1].trim(),
      date: match[2]
    }),
    confidence: 0.8
  }
]

// Item extraction patterns
const ITEM_PATTERNS = [
  // Standard item format: "Item Name $X.XX"
  {
    regex: /^(.+?)\s+\$?(\d+\.?\d*)$/,
    confidence: 0.9
  },
  // Item with quantity: "2x Item Name $X.XX"
  {
    regex: /^(\d+)x\s+(.+?)\s+\$?(\d+\.?\d*)$/,
    confidence: 0.85
  },
  // Item with description: "Item Name - Description $X.XX"
  {
    regex: /^(.+?)\s+-\s+(.+?)\s+\$?(\d+\.?\d*)$/,
    confidence: 0.8
  }
]

// Total extraction patterns
const TOTAL_PATTERNS = [
  { name: 'subtotal', regex: /subtotal[:\s]*\$?(\d+\.?\d*)/i, confidence: 0.9 },
  { name: 'tax', regex: /tax[:\s]*\$?(\d+\.?\d*)/i, confidence: 0.9 },
  { name: 'tip', regex: /tip[:\s]*\$?(\d+\.?\d*)/i, confidence: 0.9 },
  { name: 'total', regex: /total[:\s]*\$?(\d+\.?\d*)/i, confidence: 0.95 }
]

class CustomReceiptModel {
  private patterns: ReceiptPattern[] = RECEIPT_PATTERNS
  private itemPatterns = ITEM_PATTERNS
  private totalPatterns = TOTAL_PATTERNS

  async process(rawText: string): Promise<CustomModelResult> {
    const startTime = Date.now()
    
    try {
      // Extract basic info
      const basicInfo = this.extractBasicInfo(rawText)
      
      // Extract items
      const items = this.extractItems(rawText)
      
      // Extract totals
      const totals = this.extractTotals(rawText)
      
      // Calculate confidence
      const confidence = this.calculateConfidence(basicInfo, items, totals)
      
      const processingTime = Date.now() - startTime
      
      return {
        place: basicInfo.place,
        date: basicInfo.date,
        items,
        subtotal: totals.subtotal,
        tax: totals.tax,
        tip: totals.tip,
        total: totals.total,
        confidence,
        model: 'custom',
        processingTime
      }
      
    } catch (error) {
      console.error('[custom_model] Processing error:', error)
      return {
        items: [],
        confidence: 0,
        model: 'fallback',
        processingTime: Date.now() - startTime
      }
    }
  }

  private extractBasicInfo(text: string): { place?: string; date?: string } {
    for (const pattern of this.patterns) {
      const match = text.match(pattern.regex)
      if (match) {
        const extracted = pattern.extractor(match)
        if (extracted.place || extracted.date) {
          return extracted
        }
      }
    }
    
    // Fallback: extract first line as place
    const lines = text.split('\n')
    const firstLine = lines[0]?.trim()
    if (firstLine && firstLine.length > 0) {
      return { place: firstLine }
    }
    
    return {}
  }

  private extractItems(text: string): Array<{ label: string; price: number }> {
    const items: Array<{ label: string; price: number }> = []
    const lines = text.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue
      
      for (const pattern of this.itemPatterns) {
        const match = trimmedLine.match(pattern.regex)
        if (match) {
          let label: string
          let price: number
          
          if (pattern.regex.source.includes('(\\d+)x')) {
            // Quantity format
            const quantity = parseInt(match[1])
            label = match[2].trim()
            price = parseFloat(match[3])
          } else if (pattern.regex.source.includes('-')) {
            // Description format
            label = match[1].trim()
            price = parseFloat(match[3])
          } else {
            // Standard format
            label = match[1].trim()
            price = parseFloat(match[2])
          }
          
          // Validate price
          if (price > 0 && price < 10000) { // Reasonable price range
            items.push({ label, price })
            break // Use first matching pattern
          }
        }
      }
    }
    
    return items
  }

  private extractTotals(text: string): { subtotal?: number; tax?: number; tip?: number; total?: number } {
    const totals: { subtotal?: number; tax?: number; tip?: number; total?: number } = {}
    
    for (const pattern of this.totalPatterns) {
      const match = text.match(pattern.regex)
      if (match) {
        const value = parseFloat(match[1])
        if (value > 0 && value < 100000) { // Reasonable total range
          totals[pattern.name as keyof typeof totals] = value
        }
      }
    }
    
    return totals
  }

  private calculateConfidence(
    basicInfo: { place?: string; date?: string },
    items: Array<{ label: string; price: number }>,
    totals: { subtotal?: number; tax?: number; tip?: number; total?: number }
  ): number {
    let confidence = 0
    
    // Basic info confidence
    if (basicInfo.place) confidence += 0.2
    if (basicInfo.date) confidence += 0.1
    
    // Items confidence
    if (items.length > 0) {
      confidence += Math.min(0.4, items.length * 0.05)
    }
    
    // Totals confidence
    if (totals.total) confidence += 0.2
    if (totals.subtotal) confidence += 0.1
    
    // Validate totals make sense
    if (totals.subtotal && totals.tax && totals.total) {
      const calculatedTotal = totals.subtotal + totals.tax + (totals.tip || 0)
      const difference = Math.abs(calculatedTotal - totals.total)
      if (difference < 0.01) { // Within 1 cent
        confidence += 0.1
      }
    }
    
    return Math.min(1, confidence)
  }

  // Train the model with new patterns
  addPattern(pattern: ReceiptPattern): void {
    this.patterns.push(pattern)
  }

  // Get model statistics
  getStats(): { patternCount: number; itemPatternCount: number; totalPatternCount: number } {
    return {
      patternCount: this.patterns.length,
      itemPatternCount: this.itemPatterns.length,
      totalPatternCount: this.totalPatterns.length
    }
  }
}

// Singleton instance
export const customReceiptModel = new CustomReceiptModel()

// Helper function to determine if custom model should be used
export function shouldUseCustomModel(rawText: string): boolean {
  // Use custom model for simple, well-formatted receipts
  const lines = rawText.split('\n')
  const hasItems = lines.some(line => /\$?\d+\.?\d*$/.test(line.trim()))
  const hasTotals = /total[:\s]*\$?\d+\.?\d*/i.test(rawText)
  
  return hasItems && hasTotals && lines.length < 50 // Simple receipts
}

// Hybrid processing: try custom model first, fallback to AI
export async function processWithHybridModel(
  rawText: string,
  aiProcessor: (text: string) => Promise<any>
): Promise<CustomModelResult> {
  if (shouldUseCustomModel(rawText)) {
    const customResult = await customReceiptModel.process(rawText)
    if (customResult.confidence > 0.7) {
      return customResult
    }
  }
  
  // Fallback to AI processing
  const aiResult = await aiProcessor(rawText)
  return {
    ...aiResult,
    model: 'fallback',
    confidence: 0.8 // AI confidence
  }
}
