import { type VercelRequest, type VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from '../_utils/cors.js'

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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Apply CORS
  if (applyCors(req, res)) return

  // Only allow DELETE
  if (req.method !== 'DELETE') {
    console.warn(`[receipts_delete] Method not allowed: ${req.method}`)
    return res.status(405).json({
      ok: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only DELETE method is allowed'
    })
  }

  // Check if Supabase admin client is available
  if (!supabaseAdmin) {
    console.error('[receipts_delete] Supabase admin client not configured')
    return res.status(500).json({
      ok: false,
      code: 'SUPABASE_NOT_CONFIGURED',
      message: 'Supabase admin client is not configured'
    })
  }

  try {
    // Get token from query parameters (DELETE requests typically don't have bodies)
    const { token } = req.query

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        ok: false,
        code: 'TOKEN_REQUIRED',
        message: 'Token is required as query parameter'
      })
    }

    // Check if this is a local receipt (starts with 'local-')
    if (token.startsWith('local-')) {
      return res.status(200).json({
        ok: true,
        message: 'Local receipt deleted'
      })
    }

    // Delete receipt by editor_token (which is returned as 'token' in the API)
    const { error } = await supabaseAdmin
      .from('tabby_receipts')
      .delete()
      .eq('editor_token', token)

    if (error) {
      console.error('[receipts_delete] Error deleting receipt:', error)
      return res.status(500).json({
        ok: false,
        code: 'DELETE_FAILED',
        message: 'Failed to delete receipt',
        details: error.message
      })
    }

    console.info(`[receipts_delete] Receipt deleted successfully: ${token}`)
    return res.status(200).json({
      ok: true,
      message: 'Receipt deleted successfully'
    })

  } catch (error) {
    console.error('[receipts_delete] Error in delete receipt endpoint:', error)
    return res.status(500).json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    })
  }
}
