// Correction Analytics - Track manual corrections to improve OCR prompts
import { supabase, isSupabaseAvailable } from './supabaseClient'
import { logServer } from './errorLogger'

export interface CorrectionRecord {
  id?: string
  receipt_id?: string
  field: string  // e.g., 'tip', 'tax', 'subtotal', 'total', 'item_price', 'item_label'
  original_value: string | number | null
  corrected_value: string | number
  correction_type: 'manual' | 'suggested_applied' | 'auto_calculated'
  confidence?: number  // OCR confidence at time of extraction
  was_handwritten?: boolean
  created_at?: string
}

// Local storage key for offline correction tracking
const LOCAL_CORRECTIONS_KEY = 'tabby_correction_analytics'

// Track a correction (stores locally and syncs to Supabase when available)
export async function trackCorrection(
  correction: Omit<CorrectionRecord, 'id' | 'created_at'>
): Promise<void> {
  const record: CorrectionRecord = {
    ...correction,
    created_at: new Date().toISOString()
  }

  console.log('[corrections] Tracking correction:', {
    field: correction.field,
    from: correction.original_value,
    to: correction.corrected_value,
    type: correction.correction_type
  })

  // Store locally first (always works, even offline)
  storeLocalCorrection(record)

  // Try to sync to Supabase if available
  if (isSupabaseAvailable()) {
    try {
      await syncCorrectionToSupabase(record)
    } catch (error) {
      console.warn('[corrections] Failed to sync to Supabase, stored locally:', error)
      logServer('warn', 'Correction sync failed', { error, correction })
    }
  }
}

// Store correction in localStorage
function storeLocalCorrection(record: CorrectionRecord): void {
  try {
    const existing = getLocalCorrections()
    existing.push(record)

    // Keep only last 100 corrections locally
    const trimmed = existing.slice(-100)
    localStorage.setItem(LOCAL_CORRECTIONS_KEY, JSON.stringify(trimmed))
  } catch (error) {
    console.error('[corrections] Failed to store locally:', error)
  }
}

