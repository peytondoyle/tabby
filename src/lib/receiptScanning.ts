// AI Receipt Scanning with OCR
import { nanoid } from 'nanoid'
import { isSupabaseAvailable as _isSupabaseAvailable } from './supabaseClient'
import { apiUpload } from './apiClient'
import { API_BASE } from './apiBase'
import { logServer } from './errorLogger'
import { normalizeFile } from './imageNormalizer'
import { createReceipt, buildCreatePayload } from './receipts'
import { getSmartEmoji } from './emojiUtils'

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
  service_fee?: number | null
  discount?: number | null
  total?: number | null
  rawText?: string | null
  // Enhanced analysis fields from OCR
  validation?: {
    itemsMatchSubtotal: boolean
    totalsMatch: boolean
    calculatedSubtotal: number
    calculatedTotal: number
    discrepancy?: number
    warnings: string[]
  }
  fieldConfidence?: {
    place: 'high' | 'medium' | 'low'
    date: 'high' | 'medium' | 'low'
    subtotal: 'high' | 'medium' | 'low'
    tax: 'high' | 'medium' | 'low'
    tip: 'high' | 'medium' | 'low'
    total: 'high' | 'medium' | 'low'
    items: 'high' | 'medium' | 'low'
  }
  handwrittenFields?: string[]
  suggestedCorrections?: Array<{
    field: string
    currentValue: number | string | null
    suggestedValue: number | string
    reason: string
  }>
  confidence?: number
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

// Generate unique ID
export function generateId(): string {
  return `item-${nanoid()}`
}

// Configuration for service charge/fee detection
const SERVICE_CHARGE_CONFIG = {
  keywords: ['service charge', 'service fee', 'delivery fee', 'processing fee', 'convenience fee']
} as const

// Configuration for tip detection
const TIP_CONFIG = {
  keywords: ['tip', 'gratuity', 'tips']
} as const

// Check if an item is a service charge/fee
function isServiceCharge(label: string): boolean {
  const lowerLabel = label.toLowerCase().trim()
  return SERVICE_CHARGE_CONFIG.keywords.some(keyword =>
    lowerLabel.includes(keyword)
  )
}

// Check if an item is a tip
function isTip(label: string): boolean {
  const lowerLabel = label.toLowerCase().trim()
  return TIP_CONFIG.keywords.some(keyword =>
    lowerLabel.includes(keyword)
  )
}

