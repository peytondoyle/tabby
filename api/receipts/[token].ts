import { type VercelRequest, type VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from '../_utils/cors.js'
import { getReceipt } from '../_utils/memoryDb.js'

// Server-side Supabase client using secret key
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SUPABASE_KEY
  ? createClient(
      SUPABASE_URL,
      SUPABASE_KEY,
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

      // Fetch receipt data - query by editor_token or viewer_token (not UUID id)
      const { data: receipt, error: receiptError } = await supabaseAdmin
        .from('tabby_receipts')
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
          tip,
          discount,
          service_fee
        `)
        .or(`editor_token.eq.${token},viewer_token.eq.${token}`)
        .single()

      if (!receiptError && receipt) {
        console.log('[receipt_fetch] Found receipt in Supabase:', receipt.id)

        // Fetch items for this receipt
        const { data: items, error: itemsError } = await supabaseAdmin
          .from('tabby_items')
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
          .from('tabby_people')
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
          .from('tabby_item_shares')
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
        const total_amount = (receipt.subtotal || 0) - (receipt.discount || 0) + (receipt.service_fee || 0) + (receipt.sales_tax || 0) + (receipt.tip || 0)

        // Transform people to include their assigned items
        const transformedPeople = people?.map(person => {
          // Get all item IDs assigned to this person
          const assignedItems = shares
            ?.filter(share => share.person_id === person.id)
            .map(share => share.item_id) || []

          // Calculate person's total (items + proportional discount/service_fee/tax/tip)
          const personItemsTotal = assignedItems.reduce((sum, itemId) => {
            const item = items?.find(i => i.id === itemId)
            return sum + (item?.unit_price || 0)
          }, 0)

          const proportion = receipt.subtotal > 0 ? personItemsTotal / receipt.subtotal : 0
          const personDiscount = (receipt.discount || 0) * proportion
          const personServiceFee = (receipt.service_fee || 0) * proportion
          const personTax = (receipt.sales_tax || 0) * proportion
          const personTip = (receipt.tip || 0) * proportion
          const personTotal = personItemsTotal - personDiscount + personServiceFee + personTax + personTip

          return {
            id: person.id,
            name: person.name,
            items: assignedItems,
            total: personTotal
          }
        }) || []

        const receiptSummary = {
          id: receipt.id,
          token: receipt.editor_token, // Use editor_token as the primary token
          title: receipt.title,
          place: receipt.place,
          date: receipt.date,
          created_at: receipt.created_at,
          subtotal: receipt.subtotal,
          sales_tax: receipt.sales_tax,
          tip: receipt.tip,
          discount: receipt.discount || 0,
          service_fee: receipt.service_fee || 0,
          item_count,
          people_count,
          total_amount
        }

        return res.status(200).json({
          ok: true,
          bill: receiptSummary, // Keep 'bill' for backwards compatibility with frontend
          receipt: receiptSummary, // Also include 'receipt' for consistency
          items: transformedItems,
          people: transformedPeople,
          shares: shares || []  // Include raw shares for weight-based splitting
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
      const memoryReceiptData = {
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
      }

      return res.status(200).json({
        ok: true,
        bill: memoryReceiptData, // Keep 'bill' for backwards compatibility
        receipt: memoryReceiptData, // Also include 'receipt' for consistency
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
