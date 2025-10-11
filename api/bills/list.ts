import { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from '../_utils/cors.js'
import { listBills } from '../_utils/memoryDb.js'

interface BillSummary {
  id: string
  token: string
  title: string | null
  place: string | null
  date: string | null   // YYYY-MM-DD
  created_at: string    // ISO string
  item_count: number
  people_count: number
  total_amount: number
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
    console.warn(`[bills_list] Method not allowed: ${req.method}`)
    return res.status(405).json({ 
      ok: false, 
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only GET method is allowed' 
    })
  }

  try {
    console.info('[bills_list] Using in-memory storage')

    // Get bills from memory storage
    const bills: BillSummary[] = listBills()

    const duration = Date.now() - requestStart
    console.info(`[bills_list] Found ${bills.length} bills in ${duration}ms`)
    
    res.status(200).json({
      ok: true,
      bills
    })

  } catch (error) {
    const duration = Date.now() - requestStart
    console.error(`[bills_list] Unexpected error in ${duration}ms:`, error)
    
    res.status(500).json({ 
      ok: false, 
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while fetching bills' 
    })
  }
}