// Get corrections from localStorage
export function getLocalCorrections(): CorrectionRecord[] {
  try {
    const stored = localStorage.getItem(LOCAL_CORRECTIONS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Sync a correction to Supabase
async function syncCorrectionToSupabase(record: CorrectionRecord): Promise<void> {
  const { error } = await supabase
    .from('correction_analytics')
    .insert({
      receipt_id: record.receipt_id,
      field: record.field,
      original_value: String(record.original_value),
      corrected_value: String(record.corrected_value),
      correction_type: record.correction_type,
      confidence: record.confidence,
      was_handwritten: record.was_handwritten
    })

  if (error) {
    // Table might not exist yet - that's okay, we still track locally
    if (error.code === '42P01') { // Table doesn't exist
      console.log('[corrections] Analytics table not created yet, tracking locally only')
      return
    }
    throw error
  }
}

// Get correction analytics summary
export async function getCorrectionAnalytics(): Promise<{
  totalCorrections: number
  byField: Record<string, number>
  handwrittenIssues: number
  suggestedApplied: number
  mostCorrectedFields: string[]
}> {
  const localCorrections = getLocalCorrections()

  // Calculate analytics from local data
  const byField: Record<string, number> = {}
  let handwrittenIssues = 0
  let suggestedApplied = 0

  for (const correction of localCorrections) {
    // Count by field
    byField[correction.field] = (byField[correction.field] || 0) + 1

    // Count handwritten issues
    if (correction.was_handwritten) {
      handwrittenIssues++
    }

    // Count applied suggestions
    if (correction.correction_type === 'suggested_applied') {
      suggestedApplied++
    }
  }

  // Sort fields by correction count
  const mostCorrectedFields = Object.entries(byField)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([field]) => field)

  return {
    totalCorrections: localCorrections.length,
    byField,
    handwrittenIssues,
    suggestedApplied,
    mostCorrectedFields
  }
}

// Generate prompt improvement suggestions based on correction patterns
export function generatePromptImprovements(): string[] {
  const localCorrections = getLocalCorrections()
  const improvements: string[] = []

  // Analyze patterns
  const fieldCounts: Record<string, number> = {}
  const handwrittenFields: Record<string, number> = {}

  for (const correction of localCorrections) {
    fieldCounts[correction.field] = (fieldCounts[correction.field] || 0) + 1
    if (correction.was_handwritten) {
      handwrittenFields[correction.field] = (handwrittenFields[correction.field] || 0) + 1
    }
  }

  // Generate suggestions based on patterns
  const total = localCorrections.length
  if (total === 0) return []

  // Check if tip is frequently corrected
  if ((fieldCounts['tip'] || 0) / total > 0.2) {
    improvements.push('TIP extraction needs improvement - consider emphasizing handwritten tip detection')
  }

  // Check if tax is frequently corrected
  if ((fieldCounts['tax'] || 0) / total > 0.15) {
    improvements.push('TAX extraction may be missing some formats - add more tax label variations')
  }

  // Check handwritten issues
  const handwrittenTotal = Object.values(handwrittenFields).reduce((a, b) => a + b, 0)
  if (handwrittenTotal / total > 0.3) {
    improvements.push('Handwritten text detection needs improvement - emphasize looking for pen/pencil marks')
  }

  // Check item price corrections
  if ((fieldCounts['item_price'] || 0) / total > 0.25) {
    improvements.push('Item price extraction has issues - may need better number parsing')
  }

  return improvements
}

// Clear local correction data
export function clearLocalCorrections(): void {
  localStorage.removeItem(LOCAL_CORRECTIONS_KEY)
  console.log('[corrections] Cleared local correction history')
}

// #11: CORRECTION FEEDBACK LOOP
// Analyze patterns in corrections to generate actionable feedback for OCR

export interface CorrectionPattern {
  field: string
  patternType: 'decimal_error' | 'digit_drop' | 'digit_swap' | 'zero_extraction' | 'handwritten_miss' | 'quantity_error' | 'unknown'
  frequency: number
  examples: Array<{ original: number | string; corrected: number | string }>
  suggestion: string
}

export interface FeedbackReport {
  totalCorrections: number
  patterns: CorrectionPattern[]
  promptAdjustments: string[]
  confidence: number // Overall system confidence based on error rate
  generatedAt: string
}

// Analyze a single correction to detect error pattern
function detectErrorPattern(
  original: number | string | null,
  corrected: number | string,
  field: string
): CorrectionPattern['patternType'] {
  const origNum = typeof original === 'number' ? original : parseFloat(String(original)) || 0
  const corrNum = typeof corrected === 'number' ? corrected : parseFloat(String(corrected)) || 0

  // Zero extraction error (didn't find a value that exists)
  if (origNum === 0 && corrNum > 0) {
    return 'zero_extraction'
  }

  // Decimal point error (e.g., 1299 → 12.99 or 12.99 → 1299)
  if (origNum > 100 && corrNum < 100 && Math.abs(origNum / 100 - corrNum) < 0.1) {
    return 'decimal_error'
  }
  if (corrNum > 100 && origNum < 100 && Math.abs(corrNum / 100 - origNum) < 0.1) {
    return 'decimal_error'
  }

  // Digit drop error (e.g., 90 → 19, 16 → 6, 12 → 2)
  const origStr = String(origNum).replace('.', '')
  const corrStr = String(corrNum).replace('.', '')
  if (corrStr.length > origStr.length && corrStr.includes(origStr)) {
    return 'digit_drop' // Original was missing digits
  }

  // Digit swap error (similar values but digits transposed)
  if (origStr.length === corrStr.length && origStr.length >= 2) {
    const sortedOrig = origStr.split('').sort().join('')
    const sortedCorr = corrStr.split('').sort().join('')
    if (sortedOrig === sortedCorr) {
      return 'digit_swap'
    }
  }

  // Quantity error (for item prices)
  if (field.startsWith('item') && Math.abs(origNum * 2 - corrNum) < 0.1) {
    return 'quantity_error'
  }

  return 'unknown'
}

// Generate feedback report from correction history
export function generateFeedbackReport(): FeedbackReport {
  const corrections = getLocalCorrections()
  const patterns: Map<string, CorrectionPattern> = new Map()

  // Analyze each correction
  for (const correction of corrections) {
    const patternType = detectErrorPattern(
      correction.original_value,
      correction.corrected_value,
      correction.field
    )

    const key = `${correction.field}:${patternType}`
    const existing = patterns.get(key)

    if (existing) {
      existing.frequency++
      if (existing.examples.length < 5) {
        existing.examples.push({
          original: correction.original_value ?? 0,
          corrected: correction.corrected_value
        })
      }
    } else {
      patterns.set(key, {
        field: correction.field,
        patternType,
        frequency: 1,
        examples: [{
          original: correction.original_value ?? 0,
          corrected: correction.corrected_value
        }],
        suggestion: generatePatternSuggestion(correction.field, patternType)
      })
    }
  }

  // Sort patterns by frequency
  const sortedPatterns = Array.from(patterns.values())
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10) // Top 10 patterns

  // Generate prompt adjustments based on patterns
  const promptAdjustments = generatePromptAdjustments(sortedPatterns, corrections.length)

  // Calculate system confidence (lower if many corrections)
  const totalReceipts = new Set(corrections.map(c => c.receipt_id)).size || 1
  const errorRate = corrections.length / totalReceipts
  const confidence = Math.max(0.5, 1 - (errorRate * 0.1))

  return {
    totalCorrections: corrections.length,
    patterns: sortedPatterns,
    promptAdjustments,
    confidence,
    generatedAt: new Date().toISOString()
  }
}

// Generate human-readable suggestion for a pattern
function generatePatternSuggestion(field: string, patternType: CorrectionPattern['patternType']): string {
  const suggestions: Record<CorrectionPattern['patternType'], Record<string, string>> = {
    decimal_error: {
      default: 'Prices may be missing decimal points. Watch for values like 1299 that should be 12.99',
      item_price: 'Item prices missing decimals - 1599 should be $15.99',
      subtotal: 'Subtotal decimal placement error',
      total: 'Total decimal placement error'
    },
    digit_drop: {
      default: 'Leading or trailing digits being dropped. 90 read as 9, 16 read as 6',
      tip: 'Tip amounts often missing leading digits - $6 may be $16',
      total: 'Total missing digits - verify each digit carefully',
      item_price: 'Item prices missing tens digit - $9 may be $19 or $90'
    },
    digit_swap: {
      default: 'Digits being swapped or transposed',
      tax: 'Tax digits may be transposed'
    },
    zero_extraction: {
      default: 'Field not being extracted when present on receipt',
      tip: 'TIP field exists but extracted as 0 - look for handwritten tips',
      tax: 'TAX field exists but extracted as 0 - look for tax line',
      discount: 'Discount exists but not extracted - look for negative amounts'
    },
    handwritten_miss: {
      default: 'Handwritten values not being detected',
      tip: 'Handwritten tips frequently missed - check signature area',
      total: 'Handwritten totals not detected - look for pen marks'
    },
    quantity_error: {
      default: 'Quantity multiplied prices incorrectly',
      item_price: 'Item total used instead of unit price when quantity present'
    },
    unknown: {
      default: 'Unknown error pattern - manual investigation needed'
    }
  }

  return suggestions[patternType]?.[field] || suggestions[patternType]?.default || suggestions.unknown.default
}

// Generate dynamic prompt adjustments based on error patterns
function generatePromptAdjustments(patterns: CorrectionPattern[], totalCorrections: number): string[] {
  if (totalCorrections < 5) {
    return [] // Not enough data for reliable patterns
  }

  const adjustments: string[] = []
  const threshold = totalCorrections * 0.15 // 15% of corrections = significant pattern

  for (const pattern of patterns) {
    if (pattern.frequency < 3) continue // Need at least 3 occurrences

    const isSignificant = pattern.frequency >= threshold

    switch (pattern.patternType) {
      case 'decimal_error':
        if (isSignificant) {
          adjustments.push(`DECIMAL ALERT: ${pattern.field} often missing decimal point. Examples: ${pattern.examples.map(e => `${e.original}→${e.corrected}`).join(', ')}`)
        }
        break

      case 'digit_drop':
        if (isSignificant) {
          adjustments.push(`DIGIT DROP ALERT: ${pattern.field} values losing digits. Read each digit carefully. Examples: ${pattern.examples.map(e => `${e.original}→${e.corrected}`).join(', ')}`)
        }
        break

      case 'zero_extraction':
        adjustments.push(`EXTRACTION ALERT: ${pattern.field} often extracted as 0 when value exists. Look more carefully for ${pattern.field} line.`)
        break

      case 'handwritten_miss':
        adjustments.push(`HANDWRITING ALERT: ${pattern.field} handwritten values frequently missed. Check for pen/pencil marks.`)
        break

      case 'quantity_error':
        adjustments.push(`QUANTITY ALERT: When items have quantities, extract the LINE TOTAL, not unit price.`)
        break
    }
  }

  // Add field-specific adjustments if many errors for that field
  const fieldCounts: Record<string, number> = {}
  for (const pattern of patterns) {
    fieldCounts[pattern.field] = (fieldCounts[pattern.field] || 0) + pattern.frequency
  }

  if (fieldCounts.tip >= threshold * 2) {
    adjustments.push('HIGH TIP ERROR RATE: Pay extra attention to tip extraction, especially handwritten values.')
  }
  if (fieldCounts.item_price >= threshold * 2) {
    adjustments.push('HIGH ITEM PRICE ERROR RATE: Re-read each item price digit by digit.')
  }

  return adjustments
}

// Get prompt adjustments for current OCR request
export function getOCRPromptFeedback(): { adjustments: string[]; confidence: number } {
  try {
    const report = generateFeedbackReport()
    return {
      adjustments: report.promptAdjustments,
      confidence: report.confidence
    }
  } catch (error) {
    console.warn('[corrections] Failed to generate feedback:', error)
    return { adjustments: [], confidence: 1.0 }
  }
}

// Format adjustments for injection into OCR prompt
export function formatPromptAdjustments(adjustments: string[]): string {
  if (adjustments.length === 0) return ''

  return `
═══════════════════════════════════════════════════════════════
⚡ LEARNED FROM PREVIOUS CORRECTIONS
═══════════════════════════════════════════════════════════════
Based on past extraction errors, pay special attention to:
${adjustments.map((adj, i) => `${i + 1}. ${adj}`).join('\n')}
`
}
