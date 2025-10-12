// AI Receipt Scanning with OCR
import { nanoid } from 'nanoid'
import { isSupabaseAvailable as _isSupabaseAvailable } from './supabaseClient'
import { apiUpload } from './apiClient'
import { API_BASE } from './apiBase'
import { logServer } from './errorLogger'
import { normalizeFile } from './imageNormalizer'
import { createReceipt, buildCreatePayload } from './receipts'

// Note: Image normalization is now handled by Web Worker in imageNormalizer.ts
// Old functions removed - see imageNormalizer.ts for Web Worker implementation

// Convert HEIC/HEIF to JPEG using canvas (DEPRECATED - use Web Worker)
/* async function _convertHeicToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
            type: 'image/jpeg',
            lastModified: file.lastModified
          })
          resolve(newFile)
        } else {
          reject(new Error('Failed to convert HEIC to JPEG'))
        }
      }, 'image/jpeg', 0.9)
    }
    
    img.onerror = () => reject(new Error('Failed to load HEIC image'))
    img.src = URL.createObjectURL(file)
  })
} */

// Auto-rotate image based on EXIF orientation
/* async function _autoRotateImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Get EXIF orientation (simplified - in real implementation, you'd use a library like exif-js)
      const orientation: number = 1 // Default orientation
      
      let { width, height } = img
      
      // Apply rotation based on orientation
      switch (orientation) {
        case 3:
        case 4:
          canvas.width = width
          canvas.height = height
          ctx?.translate(width, height)
          ctx?.rotate(Math.PI)
          break
        case 5:
        case 6:
          canvas.width = height
          canvas.height = width
          ctx?.translate(height, 0)
          ctx?.rotate(Math.PI / 2)
          break
        case 7:
        case 8:
          canvas.width = height
          canvas.height = width
          ctx?.translate(0, width)
          ctx?.rotate(-Math.PI / 2)
          break
        default:
          canvas.width = width
          canvas.height = height
      }
      
      ctx?.drawImage(img, 0, 0)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], file.name, {
            type: file.type,
            lastModified: file.lastModified
          })
          resolve(newFile)
        } else {
          reject(new Error('Failed to rotate image'))
        }
      }, file.type, 0.9)
    }
    
    img.onerror = () => reject(new Error('Failed to load image for rotation'))
    img.src = URL.createObjectURL(file)
  })
} */

// Downscale image if longest edge > 2000px
/* async function _downscaleImage(file: File, maxSize: number = 2000): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      const { width, height } = img
      const longestEdge = Math.max(width, height)
      
      if (longestEdge <= maxSize) {
        // No downscaling needed
        resolve(file)
        return
      }
      
      const scale = maxSize / longestEdge
      const newWidth = Math.round(width * scale)
      const newHeight = Math.round(height * scale)
      
      canvas.width = newWidth
      canvas.height = newHeight
      ctx?.drawImage(img, 0, 0, newWidth, newHeight)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], file.name, {
            type: file.type,
            lastModified: file.lastModified
          })
          resolve(newFile)
        } else {
          reject(new Error('Failed to downscale image'))
        }
      }, file.type, 0.9)
    }
    
    img.onerror = () => reject(new Error('Failed to load image for downscaling'))
    img.src = URL.createObjectURL(file)
  })
} */

// Compress image to target size (max 4MB)
/* async function _compressImage(file: File, targetSizeBytes: number = 4 * 1024 * 1024): Promise<File> {
  if (file.size <= targetSizeBytes) {
    return file
  }
  
  let quality = 0.82
  let compressedFile = file
  
  // Try different quality levels until we get under the target size
  while (compressedFile.size > targetSizeBytes && quality > 0.1) {
    compressedFile = await new Promise<File>((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name, {
              type: file.type,
              lastModified: file.lastModified
            })
            resolve(newFile)
          } else {
            reject(new Error('Failed to compress image'))
          }
        }, file.type, quality)
      }
      
      img.onerror = () => reject(new Error('Failed to load image for compression'))
      img.src = URL.createObjectURL(file)
    })
    
    quality -= 0.1
  }
  
  return compressedFile
} */

