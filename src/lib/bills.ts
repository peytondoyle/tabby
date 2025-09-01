import type { SupabaseClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { supabase, isSupabaseAvailable } from './supabaseClient'
import type { ParseResult } from './receiptScanning'
import { apiFetch } from './apiClient'

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
 * Fetch a single bill by token with full data (bill, items, people, shares)
 */
export async function fetchBillByToken(token: string): Promise<any | null> {
  try {
    const response = await apiFetch(`/api/bills/${token}`)
    
    if (response.ok && response.data) {
      // Return the full response data including bill, items, people, shares
      return response.data
    } else {
      console.warn('[Tabby] bill API failed, using local fallback:', response.error)
      return loadBillFromLocalStorage(token)
    }
  } catch (error) {
    console.warn('[Tabby] bill API error, using local fallback:', error)
    return loadBillFromLocalStorage(token)
  }
}

/**
 * Load a single bill from localStorage fallback
 */
function loadBillFromLocalStorage(token: string): BillSummary | null {
  try {
    const localBills = loadBillsFromLocalStorage()
    const bill = localBills.find(b => b.token === token)
    
    // If it's a mock bill with full data, return it
    if (bill && (bill as any).items) {
      return bill
    }
    
    return bill || null
  } catch (error) {
    console.error('Error loading bill from localStorage:', error)
    return null
  }
}

/**
 * Fetch bills from server API with localStorage fallback
 * SECURITY: No longer uses legacy RPC calls
 */
export async function fetchBills(_client?: SupabaseClient): Promise<BillSummary[]> {
  try {
    const response = await apiFetch('/api/bills/list')
    
    if (response.ok && response.data?.bills) {
      return response.data.bills as BillSummary[]
    } else {
      console.warn('[Tabby] bills API failed, using local fallback:', response.error)
      return loadBillsFromLocalStorage()
    }
  } catch (error) {
    console.warn('[Tabby] bills API error, using local fallback:', error)
    return loadBillsFromLocalStorage()
  }
}

/**
 * Create a bill from parsed receipt data
 */
export async function createBillFromParse(parsed: ParseResult, storage_path?: string | null, ocr_json?: any | null): Promise<string> {
  console.info('[bill_create] Creating bill from parsed data via server API...')
  const startTime = Date.now()
  
  try {
    // Check if local fallback is allowed
    const allowLocalFallback = import.meta.env.VITE_ALLOW_LOCAL_FALLBACK === '1'
    
    // Call the new server endpoint
    const response = await apiFetch('/api/bills/create', {
      method: 'POST',
      body: JSON.stringify({
        parsed,
        storage_path,
        ocr_json
      })
    })

    if (!response.ok) {
      const duration = Date.now() - startTime
      const errorDetails = response.data || {}
      console.error(`[bill_create_error] code=${errorDetails.code || 'UNKNOWN'} message=${response.error}`)
      console.error(`[bill_create] Server API failed in ${duration}ms:`, response.error)
      
      if (allowLocalFallback) {
        console.info('[bill_create] Falling back to local storage...')
        return createLocalBill(parsed)
      } else {
        throw new Error(response.error || 'Failed to create bill on server')
      }
    }

    const { bill, items } = response.data
    const duration = Date.now() - startTime
    console.info(`[bill_create] Bill created successfully via server API in ${duration}ms - bill ID: ${bill.id}`)
    
    return bill.id

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[bill_create] Bill creation failed in ${duration}ms:`, error)
    
    // Check if local fallback is allowed
    const allowLocalFallback = import.meta.env.VITE_ALLOW_LOCAL_FALLBACK === '1'
    
    if (allowLocalFallback) {
      console.info('[bill_create] Falling back to local storage...')
      return createLocalBill(parsed)
    } else {
      // Re-throw the error for the UI to handle
      throw error
    }
  }
}

/**
 * Create a local bill (fallback when Supabase is unavailable)
 */
function createLocalBill(parsed: ParseResult): string {
  const billId = `local-${nanoid()}`
  
  // Format date consistently
  let formattedDate: string | undefined
  if (parsed.date) {
    formattedDate = parsed.date.includes('T') 
      ? parsed.date.split('T')[0] 
      : parsed.date
  } else {
    formattedDate = new Date().toISOString().split('T')[0]
  }
  
  const billData = {
    id: billId,
    token: `edit-${nanoid()}`,
    title: parsed.place || "Receipt Upload",
    place: parsed.place,
    date: formattedDate,
    subtotal: Math.round((Number(parsed.subtotal) || 0) * 100) / 100,
    sales_tax: Math.round((Number(parsed.tax) || 0) * 100) / 100,  // Use sales_tax for consistency
    tip: Math.round((Number(parsed.tip) || 0) * 100) / 100,
    total: Number(parsed.total) || parsed.items.reduce((sum, item) => sum + Number(item.price), 0),
    created_at: new Date().toISOString(),
    editor_token: `edit-${nanoid()}`,
    viewer_token: `view-${nanoid()}`,
    currency: 'USD',
    items: parsed.items.map(item => ({
      id: item.id,
      label: item.label,
      unit_price: Math.round(Number(item.price) * 100) / 100,
      qty: 1,
      emoji: item.emoji || '🍽️'
    })),
    item_count: parsed.items.length,
    people_count: 0,
    total_amount: Number(parsed.total) || parsed.items.reduce((sum, item) => sum + Number(item.price), 0)
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

/**
 * Delete a bill (server or local)
 */
export async function deleteBill(token: string): Promise<boolean> {
  try {
    // Try server API first
    const response = await apiFetch('/api/bills/delete', {
      method: 'DELETE',
      body: JSON.stringify({ token })
    })

    if (response.ok) {
      return true
    }

    // If server fails and local fallback is allowed, handle locally
    const allowLocalFallback = import.meta.env.VITE_ALLOW_LOCAL_FALLBACK === '1'
    if (allowLocalFallback && token.startsWith('local-')) {
      // Remove from local storage
      const localBills = loadBillsFromLocalStorage()
      const updatedBills = localBills.filter((bill: any) => bill.token !== token)
      localStorage.setItem('local-bills', JSON.stringify(updatedBills))
      return true
    }

    return false
  } catch (error) {
    console.error('Error deleting bill:', error)
    
    // Fallback to local storage if allowed
    const allowLocalFallback = import.meta.env.VITE_ALLOW_LOCAL_FALLBACK === '1'
    if (allowLocalFallback && token.startsWith('local-')) {
      const localBills = loadBillsFromLocalStorage()
      const updatedBills = localBills.filter((bill: any) => bill.token !== token)
      localStorage.setItem('local-bills', JSON.stringify(updatedBills))
      return true
    }
    
    return false
  }
}