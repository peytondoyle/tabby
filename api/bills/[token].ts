import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from '../_utils/cors.js'

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
    if (!supabaseAdmin) {
      return res.status(500).json({ 
        ok: false, 
        error: 'Database not configured' 
      })
    }

    // Fetch bill data
    const { data: bill, error: billError } = await supabaseAdmin
      .from('bills')
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
      .or(`editor_token.eq.${token},viewer_token.eq.${token}`)
      .single()

    if (billError) {
      console.error('[bill_fetch] Error fetching bill:', billError)
      return res.status(404).json({ 
        ok: false, 
        error: 'Bill not found' 
      })
    }

    // Fetch items for this bill
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('items')
      .select(`
        id,
        label,
        price,
        emoji,
        qty
      `)
      .eq('bill_id', bill.id)

    // Transform qty to quantity for frontend compatibility
    const transformedItems = items?.map(item => ({
      ...item,
      quantity: item.qty,
      // Remove qty to avoid confusion
      qty: undefined
    })) || []

    if (itemsError) {
      console.error('[bill_fetch] Error fetching items:', itemsError)
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to fetch items' 
      })
    }

    // Fetch people for this bill
    const { data: people, error: peopleError } = await supabaseAdmin
      .from('people')
      .select(`
        id,
        name,
        avatar_url,
        venmo_handle
      `)
      .eq('bill_id', bill.id)

    if (peopleError) {
      console.error('[bill_fetch] Error fetching people:', peopleError)
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
      console.error('[bill_fetch] Error fetching shares:', sharesError)
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to fetch assignments' 
      })
    }

    // Calculate counts
    const item_count = items?.length || 0
    const people_count = people?.length || 0
    const total_amount = (bill.subtotal || 0) + (bill.sales_tax || 0) + (bill.tip || 0)

    const billSummary = {
      id: bill.id,
      token: bill.editor_token, // Use editor_token as the primary token
      title: bill.title,
      place: bill.place,
      date: bill.date,
      created_at: bill.created_at,
      item_count,
      people_count,
      total_amount
    }

    return res.status(200).json({
      ok: true,
      bill: billSummary,
      items: transformedItems,
      people: people || [],
      shares: shares || []
    })

  } catch (error) {
    console.error('[bill_fetch] Unexpected error:', error)
    return res.status(500).json({ 
      ok: false, 
      error: 'Internal server error' 
    })
  }
}