// Note: normalizeFile is now imported from imageNormalizer.ts (Web Worker implementation)

// New normalized ParseResult type
export type ParseResult = {
  place?: string | null
  date?: string | null
  items: Array<{
    id: string
    label: string
    price: number
    emoji?: string | null
    quantity: number
    unit_price: number
  }>
  subtotal?: number | null
  tax?: number | null
  tip?: number | null
  discount?: number | null
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
  'wings': '🍗',
  'chicken wings': '🍗',

  // Drinks
  'coffee': '☕',
  'tea': '🍵',
  'soda': '🥤',
  'drink': '🥤',
  'lemonade': '🥤',
  'shake': '🥤',
  'milkshake': '🥤',
  'juice': '🧃',
  'beer': '🍺',
  'wine': '🍷',
  'cocktail': '🍹',
  'water': '💧',

  // Chinese food
  'rice': '🍚',
  'fried rice': '🍚',
  'tofu': '🥡',
  'mapo tofu': '🥡',
  'spring roll': '🥟',
  'dumpling': '🥟',
  'wonton': '🥟',
  'noodles': '🍜',
  'ramen': '🍜',
  'lo mein': '🍜',
  'chow mein': '🍜',
  'soup': '🍜',
  'cashew': '🥜',
  'broccoli': '🥦',
  'dim sum': '🥟',

  // Pizza & Italian
  'salad': '🥗',
  'pizza': '🍕',
  'pasta': '🍝',
  'spaghetti': '🍝',
  'lasagna': '🍝',

  // Mexican
  'taco': '🌮',
  'burrito': '🌯',
  'quesadilla': '🫓',
  'nachos': '🧀',
  'guacamole': '🥑',

  // Desserts
  'pie': '🥧',
  'cake': '🍰',
  'cheesecake': '🍰',
  'ice cream': '🍨',
  'cookie': '🍪',
  'donut': '🍩',
  'tiramisu': '🍰',

  // Breakfast
  'eggs': '🍳',
  'bacon': '🥓',
  'toast': '🍞',
  'pancake': '🥞',
  'waffle': '🧇',
  'omelette': '🍳',

  // Seafood
  'sushi': '🍣',
  'fish': '🐟',
  'shrimp': '🍤',
  'salmon': '🐟',

  // Other
  'steak': '🥩',
  'pork': '🥩',
  'lamb': '🥩',

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

// Configuration for service charge mapping
const SERVICE_CHARGE_CONFIG = {
  mapToTip: true, // Set to false to keep as line item
  keywords: ['service charge', 'service fee', 'gratuity', 'tip']
} as const

// Check if an item is a service charge
function isServiceCharge(label: string): boolean {
  const lowerLabel = label.toLowerCase().trim()
  return SERVICE_CHARGE_CONFIG.keywords.some(keyword => 
    lowerLabel.includes(keyword)
  )
}

// Check if an item is a discount/BOGO
function isDiscount(label: string): boolean {
  const lowerLabel = label.toLowerCase().trim()
  const discountKeywords = ['discount', 'bogo', 'buy one get one', 'promo', 'coupon', 'off', '% off']
  return discountKeywords.some(keyword => lowerLabel.includes(keyword))
}

// Check if two items are duplicates (same label and price)
function areDuplicates(item1: { label: string; price: number }, item2: { label: string; price: number }): boolean {
  const normalizeLabel = (label: string) => label.toLowerCase().trim().replace(/\s+/g, ' ')
  return normalizeLabel(item1.label) === normalizeLabel(item2.label) && 
         Math.abs(item1.price - item2.price) < 0.01 // Allow for small floating point differences
}

// Process and normalize items
function processItems(rawItems: Array<{ label?: string; price?: unknown; emoji?: string | null }>): Array<{
  id: string
  label: string
  price: number
  emoji?: string | null
  quantity: number
  unit_price: number
}> {
  console.log(`[process_items] Processing ${rawItems.length} raw items`)

  // Step 1: Normalize and filter items
  const normalizedItems = rawItems
    .map((item, _index) => {
      const label = String(item.label || '').trim()
      const price = normalizeNumber(item.price)

      // Use AI-generated emoji if available, otherwise fall back to static map
      const emoji = item.emoji || getEmojiForItem(label)

      return {
        id: generateId(),
        label,
        price,
        emoji,
        quantity: 1,
        unit_price: price
      }
    })
    .filter(item => {
      // Filter out empty labels and zero-price items (unless they're discounts)
      const isEmpty = !item.label || item.label.length === 0
      const isZeroPrice = Math.abs(item.price) < 0.01
      const isDiscountItem = isDiscount(item.label)
      
      if (isEmpty) {
        console.log(`[process_items] Filtered out empty item: ${JSON.stringify(item)}`)
        return false
      }
      
      if (isZeroPrice && !isDiscountItem) {
        console.log(`[process_items] Filtered out zero-price item: ${item.label}`)
        return false
      }
      
      return true
    })
  
  console.log(`[process_items] After filtering: ${normalizedItems.length} items`)
  
  // Step 2: Coalesce duplicates
  const coalescedItems: Array<{
    id: string
    label: string
    price: number
    emoji?: string | null
    quantity: number
    unit_price: number
  }> = []
  
  for (const item of normalizedItems) {
    // Check if this item is a service charge that should be mapped to tip
    if (isServiceCharge(item.label) && SERVICE_CHARGE_CONFIG.mapToTip) {
      console.log(`[process_items] Service charge mapped to tip: ${item.label} - $${item.price}`)
      // We'll handle this in the main processing logic
      continue
    }
    
    // Check if this item is a discount (keep as negative line item)
    if (isDiscount(item.label) && item.price > 0) {
      // Make discount negative
      item.price = -Math.abs(item.price)
      item.unit_price = item.price
      console.log(`[process_items] Discount item: ${item.label} - $${item.price}`)
    }
    
    // Look for existing duplicate
    const existingIndex = coalescedItems.findIndex(existing => 
      areDuplicates(existing, item)
    )
    
    if (existingIndex >= 0) {
      // Merge with existing item
      const existing = coalescedItems[existingIndex]
      existing.quantity += item.quantity
      existing.price += item.price
      console.log(`[process_items] Coalesced duplicate: ${item.label} (qty: ${existing.quantity}, total: $${existing.price})`)
    } else {
      // Add as new item
      coalescedItems.push(item)
    }
  }
  
  console.log(`[process_items] After coalescing: ${coalescedItems.length} items`)
  
  return coalescedItems
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
      { id: generateId(), label: "Margherita Pizza", price: 18.00, emoji: "🍕", quantity: 1, unit_price: 18.00 },
      { id: generateId(), label: "Caesar Salad", price: 12.00, emoji: "🥗", quantity: 1, unit_price: 12.00 },
      { id: generateId(), label: "Craft Beer", price: 6.00, emoji: "🥤", quantity: 1, unit_price: 6.00 }
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
      console.log(`[scan_start] Health check attempt ${attempt}/${tries}...`)
      
      // Make direct fetch request instead of using apiFetch
      const url = `${API_BASE}/api/scan-receipt?health=1`
      const response = await fetch(url, { 
        method: 'GET', 
        cache: 'no-store',
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[scan_start] Health check response:`, data)
        
        if (data && typeof data === 'object' && 'ok' in data && data.ok) {
          const uptimeMs = data.uptimeMs || 0
          console.info(`[scan_ok] API healthy after ${attempt} attempts (uptime: ${uptimeMs}ms)`)
          return true
        }
      }
      
      console.warn(`[scan_api_error] Health check attempt ${attempt}: status ${response.status}`)
    } catch (error) {
      console.error(`[scan_exception] Health check attempt ${attempt} failed:`, error)
    }
    
    // Wait before next attempt
    if (attempt < tries) {
      console.log(`[scan_start] Waiting ${delayMs}ms before next attempt...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  console.warn(`[scan_api_error] API not healthy after ${tries} attempts`)
  return false
}

// New normalized parseReceipt function with file normalization
export async function parseReceipt(
  file: File, 
  onProgress?: (step: string) => void,
  signal?: AbortSignal
): Promise<ParseResult> {
  const { performanceMonitor } = await import('./performanceMonitor')
  
  performanceMonitor.start()
  const startTime = Date.now()
  const fileSize = file.size
  const fileType = file.type
  const fileName = file.name
  
  console.info(`[scan_start] Starting receipt parse - file: ${fileName} (${fileSize} bytes, ${fileType})`)

  // Track cache key for saving later
  let cacheKey: string | null = null

  try {
    // Step 1: Select file
    onProgress?.('Selecting…')
    console.info('[scan_step] File selected for processing...')

    // Step 1.5: Check cache (only if explicitly enabled)
    const useScanCache = localStorage.getItem('use-scan-cache') !== '0'

    if (useScanCache) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        cacheKey = `scan-cache-${hashHex}`

        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          console.info(`[scan_cache] Cache hit for ${hashHex.substring(0, 8)}...`)
          onProgress?.('Loaded from cache!')
          return JSON.parse(cached)
        }
        console.info(`[scan_cache] Cache miss for ${hashHex.substring(0, 8)}...`)
      } catch (cacheError) {
        console.warn('[scan_cache] Cache check failed:', cacheError)
        // Continue with normal processing
      }
    } else {
      console.info('[scan_cache] Scan cache disabled by user')
    }

    // Step 2: Normalize file
    onProgress?.('Normalizing…')
    console.info('[scan_step] Normalizing file in Web Worker...')

    performanceMonitor.startImageProcessing()
    const normalizedFile = await normalizeFile(file)
    performanceMonitor.endImageProcessing(normalizedFile.originalSize, normalizedFile.normalizedSize)

    console.info(`[scan_step] File normalized - original: ${normalizedFile.originalSize} bytes, normalized: ${normalizedFile.normalizedSize} bytes`)
    
    // Step 4: Upload and analyze
    onProgress?.('Analyzing…')
    const formData = new FormData()
    formData.append('file', normalizedFile.file)
    
    console.info('[scan_start] Sending POST request to API endpoint...')

    // Call the API endpoint using apiUpload with AbortSignal
    performanceMonitor.startApiCall()
    const response = await apiUpload('/api/scan-receipt', formData, { signal })
    performanceMonitor.endApiCall()

    // Step 5: Map results
    onProgress?.('Mapping…')
    const data = response
    const duration = Date.now() - startTime
    
    console.info(`[scan_ok] API response received in ${duration}ms - parsing data...`)
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from receipt scanning API')
    }
    
    // Normalize the response data
    const responseData = data as { items?: unknown[]; place?: string; date?: string; subtotal?: unknown; tax?: unknown; tip?: unknown; discount?: unknown; total?: unknown; rawText?: string }
    const rawItems = Array.isArray(responseData.items) ? responseData.items : []

    // Validate that we have valid items
    if (rawItems.length === 0) {
      throw new Error('No items found in receipt. Please try a clearer photo or add items manually.')
    }

    // Process items with filtering, coalescing, and special handling
    const processedItems = processItems(rawItems.map(item => item as { label?: string; price?: unknown; emoji?: string | null }))
    
    // Calculate service charges that were mapped to tip
    let serviceChargeTotal = 0
    const itemsWithServiceCharges = rawItems.map(item => item as { label?: string; price?: unknown; emoji?: string | null })
    for (const item of itemsWithServiceCharges) {
      const label = String(item.label || '').trim()
      const price = normalizeNumber(item.price)
      if (isServiceCharge(label) && SERVICE_CHARGE_CONFIG.mapToTip) {
        serviceChargeTotal += price
      }
    }
    
    // Calculate totals
    // const _itemTotal = processedItems.reduce((sum, item) => sum + item.price, 0)
    const originalSubtotal = normalizeNumber(responseData.subtotal)
    const originalTax = normalizeNumber(responseData.tax)
    const originalTip = normalizeNumber(responseData.tip)
    const originalDiscount = normalizeNumber(responseData.discount)
    const originalTotal = normalizeNumber(responseData.total)

    // Adjust tip to include service charges
    const adjustedTip = originalTip + serviceChargeTotal

    const result: ParseResult = {
      place: responseData.place || null,
      date: responseData.date || null,
      items: processedItems,
      subtotal: originalSubtotal,
      tax: originalTax,
      tip: adjustedTip,
      discount: originalDiscount,
      total: originalTotal,
      rawText: responseData.rawText || null
    }
    
    // Log service charge mapping if any
    if (serviceChargeTotal > 0) {
      console.log(`[scan_ok] Mapped $${serviceChargeTotal} in service charges to tip bucket`)
    }

    const totalDuration = Date.now() - startTime
    console.info(`[scan_ok] Receipt parsed successfully in ${totalDuration}ms - items: ${result.items.length}, place: ${!!result.place}, total: $${result.total || 0}`)

    // Save to cache for instant future loads
    if (cacheKey) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result))
        console.info(`[scan_cache] Cached result for future use (${cacheKey.substring(11, 19)}...)`)
      } catch (cacheError) {
        console.warn('[scan_cache] Failed to cache result:', cacheError)
      }
    }

    performanceMonitor.end(true)
    return result

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[scan_exception] Receipt parsing failed after ${duration}ms:`, error)
    logServer('error', 'Receipt parsing failed', { error, duration, context: 'parseReceipt' })
    
    performanceMonitor.end(false)
    
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
      quantity: item.quantity,
      unit_price: item.unit_price
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
export async function createReceiptFromReceipt(receiptData: ReceiptScanResult, _editorToken?: string, userId?: string): Promise<string> {
  console.info('[scan_start] Creating bill from receipt data via server API...', userId ? `for user ${userId}` : '(no user)')

  try {
    // Convert ReceiptScanResult to ParseResult format
    const parseResult: ParseResult = {
      place: receiptData.restaurant_name,  // Use restaurant_name, not location
      date: receiptData.date,
      items: receiptData.items.map(item => ({
        id: `item-${nanoid()}`,
        label: item.label,
        price: item.price,
        emoji: item.emoji,
        quantity: item.quantity,
        unit_price: item.unit_price
      })),
      subtotal: receiptData.subtotal,
      tax: receiptData.tax,
      tip: receiptData.tip,
      total: receiptData.total
    }

    // Use the new schema-aligned createReceipt function with userId
    const payload = buildCreatePayload(parseResult)
    const result = await createReceipt(payload, userId)

    console.info(`[scan_ok] Bill created successfully via server API - bill ID: ${result.id}, token: ${result.token}, items: ${result.items?.length || 0}`)

    // Store the items with Supabase UUIDs in sessionStorage for the frontend to use
    if (result.items && result.items.length > 0) {
      sessionStorage.setItem(`receipt-items-${result.token}`, JSON.stringify(result.items))
      console.info(`[scan_ok] Stored ${result.items.length} items with Supabase UUIDs for token: ${result.token}`)
    }

    // Return the token (used for fetching the bill later)
    return result.token

  } catch (error) {
    console.error('[scan_exception] Failed to create bill via server API:', error)
    logServer('error', 'Failed to create bill via server API', { error, context: 'createReceiptFromReceipt' })
    
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

// Utility to clear all scan caches (for fixing bad cached receipts)
export function clearScanCache() {
  try {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(key => key.startsWith('scan-cache-'))
    cacheKeys.forEach(key => localStorage.removeItem(key))
    console.info(`[scan_cache] Cleared ${cacheKeys.length} cached scans`)
    return cacheKeys.length
  } catch (error) {
    console.error('[scan_cache] Failed to clear cache:', error)
    return 0
  }
}

// Utility to disable/enable scan cache
export function setScanCacheEnabled(enabled: boolean) {
  localStorage.setItem('use-scan-cache', enabled ? '1' : '0')
  console.info(`[scan_cache] Scan cache ${enabled ? 'enabled' : 'disabled'}`)
}