// Check if an item is a discount/BOGO
function isDiscount(label: string): boolean {
  const lowerLabel = label.toLowerCase().trim()
  const discountKeywords = ['discount', 'bogo', 'buy one get one', 'promo', 'coupon', 'off', '% off']
  return discountKeywords.some(keyword => lowerLabel.includes(keyword))
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

      // Use smart emoji matching
      const emoji = getSmartEmoji(label)

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
  
  // Step 2: Filter special items (fees, tips) and process discounts
  // NOTE: We no longer coalesce duplicates because server already expanded quantity items
  // (e.g., "2 Membership Charge" -> 2 separate items) and we want to keep them separate for splitting
  const processedItems: Array<{
    id: string
    label: string
    price: number
    emoji?: string | null
    quantity: number
    unit_price: number
  }> = []

  for (const item of normalizedItems) {
    // Skip service charges and tips - they'll be handled separately
    if (isServiceCharge(item.label) || isTip(item.label)) {
      console.log(`[process_items] Skipping fee/tip item: ${item.label} - $${item.price}`)
      continue
    }

    // Check if this item is a discount (keep as negative line item)
    if (isDiscount(item.label) && item.price > 0) {
      // Make discount negative
      item.price = -Math.abs(item.price)
      item.unit_price = item.price
      console.log(`[process_items] Discount item: ${item.label} - $${item.price}`)
    }

    // Add item as-is (no coalescing - keep expanded items separate for splitting)
    processedItems.push(item)
  }

  console.log(`[process_items] After processing: ${processedItems.length} items`)

  return processedItems
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
  let fileSize = file.size
  let fileType = file.type
  let fileName = file.name
  let processedFile = file

  console.info(`[scan_start] Starting receipt parse - file: ${fileName} (${fileSize} bytes, ${fileType})`)

  // Track cache key for saving later
  let cacheKey: string | null = null

  try {
    // Step 1: Select file
    onProgress?.('Selecting…')
    console.info('[scan_step] File selected for processing...')

    // Step 1.5: Convert PDF to image if needed
    if (fileType === 'application/pdf') {
      onProgress?.('Converting PDF…')
      console.info('[scan_step] Converting PDF to image...')

      const { convertPdfToImage } = await import('./pdfConverter')
      processedFile = await convertPdfToImage(file)

      fileSize = processedFile.size
      fileType = processedFile.type
      fileName = processedFile.name

      console.info(`[scan_step] PDF converted - new file: ${fileName} (${fileSize} bytes, ${fileType})`)
    }

    // Step 2: Check cache (only if explicitly enabled)
    const useScanCache = localStorage.getItem('use-scan-cache') !== '0'

    if (useScanCache) {
      try {
        const arrayBuffer = await processedFile.arrayBuffer()
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

    // Step 3: Normalize file
    onProgress?.('Normalizing…')
    console.info('[scan_step] Normalizing file in Web Worker...')

    performanceMonitor.startImageProcessing()
    const normalizedFile = await normalizeFile(processedFile)
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

    // Get service_fee from API response first (if available)
    const apiServiceFee = normalizeNumber((responseData as any).service_fee)

    // Only calculate from line items if API didn't provide service_fee
    let serviceFeeTotal = apiServiceFee
    let additionalTipTotal = 0

    // If API didn't provide service_fee, calculate from line items
    if (!apiServiceFee || apiServiceFee === 0) {
      const allItems = rawItems.map(item => item as { label?: string; price?: unknown; emoji?: string | null })
      for (const item of allItems) {
        const label = String(item.label || '').trim()
        const price = normalizeNumber(item.price)
        if (isServiceCharge(label)) {
          serviceFeeTotal += price
        } else if (isTip(label)) {
          additionalTipTotal += price
        }
      }
    }

    // Calculate totals - use API values when available, fallback to calculated values
    const originalSubtotal = normalizeNumber(responseData.subtotal)
    const originalTax = normalizeNumber(responseData.tax)
    const originalTip = normalizeNumber(responseData.tip) || additionalTipTotal
    const originalDiscount = normalizeNumber(responseData.discount)
    const originalServiceFee = apiServiceFee || serviceFeeTotal
    const originalTotal = normalizeNumber(responseData.total)

    // Extract enhanced analysis fields if available
    const enhancedData = data as {
      validation?: ParseResult['validation']
      fieldConfidence?: ParseResult['fieldConfidence']
      handwrittenFields?: string[]
      suggestedCorrections?: ParseResult['suggestedCorrections']
      confidence?: number
    }

    const result: ParseResult = {
      place: responseData.place || null,
      date: responseData.date || null,
      items: processedItems,
      subtotal: originalSubtotal,
      tax: originalTax,
      tip: originalTip,
      service_fee: originalServiceFee,
      discount: originalDiscount,
      total: originalTotal,
      rawText: responseData.rawText || null,
      // Enhanced analysis fields
      validation: enhancedData.validation,
      fieldConfidence: enhancedData.fieldConfidence,
      handwrittenFields: enhancedData.handwrittenFields,
      suggestedCorrections: enhancedData.suggestedCorrections,
      confidence: enhancedData.confidence
    }

    // Log service fee and tip detection if any
    if (originalServiceFee > 0) {
      console.log(`[scan_ok] Service fees: $${originalServiceFee.toFixed(2)} ${apiServiceFee ? '(from API)' : '(from line items)'}`)
    }
    if (originalTip > 0) {
      console.log(`[scan_ok] Tip: $${originalTip.toFixed(2)}`)
    }

    const totalDuration = Date.now() - startTime
    console.info(`[scan_ok] Receipt parsed successfully in ${totalDuration}ms - items: ${result.items.length}, place: ${!!result.place}, total: $${result.total || 0}`)

    // Save to cache for instant future loads
    // Only cache real OCR results, not demo/fallback data
    const isDemoData = result.place === 'Demo Restaurant' && result.items.some(item => item.label === 'Margherita Pizza')
    if (cacheKey && !isDemoData) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result))
        console.info(`[scan_cache] Cached result for future use (${cacheKey.substring(11, 19)}...)`)
      } catch (cacheError) {
        console.warn('[scan_cache] Failed to cache result:', cacheError)
      }
    } else if (isDemoData) {
      console.warn('[scan_cache] Skipping cache - demo/fallback data should not be cached')
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
    // NOTE: This will NOT be cached (see caching logic above)
    const fallbackResult = getDEVFallback()
    console.info(`[scan_ok] Using dev fallback due to network error - ${fallbackResult.items.length} items (NOT cached)`)
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

// Multi-image receipt parsing for long receipts
export async function parseMultipleReceipts(
  files: File[],
  onProgress?: (step: string, current: number, total: number) => void,
  signal?: AbortSignal
): Promise<ParseResult> {
  if (files.length === 0) {
    throw new Error('No files provided')
  }

  if (files.length === 1) {
    // Single file, use normal parsing
    return parseReceipt(files[0], (step) => onProgress?.(step, 1, 1), signal)
  }

  console.info(`[multi_scan] Starting multi-image scan with ${files.length} images`)

  // Parse all images in sequence
  const results: ParseResult[] = []

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) {
      throw new DOMException('Scan cancelled', 'AbortError')
    }

    onProgress?.(`Scanning image ${i + 1}/${files.length}...`, i + 1, files.length)
    console.info(`[multi_scan] Processing image ${i + 1}/${files.length}: ${files[i].name}`)

    try {
      const result = await parseReceipt(files[i], undefined, signal)
      results.push(result)
      console.info(`[multi_scan] Image ${i + 1} returned ${result.items.length} items`)
    } catch (error) {
      console.warn(`[multi_scan] Failed to parse image ${i + 1}:`, error)
      // Continue with other images
    }
  }

  if (results.length === 0) {
    throw new Error('Failed to parse any of the receipt images')
  }

  // Merge results intelligently
  onProgress?.('Merging results...', files.length, files.length)
  return mergeReceiptResults(results)
}

