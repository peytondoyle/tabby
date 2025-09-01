import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from '../_utils/cors'

// Server-side Supabase client using secret key
const SB_URL = 
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL

const SB_SECRET = process.env.SUPABASE_SECRET_KEY

const supabaseAdmin = (SB_URL && SB_SECRET) 
  ? createClient(SB_URL, SB_SECRET, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

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

  // Check if Supabase admin client is available
  if (!supabaseAdmin) {
    const duration = Date.now() - requestStart
    console.error(`[bills_list] Supabase admin client not configured in ${duration}ms`)
    return res.status(500).json({ 
      ok: false, 
      code: 'SUPABASE_NOT_CONFIGURED',
      message: 'Supabase admin client is not configured',
      missing: {
        url: !SB_URL,
        secret: !SB_SECRET
      }
    })
  }

  try {
    console.info('[bills_list] Fetching bills via list_bills RPC...')
    
    // Use the existing list_bills RPC function
    const { data, error } = await supabaseAdmin.rpc('list_bills')

    if (error) {
      const duration = Date.now() - requestStart
      console.error(`[bills_list] RPC failed in ${duration}ms:`, {
        error: error,
        code: error.code,
        message: error.message,
        details: error.details
      })

      return res.status(500).json({ 
        ok: false, 
        code: 'DATABASE_ERROR',
        message: `Failed to fetch bills: ${error.message}`,
        details: error.details,
        hint: error.hint
      })
    }

    const bills: BillSummary[] = (data ?? []).map((b: any) => ({
      ...b,
      item_count: Number(b.item_count ?? 0),
      people_count: Number(b.people_count ?? 0),
      total_amount: Number(b.total_amount ?? 0),
    }))

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