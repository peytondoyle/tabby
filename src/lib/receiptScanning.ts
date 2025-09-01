// AI Receipt Scanning with OCR
import { nanoid } from 'nanoid'
import { isSupabaseAvailable as _isSupabaseAvailable } from './supabaseClient'
import { apiFetch, apiUpload } from './apiClient'

// New normalized ParseResult type
export type ParseResult = {
  place?: string | null
  date?: string | null
  items: Array<{
    id: string
    label: string
    price: number
    emoji?: string | null
  }>
  subtotal?: number | null
  tax?: number | null
  tip?: number | null
  total?: number | null
  rawText?: string | null
}

// Legacy types for backwards compatibility
export interface ReceiptItem {
  emoji: string
  label: string
  price: number
  quantity: number
  unit_price: number
}

export interface ReceiptScanResult {
  restaurant_name: string
  location: string
  date: string
  items: ReceiptItem[]
  subtotal: number
  tax: number
  tip?: number
  total: number
}

// Common food emojis for matching
const FOOD_EMOJIS: { [key: string]: string } = {
  // Fast food
  'burger': '🍔',
  'hamburger': '🍔',
  'cheeseburger': '🍔',
  'sandwich': '🥪',
  'chicken sandwich': '🥪',
  'fries': '🍟',
  'waffle fries': '🍟',
  'french fries': '🍟',
  'nuggets': '🍗',
  'chicken nuggets': '🍗',
  
  // Drinks
  'coffee': '☕',
  'tea': '🍵',
  'soda': '🥤',
  'drink': '🥤',
  'lemonade': '🥤',
  'shake': '🥤',
  'milkshake': '🥤',
  
  // Other foods
  'salad': '🥗',
  'pizza': '🍕',
  'pie': '🥧',
  'cake': '🍰',
  'cheesecake': '🍰',
  'eggs': '🍳',
  'bacon': '🥓',
  'toast': '🍞',
  
  // Default
  'meal': '🍽️',
  'food': '🍽️'
}

function getEmojiForItem(itemName: string): string {
  const name = itemName.toLowerCase()
  
  // Try exact matches first
  for (const [key, emoji] of Object.entries(FOOD_EMOJIS)) {
    if (name.includes(key)) {
      return emoji
    }
  }
  
  // Default emoji
  return '🍽️'
}

// Generate unique ID
export function generateId(): string {
  return `item-${nanoid()}`
}

// Normalize number values, convert NaN to 0
export function normalizeNumber(value: unknown): number {
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

// Deterministic dev fallback for development
function getDEVFallback(): ParseResult {
  return {
    place: "Demo Restaurant",
    date: new Date().toISOString().split('T')[0],
    items: [
      { id: generateId(), label: "Margherita Pizza", price: 18.00, emoji: "🍕" },
      { id: generateId(), label: "Caesar Salad", price: 12.00, emoji: "🥗" },
      { id: generateId(), label: "Craft Beer", price: 6.00, emoji: "🥤" }
    ],
    subtotal: 36.00,
    tax: 2.88,
    tip: 7.20,
    total: 46.08,
    rawText: "Mock receipt text for development"
  }
}

// Ensure API is healthy before making requests
export async function ensureApiHealthy({ tries = 3, delayMs = 1000 }: { tries?: number; delayMs?: number } = {}): Promise<boolean> {
  console.info('[scan_start] Health check starting, tries:', tries)
  
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const response = await apiFetch('/api/scan-receipt?health=1')
      
      if (response.ok && response.data && typeof response.data === 'object' && 'ok' in response.data && response.data.ok) {
        const uptimeMs = (response.data as { uptimeMs?: number }).uptimeMs
        console.info(`[scan_ok] API healthy after ${attempt} attempts (uptime: ${uptimeMs || 0}ms)`)
        return true
      }
      
      console.warn(`[scan_api_error] Health check attempt ${attempt}: ${response.status}`)
    } catch (error) {
      // Expected during startup or when API is unavailable
      if (attempt % 5 === 0) {
        console.info(`[scan_start] Health check attempt ${attempt}/${tries}...`)
      }
      if (attempt === tries) {
        console.error(`[scan_exception] Health check failed after ${tries} attempts:`, error)
      }
    }
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  
  console.warn(`[scan_api_error] API not healthy after ${tries} attempts`)
  return false
}