// Merge multiple receipt parsing results
function mergeReceiptResults(results: ParseResult[]): ParseResult {
  if (results.length === 1) {
    return results[0]
  }

  console.info(`[multi_scan] Merging ${results.length} receipt results`)

  // Use place/date from first result that has them
  const place = results.find(r => r.place)?.place || null
  const date = results.find(r => r.date)?.date || null

  // Collect all items, deduplicating by label+price
  const itemMap = new Map<string, ParseResult['items'][0]>()
  const seenKeys = new Set<string>()

  for (const result of results) {
    for (const item of result.items) {
      // Create a key for deduplication (normalize label, round price)
      const key = `${item.label.toLowerCase().trim()}-${item.price.toFixed(2)}`

      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        itemMap.set(item.id, item)
      } else {
        console.log(`[multi_scan] Skipping duplicate item: ${item.label} ($${item.price})`)
      }
    }
  }

  const items = Array.from(itemMap.values())
  console.info(`[multi_scan] Merged ${items.length} unique items from ${results.reduce((sum, r) => sum + r.items.length, 0)} total`)

  // For totals: prefer the result that has the most complete data
  // or use the last result (often the payment summary)
  const resultWithTotals = results.find(r =>
    r.total && r.total > 0 && r.subtotal && r.subtotal > 0
  ) || results[results.length - 1]

  // Calculate subtotal from merged items
  const calculatedSubtotal = items.reduce((sum, item) => sum + item.price, 0)

  // Use receipt totals if they seem valid, otherwise calculate
  const subtotal = resultWithTotals.subtotal && Math.abs(resultWithTotals.subtotal - calculatedSubtotal) < 5
    ? resultWithTotals.subtotal
    : calculatedSubtotal

  const tax = resultWithTotals.tax || results.reduce((max, r) => Math.max(max, r.tax || 0), 0)
  const tip = resultWithTotals.tip || results.reduce((max, r) => Math.max(max, r.tip || 0), 0)
  const discount = resultWithTotals.discount || results.reduce((sum, r) => sum + (r.discount || 0), 0)
  const serviceFee = resultWithTotals.service_fee || results.reduce((sum, r) => sum + (r.service_fee || 0), 0)
  const total = resultWithTotals.total || (subtotal - discount + serviceFee + tax + tip)

  const merged: ParseResult = {
    place,
    date,
    items,
    subtotal,
    tax,
    tip,
    discount,
    service_fee: serviceFee,
    total,
    rawText: results.map(r => r.rawText).filter(Boolean).join('\n---\n')
  }

  console.info(`[multi_scan] Final merged result: ${items.length} items, total: $${total}`)
  return merged
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

