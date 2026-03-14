import { type VercelRequest, type VercelResponse } from '@vercel/node'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from '../_utils/cors.js'
import { createRequestContext, checkRequestSize, sendErrorResponse, sendSuccessResponse, logRequestCompletion } from '../_utils/request.js'
import { checkRateLimit, addRateLimitHeaders } from '../_utils/rateLimit.js'
import { FILE_LIMITS } from '../_utils/schemas.js'
import { processWithMultipleProviders, enhanceOCRResult } from './ocr-providers.js'

// Smart emoji mapping - fast and fun!
const EMOJI_MAP: Record<string, string> = {
  // Proteins
  'chicken': '🍗', 'beef': '🥩', 'steak': '🥩', 'pork': '🥓', 'bacon': '🥓', 'ham': '🍖',
  'fish': '🐟', 'salmon': '🍣', 'tuna': '🐟', 'shrimp': '🦐', 'crab': '🦀', 'lobster': '🦞',
  'sushi': '🍣', 'sashimi': '🍣', 'wings': '🍗', 'ribs': '🍖', 'lamb': '🍖',

  // Pizza & Italian
  'pizza': '🍕', 'pasta': '🍝', 'spaghetti': '🍝', 'lasagna': '🍝', 'ravioli': '🍝',
  'calzone': '🍕', 'margherita': '🍕', 'pepperoni': '🍕',

  // Asian
  'ramen': '🍜', 'pho': '🍜', 'noodle': '🍜', 'rice': '🍚', 'fried rice': '🍚',
  'dumpling': '🥟', 'gyoza': '🥟', 'wonton': '🥟', 'spring roll': '🥟', 'egg roll': '🥟',
  'teriyaki': '🍱', 'bento': '🍱', 'curry': '🍛', 'pad thai': '🍜', 'miso': '🍲',

  // Mexican
  'taco': '🌮', 'burrito': '🌯', 'quesadilla': '🧀', 'nachos': '🌮', 'enchilada': '🌮',
  'guac': '🥑', 'guacamole': '🥑', 'salsa': '🍅', 'chips': '🌮',

  // Burgers & Sandwiches
  'burger': '🍔', 'hamburger': '🍔', 'cheeseburger': '🍔', 'sandwich': '🥪', 'sub': '🥪',
  'wrap': '🌯', 'hot dog': '🌭', 'hotdog': '🌭', 'dog': '🌭', 'blt': '🥪', 'club': '🥪',

  // Breakfast
  'egg': '🍳', 'eggs': '🍳', 'omelet': '🍳', 'omelette': '🍳', 'pancake': '🥞', 'waffle': '🧇',
  'toast': '🍞', 'bagel': '🥯', 'croissant': '🥐', 'muffin': '🧁', 'cereal': '🥣',
  'french toast': '🍞', 'benedict': '🍳', 'breakfast': '🍳',

  // Salads & Veggies
  'salad': '🥗', 'caesar': '🥗', 'garden': '🥗', 'greek': '🥗', 'cobb': '🥗',
  'vegetable': '🥦', 'veggie': '🥦', 'broccoli': '🥦', 'carrot': '🥕', 'corn': '🌽',
  'potato': '🥔', 'fries': '🍟', 'french fries': '🍟', 'tots': '🍟', 'onion': '🧅',

  // Soups
  'soup': '🍲', 'chowder': '🍲', 'bisque': '🍲', 'stew': '🍲', 'chili': '🌶️',

  // Desserts
  'cake': '🍰', 'cheesecake': '🍰', 'pie': '🥧', 'ice cream': '🍨', 'gelato': '🍨',
  'sundae': '🍨', 'brownie': '🍫', 'chocolate': '🍫', 'cookie': '🍪', 'donut': '🍩',
  'doughnut': '🍩', 'cupcake': '🧁', 'tiramisu': '🍰', 'flan': '🍮', 'pudding': '🍮',

  // Drinks - Coffee & Tea
  'coffee': '☕', 'espresso': '☕', 'latte': '☕', 'cappuccino': '☕', 'mocha': '☕',
  'americano': '☕', 'macchiato': '☕', 'tea': '🍵', 'chai': '🍵', 'matcha': '🍵',

  // Drinks - Alcohol
  'beer': '🍺', 'ale': '🍺', 'ipa': '🍺', 'lager': '🍺', 'stout': '🍺', 'pilsner': '🍺',
  'wine': '🍷', 'red wine': '🍷', 'white wine': '🥂', 'champagne': '🍾', 'prosecco': '🍾',
  'cocktail': '🍹', 'margarita': '🍹', 'martini': '🍸', 'mojito': '🍹', 'sangria': '🍷',
  'whiskey': '🥃', 'bourbon': '🥃', 'scotch': '🥃', 'vodka': '🍸', 'rum': '🍹', 'gin': '🍸',
  'shot': '🥃', 'punch': '🍹', 'mimosa': '🥂', 'bellini': '🥂',

  // Drinks - Other
  'soda': '🥤', 'cola': '🥤', 'coke': '🥤', 'pepsi': '🥤', 'sprite': '🥤',
  'juice': '🧃', 'orange juice': '🍊', 'lemonade': '🍋', 'smoothie': '🥤',
  'water': '💧', 'sparkling': '💧', 'milk': '🥛', 'shake': '🥤', 'milkshake': '🥤',

  // Appetizers & Sides
  'appetizer': '🍽️', 'starter': '🍽️', 'bread': '🍞', 'roll': '🍞', 'biscuit': '🍞',
  'hummus': '🫘', 'dip': '🫕', 'fondue': '🫕', 'cheese': '🧀', 'mozzarella': '🧀',

  // Seafood
  'oyster': '🦪', 'clam': '🦪', 'mussel': '🦪', 'scallop': '🦪', 'calamari': '🦑', 'squid': '🦑',

  // Misc
  'special': '⭐', 'combo': '🍱', 'platter': '🍽️', 'bowl': '🥣', 'plate': '🍽️',
}

