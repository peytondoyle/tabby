import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from '../_utils/cors.js'
import { getReceipt } from '../_utils/memoryDb.js'

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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Apply CORS
  if (applyCors(req, res)) return

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed'
    })
  }

  const { token } = req.query

  if (!token || typeof token !== 'string') {
    return res.status(400).json({
      ok: false,
      error: 'Token is required'
    })
  }

  try {
    console.log('[receipt_fetch] Looking for receipt:', token)

    // Try Supabase FIRST for persistence (Option 2)
    if (supabaseAdmin) {

      console.log('[receipt_fetch] Checking Supabase...')

      // Fetch receipt data - query by id, editor_token, or viewer_token
      const { data: receipt, error: receiptError } = await supabaseAdmin
        .from('receipts')
        .select(`
          id,
          editor_token,
          viewer_token,
          title,
          place,
          date,
          created_at,
          subtotal,
          sales_tax,
          tip
        `)
        .or(`id.eq.${token},editor_token.eq.${token},viewer_token.eq.${token}`)
        .single()

      if (!receiptError && receipt) {
        console.log('[receipt_fetch] Found receipt in Supabase:', receipt.id)

        // Fetch items for this receipt
        const { data: items, error: itemsError } = await supabaseAdmin
          .from('items')
          .select(`
            id,
            label,
            unit_price,
            emoji,
            qty
          `)
          .eq('receipt_id', receipt.id)

        // Transform to frontend format (price from unit_price, quantity from qty)
        const transformedItems = items?.map(item => ({
          id: item.id,
          label: item.label,
          price: item.unit_price,
          emoji: item.emoji,
          quantity: item.qty
        })) || []

        if (itemsError) {
          console.error('[receipt_fetch] Error fetching items:', itemsError)
          return res.status(500).json({
            ok: false,
            error: 'Failed to fetch items'
          })
        }

        // Fetch people for this receipt
        const { data: people, error: peopleError } = await supabaseAdmin
          .from('people')
          .select(`
            id,
            name,
            avatar_url,
            venmo_handle
          `)
          .eq('receipt_id', receipt.id)

        if (peopleError) {
          console.error('[receipt_fetch] Error fetching people:', peopleError)
          return res.status(500).json({
            ok: false,
            error: 'Failed to fetch people'
          })
        }

        // Fetch item shares (assignments) - join through items table
        const { data: shares, error: sharesError } = await supabaseAdmin
          .from('item_shares')
          .select(`
            item_id,
            person_id,
            weight
          `)
          .in('item_id', items?.map(item => item.id) || [])

        if (sharesError) {
          console.error('[receipt_fetch] Error fetching shares:', sharesError)
          return res.status(500).json({
            ok: false,
            error: 'Failed to fetch assignments'
          })
        }

        // Calculate counts
        const item_count = items?.length || 0
        const people_count = people?.length || 0
        const total_amount = (receipt.subtotal || 0) + (receipt.sales_tax || 0) + (receipt.tip || 0)

        const receiptSummary = {
          id: receipt.id,
          token: receipt.editor_token, // Use editor_token as the primary token
          title: receipt.title,
          place: receipt.place,
          date: receipt.date,
          created_at: receipt.created_at,
          item_count,
          people_count,
          total_amount
        }

        return res.status(200).json({
          ok: true,
          receipt: receiptSummary,
          items: transformedItems,
          people: people || [],
          shares: shares || []
        })
      }

      console.log('[receipt_fetch] Receipt not found in Supabase, falling back to memory...')
    }

    // Fall back to in-memory database if Supabase not available or receipt not found
    console.log('[receipt_fetch] Memory DB size:', (global as any).__tabby_receipts?.size || 0)

    const memoryReceipt = getReceipt(token)

    if (memoryReceipt) {
      console.log('[receipt_fetch] Found receipt in memory:', token)

      // Return receipt from memory with items
      return res.status(200).json({
        ok: true,
        receipt: {
          id: memoryReceipt.id,
          editor_token: memoryReceipt.token,
          viewer_token: memoryReceipt.token,
          title: memoryReceipt.title,
          place: memoryReceipt.place,
          date: memoryReceipt.date,
          created_at: memoryReceipt.created_at,
          subtotal: memoryReceipt.total_amount,
          sales_tax: 0,
          tip: 0
        },
        items: memoryReceipt.items || [],
        people: [],
        shares: []
      })
    }

    // Not found anywhere
    return res.status(404).json({
      ok: false,
      error: 'Receipt not found'
    })

  } catch (error) {
    console.error('[receipt_fetch] Unexpected error:', error)
    return res.status(500).json({
      ok: false,
      error: 'Internal server error'
    })
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
}