// New normalized parseReceipt function
export async function parseReceipt(file: File): Promise<ParseResult> {
  const startTime = Date.now()
  const fileSize = file.size
  const fileType = file.type
  const fileName = file.name
  
  console.info(`[scan_start] Starting receipt parse - file: ${fileName} (${fileSize} bytes, ${fileType})`)
  
  try {
    // Ensure API is healthy before making request (quick check)
    const isHealthy = await ensureApiHealthy({ tries: 2, delayMs: 500 })
    
    if (!isHealthy) {
      const duration = Date.now() - startTime
      console.warn(`[scan_api_error] API health check failed after ${duration}ms`)
      
      // Don't use dev fallback if we're in production-like mode
      const allowDevFallback = import.meta.env.VITE_ALLOW_DEV_FALLBACK !== '0'
      
      if (!allowDevFallback) {
        throw new Error('Receipt scanning service is unavailable. Please try again later.')
      }
      
      const fallbackResult = getDEVFallback()
      console.info(`[scan_ok] Using dev fallback due to API health check failure - ${fallbackResult.items.length} items`)
      return fallbackResult
    }
    
    // Create FormData for multipart upload
    const formData = new FormData()
    formData.append('file', file)
    
    console.info('[scan_start] Sending POST request to API endpoint...')

    // Call the API endpoint using apiUpload
    const response = await apiUpload('/api/scan-receipt', formData)

    if (!response.ok) {
      const duration = Date.now() - startTime
      console.warn(`[scan_api_error] ${response.status} ${response.error} after ${duration}ms`)
      
      // Check for OCR not configured error
      const errorData = response.data || {}
      if (errorData && typeof errorData === 'object' && 'code' in errorData && errorData.code === 'OCR_NOT_CONFIGURED') {
        throw new Error('Receipt scanning is not available. OCR service is not configured.')
      }
      
      // Don't use dev fallback if we're in production-like mode
      const allowDevFallback = import.meta.env.VITE_ALLOW_DEV_FALLBACK !== '0'
      
      if (!allowDevFallback) {
        throw new Error(response.error || 'Failed to scan receipt. Please try again.')
      }
      
      // Return fallback for any API error
      const fallbackResult = getDEVFallback()
      console.info(`[scan_ok] Using dev fallback due to API error - ${fallbackResult.items.length} items`)
      return fallbackResult
    }

    const data = response.data
    const duration = Date.now() - startTime
    
    console.info(`[scan_ok] API response received in ${duration}ms - parsing data...`)
    
    // Normalize the response data
    const responseData = data as { items?: unknown[]; place?: string; date?: string; subtotal?: unknown; tax?: unknown; tip?: unknown; total?: unknown; rawText?: string }
    const items = Array.isArray(responseData.items) ? responseData.items : []
    const normalizedItems = items.map((item: unknown, index: number) => {
      const itemObj = item as { label?: string; price?: unknown }
      const normalized = {
        id: generateId(),
        label: String(itemObj.label || ''),
        price: normalizeNumber(itemObj.price),
        emoji: getEmojiForItem(itemObj.label || '')
      }
      console.info(`[scan_ok] Normalized item ${index + 1}: ${normalized.label} - $${normalized.price}`)
      return normalized
    })

    // Ensure at least one item exists
    const finalItems = normalizedItems.length > 0 
      ? normalizedItems 
      : [{ id: generateId(), label: '', price: 0, emoji: '🍽️' }]

    if (normalizedItems.length === 0) {
      console.warn('[scan_api_error] No items found in response, added empty fallback item')
    }

    const result: ParseResult = {
      place: responseData.place || null,
      date: responseData.date || null,
      items: finalItems,
      subtotal: normalizeNumber(responseData.subtotal),
      tax: normalizeNumber(responseData.tax),
      tip: normalizeNumber(responseData.tip),
      total: normalizeNumber(responseData.total),
      rawText: responseData.rawText || null
    }

    const totalDuration = Date.now() - startTime
    console.info(`[scan_ok] Receipt parsed successfully in ${totalDuration}ms - items: ${result.items.length}, place: ${!!result.place}, total: $${result.total || 0}`)

    return result

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[scan_exception] Receipt parsing failed after ${duration}ms:`, error)
    
    // Don't use dev fallback if we're in production-like mode
    const allowDevFallback = import.meta.env.VITE_ALLOW_DEV_FALLBACK !== '0'
    
    if (!allowDevFallback) {
      // Re-throw the error for proper error handling
      throw error
    }
    
    // Return deterministic fallback on network/parsing error
    const fallbackResult = getDEVFallback()
    console.info(`[scan_ok] Using dev fallback due to network error - ${fallbackResult.items.length} items`)
    return fallbackResult
  }
}

// Legacy scanReceipt function - kept for backwards compatibility
export async function scanReceipt(file: File): Promise<ReceiptScanResult> {
  console.info('[scan_start] Legacy scanReceipt called, delegating to parseReceipt...')
  const parseResult = await parseReceipt(file)
  
  // Convert ParseResult to legacy ReceiptScanResult format
  const legacyResult = {
    restaurant_name: parseResult.place || "Receipt Upload",
    location: parseResult.place || "Unknown Location", 
    date: parseResult.date || new Date().toISOString().split('T')[0],
    items: parseResult.items.map(item => ({
      emoji: item.emoji || '🍽️',
      label: item.label,
      price: item.price,
      quantity: 1,
      unit_price: item.price
    })),
    subtotal: parseResult.subtotal || 0,
    tax: parseResult.tax || 0,
    tip: parseResult.tip || 0,
    total: parseResult.total || parseResult.items.reduce((sum, item) => sum + item.price, 0)
  }
  
  console.info(`[scan_ok] Legacy format conversion completed - ${legacyResult.items.length} items`)
  return legacyResult
}

// Legacy bill creation function - now routes through server API
export async function createBillFromReceipt(receiptData: ReceiptScanResult, _editorToken?: string): Promise<string> {
  console.info('[scan_start] Creating bill from receipt data via server API...')
  
  try {
    // Convert ReceiptScanResult to ParseResult format
    const parseResult: ParseResult = {
      place: receiptData.restaurant_name,  // Use restaurant_name, not location
      date: receiptData.date,
      items: receiptData.items.map(item => ({
        id: `item-${nanoid()}`,
        label: item.label,
        price: item.price,
        emoji: item.emoji
      })),
      subtotal: receiptData.subtotal,
      tax: receiptData.tax,
      tip: receiptData.tip,
      total: receiptData.total
    }

    // Use the server API to create the bill
    const response = await apiFetch('/api/bills/create', {
      method: 'POST',
      body: JSON.stringify({ parsed: parseResult })
    })

    if (!response.ok) {
      console.error('[scan_api_error] Server API failed:', response.error)
      throw new Error(response.error || 'Failed to create bill via server API')
    }

    const { bill } = response.data as { bill: { id: string } }
    console.info(`[scan_ok] Bill created successfully via server API - bill ID: ${bill.id}`)
    
    // Return the bill ID (not editor token since that's server-side only now)
    return bill.id

  } catch (error) {
    console.error('[scan_exception] Failed to create bill via server API:', error)
    
    // Check if local fallback is allowed
    const allowLocalFallback = import.meta.env.VITE_ALLOW_LOCAL_FALLBACK === '1'
    
    if (!allowLocalFallback) {
      // Re-throw the error for the UI to handle
      throw error
    }

    // Fallback to localStorage
    const billToken = `scanned-${Date.now()}`
    const billData = {
      token: billToken,
      title: receiptData.restaurant_name,
      place: receiptData.location,
      date: receiptData.date,
      items: receiptData.items,
      subtotal: receiptData.subtotal,
      tax: receiptData.tax,
      tip: receiptData.tip || 0,
      total: receiptData.total,
      createdAt: new Date().toISOString()
    }
    
    localStorage.setItem(`bill-${billToken}`, JSON.stringify(billData))
    console.info(`[scan_ok] Fallback local bill created with token: ${billToken}`)
    return billToken
  }
}

// Utility function to get current date
export function getCurrentDate() {
  const now = new Date()
  return {
    iso: now.toISOString().split('T')[0],
    formatted: now.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }
}