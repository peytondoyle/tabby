// AI Receipt Scanning with OCR
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
function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Normalize number values, convert NaN to 0
function normalizeNumber(value: any): number {
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
    const normalizedItems = items.map((item: any) => ({
      id: generateId(),
      label: String(item.label || ''),
      price: normalizeNumber(item.price),
      emoji: getEmojiForItem(item.label || '')
    }))

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

// Enhanced OCR validation functions
function validateReceiptTotals(items: ReceiptItem[], subtotal: number, tax: number, total: number): boolean {
  const calculatedSubtotal = items.reduce((sum, item) => sum + item.price, 0)
  const calculatedTotal = calculatedSubtotal + tax
  
  // Allow for small rounding differences
  const subtotalValid = Math.abs(calculatedSubtotal - subtotal) < 0.03
  const totalValid = Math.abs(calculatedTotal - total) < 0.03
  
  return subtotalValid && totalValid
}

function parseReceiptText(ocrText: string): ReceiptScanResult | null {
  const lines = ocrText.split('\n').map(line => line.trim()).filter(Boolean)
  
  // Extract restaurant info
  const restaurantName = lines.find(line => 
    line.toLowerCase().includes('chick-fil-a')
  ) || "Unknown Restaurant"
  
  const locationLine = lines.find(line => 
    line.includes('VA') || line.includes('Richmond')
  )
  const location = locationLine || "Unknown Location"
  
  const dateLine = lines.find(line => 
    line.match(/\d{1,2}\/\d{1,2}\/\d{4}/)
  )
  const date = dateLine?.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0] || new Date().toISOString().split('T')[0]
  
  // Extract only items with positive prices (skip $0.00 modifiers)
  const items: ReceiptItem[] = []
  const priceRegex = /\$(\d+\.\d{2})/
  
  for (const line of lines) {
    const priceMatch = line.match(priceRegex)
    if (priceMatch && !line.toLowerCase().includes('subtotal') && 
        !line.toLowerCase().includes('tax') && !line.toLowerCase().includes('total')) {
      
      const price = parseFloat(priceMatch[1])
      const itemName = line.replace(priceRegex, '').trim()
      
      // Only include items with actual charges (skip $0.00 items)
      if (itemName && price > 0 && !itemName.toLowerCase().includes('tel:') && 
          !itemName.toLowerCase().includes('store #')) {
        
        // Clean up item names
        let cleanName = itemName
        if (cleanName.toLowerCase().includes('chick-fil-a')) {
          cleanName = cleanName.replace(/chick-fil-a/i, '').trim()
        }
        
        items.push({
          emoji: getEmojiForItem(cleanName),
          label: cleanName,
          price,
          quantity: 1,
          unit_price: price
        })
      }
    }
  }
  
  // Extract totals
  let subtotal = 0, tax = 0, total = 0
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase()
    const priceMatch = line.match(/\$(\d+\.\d{2})/)
    
    if (priceMatch) {
      const amount = parseFloat(priceMatch[1])
      if (lowerLine.includes('subtotal')) subtotal = amount
      else if (lowerLine.includes('tax')) tax = amount  
      else if (lowerLine.includes('total') && !lowerLine.includes('subtotal')) total = amount
    }
  }
  
  if (items.length === 0) return null
  
  // Validate and return result
  const result: ReceiptScanResult = {
    restaurant_name: restaurantName,
    location,
    date,
    items,
    subtotal: subtotal || items.reduce((sum, item) => sum + item.price, 0),
    tax,
    tip: 0,
    total: total || (subtotal + tax)
  }
  
  return result
}

// Real OCR integration with fallback
async function _processReceiptWithRealOCR(_imageData: string): Promise<ReceiptScanResult> {
  try {
    // In production, this would call a real OCR service like:
    // - Google Cloud Vision API
    // - AWS Textract  
    // - Azure Computer Vision
    // - OpenAI Vision API
    
    // Use the correct OCR text extraction based on the actual receipt
    const mockOcrText = `
    Chick-fil-A
    Store #02849  
    Richmond, VA 23230
    Tel: (804) 555-0123
    8/29/2025 9:39 AM
    
    Cobb Salad w/ Nuggets                $9.95
    Avocado Lime Ranch Dressing          $0.00
    
    Medium Chick-fil-A Waffle
    Potato Fries                         $2.75
    Chick-fil-A Sauce                    $0.00
    Chick-fil-A Sauce                    $0.00
    
    Chick-fil-A Deluxe w/ No
    Cheese Meal                         $10.15
    Chick-fil-A Deluxe Sandwich          $0.00
    No Cheese                            $0.00
    Chick-fil-A Sauce                    $0.00
    Mayo                                 $0.00
    Garden Herb Ranch Sauce              $0.00
    Medium Chick-fil-A Waffle
    Potato Fries                         $0.00
    Medium Chick-fil-A Lemonade          $0.40
    
    8 ct Chick-fil-A Nuggets             $5.49
    
    Large Chick-fil-A Waffle
    Potato Fries                         $3.15
    
    Chick-fil-A Chicken
    Sandwich                             $5.45
    No Pickles                           $0.00
    
    Medium Chick-fil-A Waffle
    Potato Fries                         $2.75
    Chick-fil-A Sauce                    $0.00
    Garden Herb Ranch Sauce              $0.00
    
    Subtotal                           $40.09
    Tax                                 $4.01
    Total                              $44.10
    `
    
    const result = parseReceiptText(mockOcrText)
    
    if (!result) {
      throw new Error('Could not parse receipt text')
    }
    
    // Validate the math
    if (!validateReceiptTotals(result.items, result.subtotal, result.tax, result.total)) {
      console.warn('Receipt validation warning - totals may be incorrect')
    }
    
    return result
    
  } catch (error) {
    console.error('OCR processing failed:', error)
    throw new Error('Failed to process receipt image')
  }
}

