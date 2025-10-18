import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_utils/cors'
import { rateLimit } from '../_utils/rateLimit'
import { logServer } from '../../src/lib/errorLogger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ShareUpdate {
  item_id: string
  person_id: string
  weight: number
}

interface BatchSharesRequest {
  shares: ShareUpdate[]
  editor_token: string
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: corsHeaders }
      )
    }

    const body: BatchSharesRequest = await request.json()
    const { shares, editor_token } = body

    // Validate input
    if (!shares || !Array.isArray(shares) || shares.length === 0) {
      return NextResponse.json(
        { error: 'Invalid shares array' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!editor_token) {
      return NextResponse.json(
        { error: 'Editor token required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate each share
    for (const share of shares) {
      if (!share.item_id || !share.person_id || typeof share.weight !== 'number') {
        return NextResponse.json(
          { error: 'Invalid share data' },
          { status: 400, headers: corsHeaders }
        )
      }

      if (share.weight <= 0 || share.weight > 100) {
        return NextResponse.json(
          { error: 'Weight must be between 1 and 100' },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Verify editor token has access to the bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('id')
      .eq('editor_token', editor_token)
      .single()

    if (billError || !bill) {
      return NextResponse.json(
        { error: 'Invalid editor token' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Get all item IDs to verify they belong to this bill
    const itemIds = [...new Set(shares.map(s => s.item_id))]
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id')
      .eq('bill_id', bill.id)
      .in('id', itemIds)

    if (itemsError) {
      logServer('error', 'Failed to fetch items for batch update', { error: itemsError })
      return NextResponse.json(
        { error: 'Failed to validate items' },
        { status: 500, headers: corsHeaders }
      )
    }

    const validItemIds = new Set(items?.map(item => item.id) || [])
    const invalidShares = shares.filter(share => !validItemIds.has(share.item_id))
    
    if (invalidShares.length > 0) {
      return NextResponse.json(
        { error: 'Some items do not belong to this bill' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Get all person IDs to verify they belong to this bill
    const personIds = [...new Set(shares.map(s => s.person_id))]
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('id')
      .eq('bill_id', bill.id)
      .in('id', personIds)

    if (peopleError) {
      logServer('error', 'Failed to fetch people for batch update', { error: peopleError })
      return NextResponse.json(
        { error: 'Failed to validate people' },
        { status: 500, headers: corsHeaders }
      )
    }

    const validPersonIds = new Set(people?.map(person => person.id) || [])
    const invalidPersonShares = shares.filter(share => !validPersonIds.has(share.person_id))
    
    if (invalidPersonShares.length > 0) {
      return NextResponse.json(
        { error: 'Some people do not belong to this bill' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Perform batch upsert in a transaction
    const { data: upsertedShares, error: upsertError } = await supabase
      .rpc('bulk_upsert_item_shares_with_editor_token', {
        etoken: editor_token,
        shares: shares.map(share => ({
          item_id: share.item_id,
          person_id: share.person_id,
          weight: share.weight
        }))
      })

    if (upsertError) {
      logServer('error', 'Failed to batch upsert shares', { 
        error: upsertError,
        shareCount: shares.length,
        editorToken: editor_token
      })
      return NextResponse.json(
        { error: 'Failed to update shares' },
        { status: 500, headers: corsHeaders }
      )
    }

    logServer('info', 'Successfully batch updated shares', {
      shareCount: shares.length,
      editorToken: editor_token
    })

    return NextResponse.json(
      { 
        success: true, 
        updated_shares: upsertedShares,
        count: shares.length
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    logServer('error', 'Batch shares API error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  })
}