// Expand quantity items (e.g., "3 Cold Beverage $10.50" -> 3x "Cold Beverage $3.50")
function expandQuantityItems(items: Array<{ label: string; price: number; emoji?: string | null }>): Array<{ label: string; price: number; emoji?: string | null }> {
  const expanded: Array<{ label: string; price: number; emoji?: string | null }> = []

  for (const item of items) {
    // Pattern 1: starts with a number followed by space and item name
    // Examples: "3 Cold Beverage", "2 Grey Goose", "4 Rudolph's Red-Nosed Punch"
    const quantityMatch = item.label.match(/^(\d+)\s+(.+)$/)

    if (quantityMatch) {
      const quantity = parseInt(quantityMatch[1], 10)
      const itemName = quantityMatch[2]

      // Only expand if quantity > 1 and <= 50 (sanity check - supports catering/large parties)
      if (quantity > 1 && quantity <= 50) {
        const unitPrice = Math.round((item.price / quantity) * 100) / 100 // Round to 2 decimal places
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[scan_api] Expanding "${item.label}" ($${item.price}) -> ${quantity}x "${itemName}" ($${unitPrice} each)`)
        }

        // Create individual items
        for (let i = 0; i < quantity; i++) {
          expanded.push({
            label: itemName,
            price: unitPrice,
            emoji: item.emoji
          })
        }
        continue
      }
    }

    // Pattern 2: Check for "x" notation like "Cold Beverage x2" or "Cold Beverage (2)"
    const xMatch = item.label.match(/^(.+?)\s*[x×]\s*(\d+)$/i) || item.label.match(/^(.+?)\s*\((\d+)\)$/)
    if (xMatch) {
      const itemName = xMatch[1].trim()
      const quantity = parseInt(xMatch[2], 10)

      if (quantity > 1 && quantity <= 50) {
        const unitPrice = Math.round((item.price / quantity) * 100) / 100
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[scan_api] Expanding "${item.label}" ($${item.price}) -> ${quantity}x "${itemName}" ($${unitPrice} each)`)
        }

        for (let i = 0; i < quantity; i++) {
          expanded.push({
            label: itemName,
            price: unitPrice,
            emoji: item.emoji
          })
        }
        continue
      }
    }

    // Pattern 3: "@" notation like "2 @ $45.00 Gameplay"
    const atMatch = item.label.match(/^(\d+)\s*@\s*\$?[\d.]+\s+(.+)$/)
    if (atMatch) {
      const quantity = parseInt(atMatch[1], 10)
      const itemName = atMatch[2].trim()

      if (quantity > 1 && quantity <= 50) {
        const unitPrice = Math.round((item.price / quantity) * 100) / 100
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[scan_api] Expanding "${item.label}" ($${item.price}) -> ${quantity}x "${itemName}" ($${unitPrice} each)`)
        }

        for (let i = 0; i < quantity; i++) {
          expanded.push({
            label: itemName,
            price: unitPrice,
            emoji: item.emoji
          })
        }
        continue
      }
    }

    // Pattern 4: "Qty" prefix like "Qty: 3 Beer" or "Quantity 2 Salad"
    const qtyMatch = item.label.match(/^(?:qty|quantity)[:\s]*(\d+)\s+(.+)$/i)
    if (qtyMatch) {
      const quantity = parseInt(qtyMatch[1], 10)
      const itemName = qtyMatch[2].trim()

      if (quantity > 1 && quantity <= 50) {
        const unitPrice = Math.round((item.price / quantity) * 100) / 100
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[scan_api] Expanding "${item.label}" ($${item.price}) -> ${quantity}x "${itemName}" ($${unitPrice} each)`)
        }

        for (let i = 0; i < quantity; i++) {
          expanded.push({
            label: itemName,
            price: unitPrice,
            emoji: item.emoji
          })
        }
        continue
      }
    }

    // No quantity prefix or quantity is 1, keep as-is
    expanded.push(item)
  }

  return expanded
}

