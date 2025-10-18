import { type VercelRequest, type VercelResponse } from '@vercel/node'
import { applyCors } from '../_utils/cors.js'
import { listReceipts } from '../_utils/memoryDb.js'

interface ReceiptSummary {
  id: string
  token: string
  title: string | null
  place: string | null
  date: string | null   // YYYY-MM-DD
  created_at: string    // ISO string
  item_count: number
  people_count: number
  total_amount: number | null
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const requestStart = Date.now()

  // Apply CORS
  if (applyCors(req, res)) return

  // Only allow GET
  if (req.method !== 'GET') {
    console.warn(`[receipts_list] Method not allowed: ${req.method}`)
    return res.status(405).json({
      ok: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only GET method is allowed'
    })
  }

  try {
    console.info('[receipts_list] Using in-memory storage')

    // Get receipts from memory storage
    const receipts: ReceiptSummary[] = listReceipts()

    const duration = Date.now() - requestStart
    console.info(`[receipts_list] Found ${receipts.length} receipts in ${duration}ms`)

    res.status(200).json({
      ok: true,
      receipts
    })

  } catch (error) {
    const duration = Date.now() - requestStart
    console.error(`[receipts_list] Unexpected error in ${duration}ms:`, error)

    res.status(500).json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while fetching receipts'
    })
  }
}