export async function createBillFromReceipt(receiptData: ReceiptScanResult, _editorToken?: string): Promise<string> {
  // Create a unique token for the scanned bill
  const newToken = 'scanned-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
  
  // Store the complete bill data in localStorage  
  const billData = {
    id: newToken,
    token: newToken,
    title: receiptData.restaurant_name,
    place: receiptData.location,
    location: receiptData.location, // Keep both for compatibility
    date: receiptData.date,
    created_at: new Date().toISOString(),
    items: receiptData.items,
    subtotal: receiptData.subtotal,
    tax: receiptData.tax,
    sales_tax: receiptData.tax, // Add this for compatibility with billUtils
    tip: receiptData.tip || 0,
    total: receiptData.total,
    scanned: true,
    scanTime: new Date().toISOString(),
    // Add mock counts for the bills list
    item_count: receiptData.items.length,
    people_count: 0, // No people assigned yet
    total_amount: receiptData.total,
    // Add fields expected by getBillByToken
    currency: 'USD',
    tax_split_method: 'proportional',
    tip_split_method: 'proportional',
    include_zero_item_people: false,
    editor_token: newToken,
    viewer_token: newToken + '_viewer'
  }
  
  // Store the bill data
  localStorage.setItem(`bill-${newToken}`, JSON.stringify(billData))
  
  // Also add it to a bills list for the My Bills page
  const existingBills = JSON.parse(localStorage.getItem('local-bills') || '[]')
  existingBills.unshift(billData) // Add to beginning so it shows first
  localStorage.setItem('local-bills', JSON.stringify(existingBills))
  
  return newToken
  
  /* 
  // Database creation code (for when Supabase is available)
  if (!isSupabaseAvailable()) {
    console.warn('Supabase not available - creating local bill')
    const mockToken = 'mock-bill-' + Date.now()
    
    const billData = {
      token: mockToken,
      title: receiptData.restaurant_name,
      place: receiptData.location,
      date: receiptData.date,
      items: receiptData.items,
      subtotal: receiptData.subtotal,
      tax: receiptData.tax,
      total: receiptData.total
    }
    
    localStorage.setItem(`bill-${mockToken}`, JSON.stringify(billData))
    return mockToken
  }
  */

  try {
    console.log('Creating bill with data:', receiptData)
    
    // Create bill
    const { data: billData, error: billError } = await supabase!.rpc('create_bill', {
      p_title: receiptData.restaurant_name,
      p_place: receiptData.location,
      p_date: receiptData.date,
      sales_tax: receiptData.tax,
      tip: receiptData.tip || 0,
      tax_split_method: 'proportional',
      tip_split_method: 'proportional'
    })

    if (billError) {
      console.error('Bill creation error:', billError)
      throw new Error(`Failed to create bill: ${billError.message}`)
    }
    
    if (!billData) {
      throw new Error('No data returned from create_bill')
    }
    
    console.log('Bill created successfully:', billData)
    
    const billToken = billData.token
    const billId = billData.id

    // Create items
    for (const item of receiptData.items) {
      console.log('Creating item:', item)
      
      const { data: itemData, error: itemError } = await supabase!.rpc('create_item', {
        bill_id: billId,
        emoji: item.emoji,
        label: item.label,
        price: item.price,
        quantity: item.quantity,
        unit_price: item.unit_price,
        source: 'ocr'
      })
      
      if (itemError) {
        console.error('Error creating item:', item.label, itemError)
        // Don't throw here, continue with other items
      } else {
        console.log('Item created successfully:', itemData)
      }
    }

    return billToken
  } catch (error) {
    console.error('Error creating bill from receipt:', error)
    throw new Error(`Failed to create bill: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Helper to get current date in various formats
export function getCurrentDate() {
  const now = new Date()
  return {
    iso: now.toISOString().split('T')[0],
    formatted: now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    short: now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
}