function getSmartEmoji(label: string): string {
  const lower = label.toLowerCase()

  // Check for exact or partial matches
  for (const [keyword, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(keyword)) {
      return emoji
    }
  }

  // Fallback based on common patterns
  if (lower.includes('drink') || lower.includes('beverage')) return '🥤'
  if (lower.includes('side')) return '🍽️'
  if (lower.includes('sauce') || lower.includes('dressing')) return '🫗'
  if (lower.includes('extra') || lower.includes('add')) return '➕'

  // Default food emoji
  return '🍽️'
}

// Server-side Supabase client using secret key
const supabaseAdmin = process.env.SUPABASE_SECRET_KEY
  ? createClient(
      process.env.VITE_SUPABASE_URL || 'https://evraslbpgcafyvvtbqxy.supabase.co',
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null

// Feature flags
const REQUIRE_REAL_OCR = process.env.REQUIRE_REAL_OCR === '1'

// Check if OCR provider keys are available
const hasOCRProviders = !!(
  process.env.GOOGLE_CLOUD_VISION_API_KEY ||
  process.env.AWS_ACCESS_KEY_ID ||
  process.env.AZURE_VISION_ENDPOINT ||
  process.env.OCR_SPACE_API_KEY ||
  process.env.OPENAI_API_KEY
)

interface ScanReceiptResponse {
  place?: string | null
  date?: string | null
  subtotal?: number | null
  tax?: number | null
  tip?: number | null
  discount?: number | null
  service_fee?: number | null
  total?: number | null
  rawText?: string | null
  items: Array<{
    label: string
    price: number
    emoji?: string | null
    iconUrl?: string | null
  }>
  // Enhanced analysis fields
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


// DEV fallback with 3 deterministic items
function getDEVFallback(): ScanReceiptResponse {
  return {
    place: "Demo Restaurant",
    date: new Date().toISOString().split('T')[0],
    subtotal: 42.00,
    tax: 3.36,
    tip: 8.40,
    total: 53.76,
    rawText: "Mock receipt text for development",
    items: [
      { label: "Margherita Pizza", price: 18.00, emoji: "🍕" },
      { label: "Caesar Salad", price: 12.00, emoji: "🥗" },
      { label: "Craft Beer", price: 6.00, emoji: "🍺" },
      { label: "Tiramisu", price: 6.00, emoji: "🍰" }
    ]
  }
}

// Parse file from multipart/form-data  
async function parseFormData(req: VercelRequest): Promise<{ file: any } | null> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm()
    
    form.parse(req, (err, _fields, files) => {
      if (err) {
        reject(err)
        return
      }
      
      const file = Array.isArray(files.file) ? files.file[0] : files.file
      if (!file) {
        resolve(null)
        return
      }
      
      resolve({ file })
    })
  })
}