// #11: Correction Feedback Loop Integration
// Sync local corrections to server for OCR improvement

interface CorrectionFeedback {
  field: string
  originalValue: number | string | null
  correctedValue: number | string
  correctionType: 'manual' | 'suggested_applied' | 'auto_calculated'
  wasHandwritten?: boolean
  receiptId?: string
}

// Get session ID for feedback grouping (uses localStorage for persistence)
function getFeedbackSessionId(): string {
  let sessionId = localStorage.getItem('tabby_feedback_session')
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`
    localStorage.setItem('tabby_feedback_session', sessionId)
  }
  return sessionId
}

// Sync local corrections to server for OCR learning
export async function syncCorrectionsToServer(): Promise<{ success: boolean; adjustmentsGenerated?: number }> {
  try {
    // Get local corrections from correctionAnalytics
    const localCorrectionsRaw = localStorage.getItem('tabby_correction_analytics')
    if (!localCorrectionsRaw) {
      console.info('[feedback] No local corrections to sync')
      return { success: true }
    }

    const localCorrections = JSON.parse(localCorrectionsRaw)
    if (!Array.isArray(localCorrections) || localCorrections.length === 0) {
      console.info('[feedback] No corrections in local storage')
      return { success: true }
    }

    // Only sync corrections from the last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentCorrections = localCorrections.filter((c: any) => {
      const createdAt = new Date(c.created_at).getTime()
      return createdAt > oneDayAgo
    })

    if (recentCorrections.length === 0) {
      console.info('[feedback] No recent corrections to sync')
      return { success: true }
    }

    // Format corrections for server
    const corrections: CorrectionFeedback[] = recentCorrections.map((c: any) => ({
      field: c.field,
      originalValue: c.original_value,
      correctedValue: c.corrected_value,
      correctionType: c.correction_type,
      wasHandwritten: c.was_handwritten,
      receiptId: c.receipt_id
    }))

    const sessionId = getFeedbackSessionId()
    console.info(`[feedback] Syncing ${corrections.length} corrections for session ${sessionId}`)

    const response = await fetch(`${API_BASE}/api/corrections/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corrections, sessionId })
    })

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`)
    }

    const result = await response.json()
    console.info(`[feedback] Server generated ${result.adjustmentsGenerated || 0} prompt adjustments from ${result.patternsTracked || 0} patterns`)

    return {
      success: true,
      adjustmentsGenerated: result.adjustmentsGenerated
    }
  } catch (error) {
    console.warn('[feedback] Failed to sync corrections:', error)
    return { success: false }
  }
}

// Fetch learned adjustments from server for upcoming OCR requests
export async function fetchOCRAdjustments(): Promise<string[]> {
  try {
    const sessionId = getFeedbackSessionId()
    const response = await fetch(`${API_BASE}/api/corrections/feedback?sessionId=${sessionId}`)

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.adjustments || []
  } catch (error) {
    console.warn('[feedback] Failed to fetch OCR adjustments:', error)
    return []
  }
}

// Auto-sync corrections periodically (call this on app startup or after corrections)
let syncTimeout: ReturnType<typeof setTimeout> | null = null

export function scheduleCorrectionSync(delayMs: number = 5000): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout)
  }

  syncTimeout = setTimeout(async () => {
    await syncCorrectionsToServer()
    syncTimeout = null
  }, delayMs)
}

// Export for testing
export { getFeedbackSessionId }