import type { SupabaseClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import type { ParseResult, Receipt, OcrParsedReceipt } from '@/types/domain'
import { apiFetch } from './apiClient'
import { logServer } from './errorLogger'
import { ReceiptCreateSchema, type ReceiptCreatePayload, type ReceiptItemPayload } from '@/lib/schemas'
import { toMoney } from './types'
import { trackReceiptAccess } from './receiptHistory'

export interface ReceiptListItem {
  id: string
  token: string
  editor_token?: string
  title: string
  date: string // ISO
  place?: string
  people_count: number
  total_amount: number // cents or dollars — use Number() at render if needed
}

export type ReceiptSummary = ReceiptListItem

/**
 * Load receipts from localStorage fallback
 */
function loadReceiptsFromLocalStorage(): ReceiptSummary[] {
  try {
    const localReceiptsJson = localStorage.getItem('local-receipts')
    const localReceipts = JSON.parse(localReceiptsJson || '[]')
    
    return localReceipts.map((receipt: Record<string, unknown>) => ({
      id: receipt.id,
      token: receipt.token || receipt.editor_token,
      title: receipt.title,
      place: receipt.place || receipt.location,
      date: receipt.date,
      created_at: receipt.created_at,
      item_count: receipt.item_count || 0,
      people_count: receipt.people_count || 0,
      total_amount: receipt.total_amount || receipt.total || 0
    }))
  } catch (error) {
    console.error('Error loading receipts from localStorage:', error)
    return []
  }
}

/**
 * Fetch a single receipt by token with full data (receipt, items, people, shares)
 */
export async function fetchReceiptByToken(token: string): Promise<{ receipt: Receipt; items: unknown[]; people?: unknown[]; shares?: unknown[] } | null> {
  try {
    // Try API first
    const response = await apiFetch<{ receipt: Receipt; items: unknown[]; people?: unknown[]; shares?: unknown[] }>(`/api/receipts/${token}`)

    // Track receipt access for history
    if (response?.receipt) {
      trackReceiptAccess({
        token: response.receipt.editor_token || token,
        title: response.receipt.title || 'Untitled Receipt',
        place: response.receipt.place,
        date: response.receipt.date,
        totalAmount: response.receipt.subtotal ? Number(response.receipt.subtotal) : undefined
      })
    }

    return response
  } catch (error) {
    console.warn('[Tabby] receipt API error, trying localStorage fallback:', error)

    // Fallback to localStorage
    const localReceiptData = loadFullReceiptFromLocalStorage(token)
    if (localReceiptData) {
      console.log('[Tabby] Found receipt in localStorage:', token)

      // Transform to expected format
      return {
        receipt: {
          id: localReceiptData.id,
          editor_token: localReceiptData.token,
          viewer_token: localReceiptData.token,
          title: localReceiptData.title,
          place: localReceiptData.place,
          date: localReceiptData.date,
          created_at: localReceiptData.created_at,
          subtotal: localReceiptData.subtotal,
          sales_tax: localReceiptData.sales_tax,
          tip: localReceiptData.tip
        } as Receipt,
        items: localReceiptData.items || [],
        people: localReceiptData.people || [],
        shares: localReceiptData.shares || []
      }
    }

    console.error('[Tabby] Receipt not found in API or localStorage:', token)
    return null
  }
}



/**
 * Load receipt from localStorage with proper type safety
 */
export function loadReceiptFromLocalStorage(token: string): ReceiptListItem | null {
  const raw = localStorage.getItem(`receipt:${token}`)
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    // Guard minimally to satisfy TS and runtime
    if (!obj || typeof obj !== 'object') return null
    const receipt = obj as Partial<ReceiptListItem>
    if (!receipt.id || !receipt.token || !receipt.title || !receipt.date) return null
    return {
      id: String(receipt.id),
      token: String(receipt.token),
      editor_token: receipt.editor_token ? String(receipt.editor_token) : undefined,
      title: String(receipt.title),
      date: String(receipt.date),
      place: receipt.place ? String(receipt.place) : undefined,
      people_count: Number(receipt.people_count ?? 0),
      total_amount: Number(receipt.total_amount ?? 0),
    }
  } catch {
    return null
  }
}

/**
 * Fetch receipts from server API with localStorage fallback
 * SECURITY: No longer uses legacy RPC calls
 */