function redactQuery(query: any): string {
  // Redact sensitive query parameters while keeping useful ones
  const safe = { ...query }
  delete safe.token
  delete safe.key
  delete safe.secret
  delete safe.password
  return JSON.stringify(safe)
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle health check first - before any other processing
  if (req.method === 'GET' && req.query.health === '1') {
    res.status(200).json({ ok: true, uptimeMs: 0 })
    return
  }

  // Apply CORS headers and handle OPTIONS preflight
  if (applyCors(req, res)) return

  // Create request context for consistent logging
  const ctx = createRequestContext(req as any, res as any, 'scan_receipt')

  // Check rate limiting
  const rateLimitCheck = checkRateLimit(req as any, 'scan_receipt', ctx)
  if (!rateLimitCheck.success) {
    sendErrorResponse(res as any, rateLimitCheck.error, 429, ctx)
    return
  }

  // Check request size limits for file uploads
  const sizeCheck = checkRequestSize(req as any, FILE_LIMITS.maxImageSize, ctx)
  if (!sizeCheck.success) {
    sendErrorResponse(res as any, sizeCheck.error, 413, ctx)
    return
  }

  const method = req.method || 'UNKNOWN'
  const queryRedacted = redactQuery(req.query)

  ctx.log('info', `Request started`, { method, url: req.url, query: queryRedacted })

  try {

    // Handle other GET requests
    if (req.method === 'GET') {
      const error = { error: 'GET method requires ?health=1 parameter', code: 'INVALID_HEALTH_PARAM' }
      sendErrorResponse(res as any, error, 405, ctx)
      return
    }

    // Handle POST upload
    if (req.method !== 'POST') {
      const error = { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }
      sendErrorResponse(res as any, error, 405, ctx)
      return
    }

    // Check REQUIRE_REAL_OCR flag
    if (REQUIRE_REAL_OCR && !hasOCRProviders) {
      ctx.log('error', 'OCR not configured but required')
      const error = { 
        error: 'Real OCR scanning is required but no OCR provider keys are configured',
        code: 'OCR_NOT_CONFIGURED'
      }
      sendErrorResponse(res as any, error, 400, ctx)
      return
    }

    if (process.env.NODE_ENV !== 'production') console.log('[scan_api] Starting receipt processing...')

    // Parse multipart form data
    const formData = await parseFormData(req)
    
    if (!formData?.file) {
      ctx.log('warn', 'No file provided, returning fallback')
      const error = { error: 'No file provided', code: 'NO_FILE_PROVIDED' }
      sendErrorResponse(res as any, error, 400, ctx)
      return
    }

    const { file } = formData

    // Validate file type
    if (!file.mimetype?.startsWith('image/')) {
      ctx.log('warn', 'Invalid file type', { mimetype: file.mimetype })
      const error = { 
        error: 'Invalid file type. Please upload an image.',
        code: 'INVALID_FILE_TYPE'
      }
      sendErrorResponse(res as any, error, 400, ctx)
      return
    }

    if (process.env.NODE_ENV !== 'production') console.log(`[scan_api] Processing image file: ${file.originalFilename} (${file.size} bytes, ${file.mimetype})`)
    
    // Note: supabaseAdmin can be used here for server-side database operations
    // Example: await supabaseAdmin?.from('receipts').insert({ ... })

    // Check if OpenAI is configured
    const openaiConfigured = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ''

    let result: ScanReceiptResponse

    if (openaiConfigured) {
      // Use OCR processing with fallback
      if (process.env.NODE_ENV !== 'production') console.log('[scan_api] Using OCR processing')
      try {
        // Read file as buffer for OCR processing
        const imageBuffer = await fs.readFile(file.filepath)
        if (process.env.NODE_ENV !== 'production') console.log(`[scan_api] File read successfully, size: ${imageBuffer.length} bytes`)

        // Process with OCR providers (parallel processing for speed)
        let ocrResult = await processWithMultipleProviders(imageBuffer, file.mimetype, 30000)
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[scan_api] OCR processing completed - ${ocrResult.items.length} items extracted in ${ocrResult.processingTime}ms`)
        }

        // Re-extract low-confidence fields for better accuracy
        if (ocrResult.confidence !== undefined && ocrResult.confidence < 0.75) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[scan_api] Low confidence (${ocrResult.confidence.toFixed(2)}), enhancing OCR result...`)
          }
          ocrResult = await enhanceOCRResult(ocrResult, imageBuffer, file.mimetype)
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[scan_api] Enhanced OCR confidence: ${ocrResult.confidence?.toFixed(2) || 'N/A'}`)
          }
        }

        // First, expand quantity items (e.g., "3 Cold Beverage" -> 3 separate items)
        if (process.env.NODE_ENV !== 'production') console.log('[scan_api] Expanding quantity items...')
        const expandedItems = expandQuantityItems(ocrResult.items)
        if (process.env.NODE_ENV !== 'production') console.log(`[scan_api] Expanded ${ocrResult.items.length} items to ${expandedItems.length} items`)

        // Smart emoji mapping instead of slow DALL-E icon generation
        if (process.env.NODE_ENV !== 'production') console.log('[scan_api] Applying smart emoji mapping...')
        const itemsWithEmojis = expandedItems.map(item => ({
          ...item,
          emoji: item.emoji || getSmartEmoji(item.label)
        }))
        if (process.env.NODE_ENV !== 'production') console.log(`[scan_api] Emoji mapping completed for ${itemsWithEmojis.length} items`)

        // Log any warnings or suggestions
        if (process.env.NODE_ENV !== 'production') {
          if (ocrResult.validation?.warnings?.length) {
            console.log(`[scan_api] OCR Warnings: ${ocrResult.validation.warnings.join('; ')}`)
          }
          if (ocrResult.suggestedCorrections?.length) {
            console.log(`[scan_api] Suggested corrections: ${JSON.stringify(ocrResult.suggestedCorrections)}`)
          }
          if (ocrResult.handwrittenFields?.length) {
            console.log(`[scan_api] Handwritten fields detected: ${ocrResult.handwrittenFields.join(', ')}`)
          }
        }

        result = {
          place: ocrResult.place,
          date: ocrResult.date,
          subtotal: ocrResult.subtotal,
          tax: ocrResult.tax,
          tip: ocrResult.tip,
          discount: ocrResult.discount,
          service_fee: ocrResult.service_fee,
          total: ocrResult.total,
          rawText: ocrResult.rawText,
          items: itemsWithEmojis,
          // Enhanced analysis fields
          validation: ocrResult.validation,
          fieldConfidence: ocrResult.fieldConfidence,
          handwrittenFields: ocrResult.handwrittenFields,
          suggestedCorrections: ocrResult.suggestedCorrections,
          confidence: ocrResult.confidence
        }
      } catch (ocrError: any) {
        console.error('[scan_api] OCR processing failed:', {
          message: ocrError?.message,
          name: ocrError?.name,
          code: ocrError?.code,
          status: ocrError?.status,
          stack: ocrError?.stack?.split('\n').slice(0, 3)
        })
        ctx.log('error', 'OCR processing failed', {
          error: ocrError?.message,
          code: ocrError?.code
        })
        // Fall back to dev data if OCR fails and we're in development
        const isDevelopment = process.env.NODE_ENV !== 'production' || process.env.VITE_ALLOW_DEV_FALLBACK === '1'
        if (isDevelopment) {
          if (process.env.NODE_ENV !== 'production') console.log('[scan_api] Using DEV fallback after OCR error')
          result = getDEVFallback()
        } else {
          // In production, throw the error to be handled by outer catch block
          throw ocrError
        }
      }
    } else {
      // DEV fallback
      if (process.env.NODE_ENV !== 'production') console.log('[scan_api] Using DEV fallback (OpenAI not configured)')
      result = getDEVFallback()
    }

    // Add rate limit headers
    addRateLimitHeaders(res as any, req as any, 'scan_receipt')
    
    // Send success response
    sendSuccessResponse(res as any, result, 200, ctx)
    
    // Log successful completion
    logRequestCompletion(ctx, 200)

  } catch (error: any) {
    ctx.log('error', 'Receipt processing error', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      response: error.response?.data,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    })

    // Return proper error response with fallback data
    const errorResponse = {
      error: 'Receipt processing failed',
      code: 'PROCESSING_ERROR',
      message: error.message
    }

    sendErrorResponse(res as any, errorResponse, 500, ctx)
    logRequestCompletion(ctx, 500, error.message)
  }
}

// Configure for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}