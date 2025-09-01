import type { SupabaseClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { supabase, isSupabaseAvailable } from './supabaseClient'
import type { ParseResult } from './receiptScanning'

export type BillSummary = {
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

/**
 * Load bills from localStorage fallback
 */
function loadBillsFromLocalStorage(): BillSummary[] {
  try {
    const localBillsJson = localStorage.getItem('local-bills')
    const localBills = JSON.parse(localBillsJson || '[]')
    
    return localBills.map((bill: any) => ({
      id: bill.id,
      token: bill.token || bill.editor_token,
      title: bill.title,
      place: bill.place || bill.location,
      date: bill.date,
      created_at: bill.created_at,
      item_count: bill.item_count || 0,
      people_count: bill.people_count || 0,
      total_amount: bill.total_amount || bill.total || 0
    }))
  } catch (error) {
    console.error('Error loading bills from localStorage:', error)
    return []
  }
}

/**
 * Fetch bills from Supabase with localStorage fallback
 */
export async function fetchBills(client: SupabaseClient): Promise<BillSummary[]> {
  const { data, error } = await client.rpc('list_bills')
  if (error) {
    console.warn('[Tabby] list_bills RPC failed, using local fallback:', error)
    return loadBillsFromLocalStorage()
  }
  return (data ?? []).map((b: any) => ({
    ...b,
    item_count: Number(b.item_count ?? 0),
    people_count: Number(b.people_count ?? 0),
    total_amount: Number(b.total_amount ?? 0),
  })) as BillSummary[]
}

/**
 * Create a bill from parsed receipt data
 */
export async function createBillFromParse(parsed: ParseResult): Promise<string> {
  console.info('[bill_create] Creating bill from parsed data...')
  const startTime = Date.now()
  
  try {
    const isSupabaseEnabled = isSupabaseAvailable()
    
    if (!isSupabaseEnabled) {
      console.warn('[bill_create] Supabase not available - creating local bill')
      return createLocalBill(parsed)
    }

    // Generate tokens
    const editorToken = `edit-${nanoid()}`
    const viewerToken = `view-${nanoid()}`
    
    // Create bill in Supabase
    const billData = {
      title: parsed.place || "Receipt Upload",
      place: parsed.place,
      date: parsed.date || new Date().toISOString().split('T')[0],
      subtotal: parsed.subtotal || 0,
      tax: parsed.tax || 0,
      tip: parsed.tip || 0,
      total: parsed.total || parsed.items.reduce((sum, item) => sum + item.price, 0),
      editor_token: editorToken,
      viewer_token: viewerToken
    }

    console.info('[bill_create] Inserting bill into Supabase...')
    
    const { data: bill, error: billError } = await supabase!
      .from('bills')
      .insert(billData)
      .select()
      .single()

    if (billError) {
      console.error('[bill_create] Supabase bill creation failed:', billError)
      throw billError
    }

    const billId = bill.id
    console.info(`[bill_create] Bill created with ID: ${billId}`)

    // Create items
    const itemsData = parsed.items.map(item => ({
      bill_id: billId,
      label: item.label,
      price: item.price,
      emoji: item.emoji || '🍽️',
      quantity: 1
    }))

    if (itemsData.length > 0) {
      console.info(`[bill_create] Creating ${itemsData.length} items...`)
      
      const { error: itemsError } = await supabase!
        .from('items')
        .insert(itemsData)

      if (itemsError) {
        console.error('[bill_create] Failed to create items:', itemsError)
        // Continue anyway - we have the bill
      } else {
        console.info(`[bill_create] ${itemsData.length} items created successfully`)
      }
    }

    const duration = Date.now() - startTime
    console.info(`[bill_create] Bill creation completed in ${duration}ms - bill ID: ${billId}`)
    
    return billId

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[bill_create] Bill creation failed in ${duration}ms:`, error)
    
    // Fallback to localStorage
    console.info('[bill_create] Falling back to local storage...')
    return createLocalBill(parsed)
  }
}

/**
 * Create a local bill (fallback when Supabase is unavailable)
 */
function createLocalBill(parsed: ParseResult): string {
  const billId = `local-${nanoid()}`
  
  const billData = {
    id: billId,
    token: `edit-${nanoid()}`,
    title: parsed.place || "Receipt Upload",
    place: parsed.place,
    date: parsed.date || new Date().toISOString().split('T')[0],
    subtotal: parsed.subtotal || 0,
    tax: parsed.tax || 0,
    tip: parsed.tip || 0,
    total: parsed.total || parsed.items.reduce((sum, item) => sum + item.price, 0),
    created_at: new Date().toISOString(),
    editor_token: `edit-${nanoid()}`,
    viewer_token: `view-${nanoid()}`,
    items: parsed.items.map(item => ({
      id: item.id,
      label: item.label,
      price: item.price,
      emoji: item.emoji || '🍽️',
      quantity: 1
    })),
    item_count: parsed.items.length,
    people_count: 0,
    total_amount: parsed.total || parsed.items.reduce((sum, item) => sum + item.price, 0)
  }
  
  // Store the bill
  localStorage.setItem(`bill-${billId}`, JSON.stringify(billData))
  
  // Update local bills list
  const existingBills = loadBillsFromLocalStorage()
  const updatedBills = [billData, ...existingBills]
  localStorage.setItem('local-bills', JSON.stringify(updatedBills))
  
  console.info(`[bill_create] Local bill created with ID: ${billId}`)
  
  return billId
}