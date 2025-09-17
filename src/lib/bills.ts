import type { SupabaseClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import type { ParseResult, Bill, OcrParsedReceipt } from '@/types/domain'
import { apiFetch } from './apiClient'
import { logServer } from './errorLogger'
import { BillCreateSchema, type BillCreatePayload, type BillItemPayload } from '@/lib/schemas'
import { toMoney } from './types'

export interface BillListItem {
  id: string
  token: string
  editor_token?: string
  title: string
  date: string // ISO
  place?: string
  people_count: number
  total_amount: number // cents or dollars — use Number() at render if needed
}

export type BillSummary = BillListItem

/**
 * Load bills from localStorage fallback
 */
function loadBillsFromLocalStorage(): BillSummary[] {
  try {
    const localBillsJson = localStorage.getItem('local-bills')
    const localBills = JSON.parse(localBillsJson || '[]')
    
    return localBills.map((bill: Record<string, unknown>) => ({
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
export async function fetchBillByToken(token: string): Promise<{ bill: Bill; items: unknown[]; people?: unknown[]; shares?: unknown[] } | null> {
  try {
    const response = await apiFetch<{ bill: Bill; items: unknown[]; people?: unknown[]; shares?: unknown[] }>(`/api/bills/${token}`)
    return response
  } catch (error) {
    console.warn('[Tabby] bill API error, using local fallback:', error)
    return null // Local fallback removed for now
  }
}



/**
 * Load bill from localStorage with proper type safety
 */
export function loadBillFromLocalStorage(token: string): BillListItem | null {
  const raw = localStorage.getItem(`bill:${token}`)
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    // Guard minimally to satisfy TS and runtime
    if (!obj || typeof obj !== 'object') return null
    const bill = obj as Partial<BillListItem>
    if (!bill.id || !bill.token || !bill.title || !bill.date) return null
    return {
      id: String(bill.id),
      token: String(bill.token),
      editor_token: bill.editor_token ? String(bill.editor_token) : undefined,
      title: String(bill.title),
      date: String(bill.date),
      place: bill.place ? String(bill.place) : undefined,
      people_count: Number(bill.people_count ?? 0),
      total_amount: Number(bill.total_amount ?? 0),
    }
  } catch {
    return null
  }
}

/**
 * Fetch bills from server API with localStorage fallback
 * SECURITY: No longer uses legacy RPC calls
 */
export async function fetchBills(_client?: SupabaseClient): Promise<BillSummary[]> {
  try {
    const response = await apiFetch<{ bills: BillSummary[] }>('/api/bills/list')
    return response.bills
  } catch (error) {
    console.warn('[Tabby] bills API error, using local fallback:', error)
    return loadBillsFromLocalStorage()
  }
}

/**
 * Build a schema-correct payload from your scan/parse result
 */
export function buildCreatePayload(scan: {
  place?: string | null;
  total?: number | string | null;
  items: Array<{ id?: string; label?: string; name?: string; title?: string; price?: number | string; cost?: number | string; icon?: string; emoji?: string | null }>;
  subtotal?: number | string | null;
  tax?: number | string | null;
  tip?: number | string | null;
}): BillCreatePayload {
  const items: BillItemPayload[] = (scan.items || []).map((i, idx) => ({
    id: String(i.id ?? `it_${idx}`),
    name: String(i.label ?? i.name ?? i.title ?? "Item"),
    price: toMoney(i.price ?? i.cost ?? 0),
    icon: i.icon ?? (i.emoji || undefined),
  }));
  const total = scan.total == null ? null : toMoney(scan.total);
  const tax = scan.tax == null ? 0 : toMoney(scan.tax);
  const tip = scan.tip == null ? 0 : toMoney(scan.tip);
  
  const payload = {
    place: scan.place ?? null,
    total,
    items,
    people: [],   // IMPORTANT: backend expects array (can be empty)
    tax,
    tip,
  };

  if (import.meta?.env?.MODE !== "production") {
    const parsed = BillCreateSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn("[BillCreateSchema] validation failed:", parsed.error.issues);
    }
  }

  return payload;
}

/**
 * Create a bill; surfaces Zod issue if validation fails
 */
export async function createBill(payload: BillCreatePayload) {
  const res = await apiFetch<{ id: string; token?: string }>("/api/bills/create", {
    method: "POST",
    body: payload,
  });
  return res;
}

/**
 * Create a bill from parsed receipt data
 */
export async function createBillFromParse(parsed: ParseResult, _storage_path?: string | null, _ocr_json?: OcrParsedReceipt | null): Promise<string> {
  console.info('[bill_create] Creating bill from parsed data via server API...')
  const startTime = Date.now()
  
  try {
    // Use the new schema-aligned createBill function
    const payload = buildCreatePayload(parsed)
    const result = await createBill(payload)
    
    const duration = Date.now() - startTime
    console.info(`[bill_create] Bill created successfully via server API in ${duration}ms - bill ID: ${result.id}`)
    
    return result.id

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[bill_create] Bill creation failed in ${duration}ms:`, error)
    logServer('error', 'Bill creation failed', { error, duration, context: 'createBill' })
    
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
      id: `item-${nanoid()}`,
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
 * Delete by server token via RESTful path param; DO NOT send JSON body on DELETE
 */
export async function deleteBillByToken(token: string) {
  const res = await apiFetch<{ ok: boolean }>(`/api/bills/${encodeURIComponent(token)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const msg = (res as any)?.data?.error || "Delete failed";
    throw new Error(msg);
  }
  return (res as any).data;
}

/**
 * Delete a bill (server or local) - legacy function now uses deleteBillByToken
 */
export async function deleteBill(token: string): Promise<boolean> {
  try {
    // Use the new schema-aligned delete function
    await deleteBillByToken(token)
    return true
    
  } catch (error) {
    console.error('Error deleting bill:', error)
    
    // If server fails and local fallback is allowed, handle locally
    const allowLocalFallback = import.meta.env.VITE_ALLOW_LOCAL_FALLBACK === '1'
    if (allowLocalFallback && token.startsWith('local-')) {
      // Remove from local storage
      const localBills = loadBillsFromLocalStorage()
      const updatedBills = localBills.filter((bill: BillListItem) => bill.token !== token)
      localStorage.setItem('local-bills', JSON.stringify(updatedBills))
      return true
    }
    
    return false
  }
}