export async function fetchReceipts(_client?: SupabaseClient): Promise<ReceiptSummary[]> {
  try {
    const response = await apiFetch<{ receipts: ReceiptSummary[] }>('/api/receipts/list')
    return response.receipts
  } catch (error) {
    console.warn('[Tabby] receipts API error, using local fallback:', error)
    return loadReceiptsFromLocalStorage()
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
}): ReceiptCreatePayload {
  const items: ReceiptItemPayload[] = (scan.items || []).map((i, idx) => ({
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
    const parsed = ReceiptCreateSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn("[ReceiptCreateSchema] validation failed:", parsed.error.issues);
    }
  }

  return payload;
}

/**
 * Save full receipt data to localStorage for offline access
 */
export function saveReceiptToLocalStorage(receiptData: {
  id: string;
  token: string;
  title: string;
  place?: string | null;
  date: string;
  items: any[];
  subtotal?: number | null;
  sales_tax?: number | null;
  tip?: number | null;
  total?: number | null;
  people?: any[];
  shares?: any[];
}) {
  try {
    localStorage.setItem(`receipt:${receiptData.token}`, JSON.stringify(receiptData))
    console.log('[receipt_storage] Saved receipt to localStorage:', receiptData.token)
  } catch (error) {
    console.error('[receipt_storage] Failed to save receipt to localStorage:', error)
  }
}

/**
 * Load full receipt data from localStorage
 */
export function loadFullReceiptFromLocalStorage(token: string): any | null {
  try {
    const raw = localStorage.getItem(`receipt:${token}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (error) {
    console.error('[receipt_storage] Failed to load receipt from localStorage:', error)
    return null
  }
}

/**
 * Create a receipt; surfaces Zod issue if validation fails
 */
export async function createReceipt(payload: ReceiptCreatePayload, userId?: string) {
  // Add user_id to payload if provided
  const payloadWithUser = userId ? { ...payload, user_id: userId } : payload;

  // Try API first, but don't block on it
  let apiResponse = null
  try {
    apiResponse = await apiFetch<{ receipt: { id: string; token?: string; [key: string]: any }; items: any[]; createdAt: string }>("/api/receipts/create", {
      method: "POST",
      body: payloadWithUser,
    });
  } catch (error) {
    console.warn('[receipt_create] API call failed, will use localStorage:', error)
  }

  // Extract receipt data from nested response or create local ID
  const receiptData = apiResponse?.receipt;
  const receiptId = receiptData?.id || `receipt_${Date.now()}`;
  const receiptToken = receiptData?.token || receiptId;

  // ALWAYS save to localStorage immediately (source of truth)
  const fullReceiptData = {
    id: receiptId,
    token: receiptToken,
    title: payload.place || 'New Receipt',
    place: payload.place,
    date: new Date().toISOString().split('T')[0],
    items: payload.items,
    subtotal: payload.total,
    sales_tax: payload.tax,
    tip: payload.tip,
    total: payload.total,
    people: payload.people || [],
    shares: [],
    created_at: new Date().toISOString()
  }

  saveReceiptToLocalStorage(fullReceiptData)

  // Track receipt creation for history (localStorage backup for ALL users)
  if (receiptId) {
    trackReceiptAccess({
      token: receiptToken,
      title: payload.place || 'New Receipt',
      place: payload.place,
      date: new Date().toISOString().split('T')[0],
      totalAmount: payload.total ? Number(payload.total) : undefined
    })
  }

  // Return normalized response for backward compatibility
  return {
    id: receiptId,
    token: receiptToken
  };
}

/**
 * Create a receipt from parsed receipt data
 */
export async function createReceiptFromParse(parsed: ParseResult, _storage_path?: string | null, _ocr_json?: OcrParsedReceipt | null): Promise<string> {
  console.info('[receipt_create] Creating receipt from parsed data via server API...')
  const startTime = Date.now()
  
  try {
    // Use the new schema-aligned createReceipt function
    const payload = buildCreatePayload(parsed)
    const result = await createReceipt(payload)
    
    const duration = Date.now() - startTime
    console.info(`[receipt_create] Receipt created successfully via server API in ${duration}ms - receipt ID: ${result.id}`)
    
    return result.id

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[receipt_create] Receipt creation failed in ${duration}ms:`, error)
    logServer('error', 'Receipt creation failed', { error, duration, context: 'createReceipt' })
    
    // Check if local fallback is allowed
    const allowLocalFallback = import.meta.env.VITE_ALLOW_LOCAL_FALLBACK === '1'
    
    if (allowLocalFallback) {
      console.info('[receipt_create] Falling back to local storage...')
      return createLocalReceipt(parsed)
    } else {
      // Re-throw the error for the UI to handle
      throw error
    }
  }
}

/**
 * Create a local receipt (fallback when Supabase is unavailable)
 */
function createLocalReceipt(parsed: ParseResult): string {
  const receiptId = `local-${nanoid()}`
  
  // Format date consistently
  let formattedDate: string | undefined
  if (parsed.date) {
    formattedDate = parsed.date.includes('T') 
      ? parsed.date.split('T')[0] 
      : parsed.date
  } else {
    formattedDate = new Date().toISOString().split('T')[0]
  }
  
  const receiptData = {
    id: receiptId,
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

  // Store the receipt
  localStorage.setItem(`receipt-${receiptId}`, JSON.stringify(receiptData))

  // Update local receipts list
  const existingReceipts = loadReceiptsFromLocalStorage()
  const updatedReceipts = [receiptData, ...existingReceipts]
  localStorage.setItem('local-receipts', JSON.stringify(updatedReceipts))

  // Track in receipt history
  trackReceiptAccess({
    token: receiptData.token,
    title: receiptData.title,
    place: receiptData.place,
    date: receiptData.date,
    totalAmount: receiptData.total_amount,
    isLocal: true
  })

  console.info(`[receipt_create] Local receipt created with ID: ${receiptId}`)

  return receiptId
}

/**
 * Delete by server token via RESTful path param; DO NOT send JSON body on DELETE
 */
export async function deleteReceiptByToken(token: string) {
  const res = await apiFetch<{ ok: boolean }>(`/api/receipts/${encodeURIComponent(token)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const msg = (res as any)?.data?.error || "Delete failed";
    throw new Error(msg);
  }
  return (res as any).data;
}

/**
 * Delete a receipt (server or local) - legacy function now uses deleteReceiptByToken
 */
export async function deleteReceipt(token: string): Promise<boolean> {
  try {
    // Use the new schema-aligned delete function
    await deleteReceiptByToken(token)
    return true

  } catch (error) {
    console.error('Error deleting receipt:', error)

    // If server fails and local fallback is allowed, handle locally
    const allowLocalFallback = import.meta.env.VITE_ALLOW_LOCAL_FALLBACK === '1'
    if (allowLocalFallback && token.startsWith('local-')) {
      // Remove from local storage
      const localReceipts = loadReceiptsFromLocalStorage()
      const updatedReceipts = localReceipts.filter((receipt: ReceiptListItem) => receipt.token !== token)
      localStorage.setItem('local-receipts', JSON.stringify(updatedReceipts))
      return true
    }

    return false
  }
}

/**
 * Update people for a receipt
 */
export async function updateReceiptPeople(token: string, people: Array<{ id?: string; name: string; avatar_url?: string | null; venmo_handle?: string | null }>): Promise<any> {
  try {
    console.log('[updateReceiptPeople] Updating people for receipt:', token, people)
    const response = await apiFetch<{ people: any[]; count: number }>(`/api/receipts/${token}/people`, {
      method: "POST",
      body: { people },
    })
    console.log('[updateReceiptPeople] Successfully updated people:', response)
    return response
  } catch (error) {
    console.error('[updateReceiptPeople] Failed to update people:', error)
    throw error
  }
}

/**
 * Update item assignments (shares) for a receipt
 */
export async function updateReceiptShares(token: string, shares: Array<{ item_id: string; person_id: string; weight?: number }>): Promise<any> {
  try {
    console.log('[updateReceiptShares] Updating shares for receipt:', token, shares)
    const response = await apiFetch<{ shares: any[]; count: number }>(`/api/receipts/${token}/shares`, {
      method: "POST",
      body: { shares: shares.map(s => ({ ...s, weight: s.weight || 1 })) },
    })
    console.log('[updateReceiptShares] Successfully updated shares:', response)
    return response
  } catch (error) {
    console.error('[updateReceiptShares] Failed to update shares:', error)
    throw error
  }
}