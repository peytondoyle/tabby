// AI Receipt Scanning with OCR
import { nanoid } from 'nanoid'
import { supabase, isSupabaseAvailable as _isSupabaseAvailable } from './supabaseClient'

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

// New normalized parseReceipt function
export async function parseReceipt(file: File): Promise<ParseResult> {
  const startTime = Date.now()
  console.info('[scan_start] Starting receipt parse')
  
  try {
    // Create FormData for multipart upload
    const formData = new FormData()
    formData.append('file', file)

    // Call the API endpoint
    const response = await fetch('/api/scan-receipt', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const duration = Date.now() - startTime
    
    // Normalize the response data
    const items = Array.isArray(data.items) ? data.items : []
    const normalizedItems = items.map((item: unknown) => {
      const itemObj = item as { label?: string; price?: unknown }
      return {
        id: generateId(),
        label: String(itemObj.label || ''),
        price: normalizeNumber(itemObj.price),
        emoji: getEmojiForItem(itemObj.label || '')
      }
    })

    // Ensure at least one item exists
    const finalItems = normalizedItems.length > 0 
      ? normalizedItems 
      : [{ id: generateId(), label: '', price: 0, emoji: '🍽️' }]

    const result: ParseResult = {
      place: data.place || null,
      date: data.date || null,
      items: finalItems,
      subtotal: normalizeNumber(data.subtotal),
      tax: normalizeNumber(data.tax),
      tip: normalizeNumber(data.tip),
      total: normalizeNumber(data.total),
      rawText: data.rawText || null
    }

    console.info('[scan_success] Receipt parsed successfully', {
      duration,
      itemsCount: result.items.length,
      hasPlace: !!result.place
    })

    return result

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[scan_fail] Receipt parsing failed', { duration, error })
    
    // Always return at least one editable row on failure
    return {
      items: [{ id: generateId(), label: '', price: 0, emoji: '🍽️' }]
    }
  }
}

// Legacy scanReceipt function - kept for backwards compatibility
export async function scanReceipt(file: File): Promise<ReceiptScanResult> {
  const parseResult = await parseReceipt(file)
  
  // Convert ParseResult to legacy ReceiptScanResult format
  return {
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
}

// Legacy bill creation function - kept for backwards compatibility
export async function createBillFromReceipt(receiptData: ReceiptScanResult, _editorToken?: string): Promise<string> {
  const isSupabaseAvailable = _isSupabaseAvailable()
  
  if (!isSupabaseAvailable) {
    console.warn('Supabase not available - creating local bill')
    // Create a token for localStorage-based bill
    const billToken = `scanned-${Date.now()}`
    
    // Store in localStorage as fallback
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
    return billToken
  }

  try {
    // Create bill in Supabase
    const billData = {
      title: receiptData.restaurant_name,
      place: receiptData.location,
      date: receiptData.date,
      subtotal: receiptData.subtotal,
      tax: receiptData.tax,
      tip: receiptData.tip || 0,
      total: receiptData.total
    }

    const { data: bill, error: billError } = await supabase!
      .rpc('create_bill', billData)

    if (billError) {
      throw billError
    }

    const billToken = bill

    // Create items
    for (const item of receiptData.items) {
      const itemData = {
        bill_token: billToken,
        label: item.label,
        price: item.price,
        emoji: item.emoji
      }

      const { error: itemError } = await supabase!
        .rpc('create_item', itemData)

      if (itemError) {
        console.error('Failed to create item:', itemError)
        // Continue with other items even if one fails
      }
    }

    console.log('Bill created successfully:', billToken)
    return billToken

  } catch (error) {
    console.error('Failed to create bill in Supabase:', error)
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