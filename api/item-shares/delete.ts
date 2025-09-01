import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from '../_lib/cors.js'

// Server-side Supabase client using secret key
const supabaseAdmin = process.env.SUPABASE_SECRET_KEY 
  ? createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null

interface DeleteItemShareRequest {
  item_id: string
  person_id: string
  editor_token?: string
}

interface DeleteItemShareResponse {
  ok: boolean
  message?: string
  code?: string
}

function validateInput(body: any): { valid: boolean; error?: string; parsed?: DeleteItemShareRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' }
  }

  const { item_id, person_id, editor_token } = body

  if (!item_id || typeof item_id !== 'string') {
    return { valid: false, error: 'item_id is required and must be a string' }
  }

  if (!person_id || typeof person_id !== 'string') {
    return { valid: false, error: 'person_id is required and must be a string' }
  }

  return {
    valid: true,
    parsed: {
      item_id,
      person_id,
      editor_token: editor_token || undefined
    }
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const requestStart = Date.now()

  // Apply CORS
  if (applyCors(req, res)) return

  // Only allow DELETE and POST (for compatibility)
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    console.warn(`[item_share_delete] Method not allowed: ${req.method}`)
    return res.status(405).json({ 
      ok: false, 
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only DELETE and POST methods are allowed' 
    })
  }

  // Check if Supabase admin client is available
  if (!supabaseAdmin) {
    const duration = Date.now() - requestStart
    console.error(`[item_share_delete] Supabase admin client not configured in ${duration}ms`)
    return res.status(500).json({ 
      ok: false, 
      code: 'SUPABASE_NOT_CONFIGURED',
      message: 'Supabase admin client is not configured' 
    })
  }

  try {
    // Validate request body
    const validation = validateInput(req.body)
    if (!validation.valid) {
      const duration = Date.now() - requestStart
      console.error(`[item_share_delete] Validation failed in ${duration}ms:`, validation.error)
      return res.status(400).json({ 
        ok: false, 
        code: 'VALIDATION_ERROR',
        message: validation.error 
      })
    }

    const { item_id, person_id, editor_token } = validation.parsed!

    console.info(`[item_share_delete] Deleting item share for item ${item_id}, person ${person_id}`)

    // Delete the item share using admin client
    const { data, error } = await supabaseAdmin
      .from('item_shares')
      .delete()
      .eq('item_id', item_id)
      .eq('person_id', person_id)
      .select('*')

    if (error) {
      const duration = Date.now() - requestStart
      console.error(`[item_share_delete] Delete failed in ${duration}ms:`, {
        error: error,
        code: error.code,
        message: error.message
      })

      return res.status(500).json({ 
        ok: false, 
        code: 'DATABASE_ERROR',
        message: `Failed to delete item share: ${error.message}` 
      })
    }

    const duration = Date.now() - requestStart
    console.info(`[item_share_delete] Item share deleted successfully in ${duration}ms`)
    
    // Return success response
    const response: DeleteItemShareResponse = {
      ok: true,
      message: 'Item share deleted successfully'
    }

    res.status(200).json(response)

  } catch (error) {
    const duration = Date.now() - requestStart
    console.error(`[item_share_delete] Unexpected error in ${duration}ms:`, error)
    
    res.status(500).json({ 
      ok: false, 
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while deleting item share' 
    })
  }
}