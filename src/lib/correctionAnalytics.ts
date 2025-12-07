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
