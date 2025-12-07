import { type VercelRequest, type VercelResponse } from '@vercel/node'
import { applyCors } from '../_utils/cors.js'
import { createRequestContext, sendErrorResponse, sendSuccessResponse } from '../_utils/request.js'

// Server-side feedback storage (in-memory for serverless, could be persisted to Supabase)
// This is a simple implementation - in production, store in database
const feedbackStorage = new Map<string, FeedbackData>()

interface CorrectionFeedback {
  field: string
  originalValue: number | string | null
  correctedValue: number | string
  correctionType: 'manual' | 'suggested_applied' | 'auto_calculated'
  wasHandwritten?: boolean
  receiptId?: string
}

interface FeedbackData {
  adjustments: string[]
  patterns: Array<{
    field: string
    patternType: string
    frequency: number
  }>
  lastUpdated: string
}

// Pattern detection logic (mirrors client-side)
function detectErrorPattern(
  original: number | string | null,
  corrected: number | string,
  field: string
): string {
  const origNum = typeof original === 'number' ? original : parseFloat(String(original)) || 0
  const corrNum = typeof corrected === 'number' ? corrected : parseFloat(String(corrected)) || 0

  if (origNum === 0 && corrNum > 0) return 'zero_extraction'
  if (origNum > 100 && corrNum < 100 && Math.abs(origNum / 100 - corrNum) < 0.1) return 'decimal_error'
  if (corrNum > 100 && origNum < 100 && Math.abs(corrNum / 100 - origNum) < 0.1) return 'decimal_error'

  const origStr = String(origNum).replace('.', '')
  const corrStr = String(corrNum).replace('.', '')
  if (corrStr.length > origStr.length && corrStr.includes(origStr)) return 'digit_drop'

  if (origStr.length === corrStr.length && origStr.length >= 2) {
    const sortedOrig = origStr.split('').sort().join('')
    const sortedCorr = corrStr.split('').sort().join('')
    if (sortedOrig === sortedCorr) return 'digit_swap'
  }

  if (field.startsWith('item') && Math.abs(origNum * 2 - corrNum) < 0.1) return 'quantity_error'

  return 'unknown'
}

// Generate prompt adjustments from patterns
function generateAdjustments(patterns: Map<string, { field: string; patternType: string; count: number }>): string[] {
  const adjustments: string[] = []
  const total = Array.from(patterns.values()).reduce((sum, p) => sum + p.count, 0)
  if (total < 5) return []

  const threshold = total * 0.15

  for (const [key, pattern] of patterns) {
    if (pattern.count < 3) continue

    switch (pattern.patternType) {
      case 'decimal_error':
        if (pattern.count >= threshold) {
          adjustments.push(`DECIMAL ALERT: ${pattern.field} often missing decimal point`)
        }
        break
      case 'digit_drop':
        if (pattern.count >= threshold) {
          adjustments.push(`DIGIT DROP ALERT: ${pattern.field} values losing digits`)
        }
        break
      case 'zero_extraction':
        adjustments.push(`EXTRACTION ALERT: ${pattern.field} often extracted as 0`)
        break
    }
  }

  return adjustments
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (applyCors(req, res)) return

  const ctx = createRequestContext(req as any, res as any, 'corrections_feedback')

  // GET: Retrieve current feedback/adjustments for OCR
  if (req.method === 'GET') {
    const sessionId = (req.query.sessionId as string) || 'global'
    const feedback = feedbackStorage.get(sessionId)

    sendSuccessResponse(res as any, {
      adjustments: feedback?.adjustments || [],
      patterns: feedback?.patterns || [],
      hasData: !!feedback
    }, 200, ctx)
    return
  }

  // POST: Submit new correction feedback
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { corrections, sessionId = 'global' } = body as {
        corrections: CorrectionFeedback[]
        sessionId?: string
      }

      if (!corrections || !Array.isArray(corrections)) {
        sendErrorResponse(res as any, {
          error: 'corrections array required',
          code: 'INVALID_REQUEST'
        }, 400, ctx)
        return
      }

      // Get or create session feedback
      const existingFeedback = feedbackStorage.get(sessionId)
      const patterns = new Map<string, { field: string; patternType: string; count: number }>()

      // Load existing patterns
      if (existingFeedback?.patterns) {
        for (const p of existingFeedback.patterns) {
          patterns.set(`${p.field}:${p.patternType}`, { ...p, count: p.frequency })
        }
      }

      // Process new corrections
      for (const correction of corrections) {
        const patternType = detectErrorPattern(
          correction.originalValue,
          correction.correctedValue,
          correction.field
        )

        const key = `${correction.field}:${patternType}`
        const existing = patterns.get(key)

        if (existing) {
          existing.count++
        } else {
          patterns.set(key, {
            field: correction.field,
            patternType,
            count: 1
          })
        }

        console.log(`[corrections] Tracked: ${correction.field} ${correction.originalValue} -> ${correction.correctedValue} (${patternType})`)
      }

      // Generate new adjustments
      const adjustments = generateAdjustments(patterns)

      // Store updated feedback
      const updatedFeedback: FeedbackData = {
        adjustments,
        patterns: Array.from(patterns.values()).map(p => ({
          field: p.field,
          patternType: p.patternType,
          frequency: p.count
        })),
        lastUpdated: new Date().toISOString()
      }

      feedbackStorage.set(sessionId, updatedFeedback)

      console.log(`[corrections] Updated feedback for session ${sessionId}: ${adjustments.length} adjustments, ${patterns.size} patterns`)

      sendSuccessResponse(res as any, {
        success: true,
        adjustmentsGenerated: adjustments.length,
        patternsTracked: patterns.size
      }, 200, ctx)
      return

    } catch (error: any) {
      console.error('[corrections] Error processing feedback:', error)
      sendErrorResponse(res as any, {
        error: 'Failed to process feedback',
        code: 'PROCESSING_ERROR',
        message: error.message
      }, 500, ctx)
      return
    }
  }

  sendErrorResponse(res as any, {
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  }, 405, ctx)
}
