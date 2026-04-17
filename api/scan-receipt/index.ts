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

// Parse quantity out of a line label without splitting into N rows.
//
// Receipts commonly print "6 Peking Dumpling $9.12" as one line that's really
// one *shared* item (a plate). Auto-expanding it to 6 rows pollutes the UI and
// misleads users into assigning each piece individually when they meant to
// split the plate. Keep one item per line and attach quantity metadata.
//
// Also handles visual cleanup:
//   - "1 Chicken Lo Mein" → label "Chicken Lo Mein" (the leading "1 " is just
//     "ordered one of", it's redundant noise).
//   - "1 Peking Dumpling (Steamed) (6)" → label "Peking Dumpling (Steamed)",
//     quantity 6. The leading "1" is the order multiplier; the trailing "(6)"
//     is the piece count, which wins.
type QuantityItem = { label: string; price: number; emoji?: string | null; quantity?: number; unit_price?: number }
function parseQuantityItems(items: Array<{ label: string; price: number; emoji?: string | null }>): QuantityItem[] {
  const out: QuantityItem[] = []

  // Strip a leading "1 " ordered-quantity prefix ("1 Chicken Lo Mein" is just
  // "Chicken Lo Mein" — the 1 is the default). Preserves N > 1 so "6 Dumpling"
  // still parses via the patterns below.
  const stripOneOrder = (s: string) => s.replace(/^1\s+(?=\S)/, '')

  const patterns: Array<{ re: RegExp; qtyIdx: number; nameIdx: number }> = [
    // Trailing piece counts first — "Peking Dumpling (6)" / "Beer x2" — because
    // these usually represent piece count on a shared plate, which is more
    // informative than the order-count prefix.
    { re: /^(.+?)\s*[x×]\s*(\d+)$/i, qtyIdx: 2, nameIdx: 1 },
    { re: /^(.+?)\s*\((\d+)\)$/, qtyIdx: 2, nameIdx: 1 },
    // Leading quantity — "3 Cold Beverage"
    { re: /^(\d+)\s+(.+)$/, qtyIdx: 1, nameIdx: 2 },
    // "2 @ $45.00 Gameplay"
    { re: /^(\d+)\s*@\s*\$?[\d.]+\s+(.+)$/, qtyIdx: 1, nameIdx: 2 },
    // "Qty: 3 Beer" / "Quantity 2 Salad"
    { re: /^(?:qty|quantity)[:\s]*(\d+)\s+(.+)$/i, qtyIdx: 1, nameIdx: 2 },
  ]

  for (const item of items) {
    // Normalize: drop the redundant "1 " prefix first so trailing patterns get
    // a clean shot at a label like "Peking Dumpling (6)".
    const cleanedLabel = stripOneOrder(item.label)
    let handled = false

    for (const { re, qtyIdx, nameIdx } of patterns) {
      const m = cleanedLabel.match(re)
      if (!m) continue

      const quantity = parseInt(m[qtyIdx], 10)
      const itemName = m[nameIdx].trim()

      if (!itemName || quantity > 50) continue

      if (quantity > 1) {
        const unitPrice = Math.round((item.price / quantity) * 100) / 100
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[scan_api] Parsed quantity "${item.label}" ($${item.price}) -> "${itemName}" x${quantity} @ $${unitPrice}`)
        }
        out.push({
          label: itemName,
          price: item.price,    // line total stays authoritative
          emoji: item.emoji,
          quantity,
          unit_price: unitPrice
        })
        handled = true
        break
      }
      // quantity === 1: the label had a "1 X" or "X (1)" pattern — strip it
      // but keep the clean name for display.
      out.push({
        label: itemName,
        price: item.price,
        emoji: item.emoji,
        quantity: 1,
        unit_price: item.price
      })
      handled = true
      break
    }

    if (!handled) {
      out.push({
        ...item,
        label: cleanedLabel,    // "1 " stripped even if no quantity pattern matched
        quantity: 1,
        unit_price: item.price
      })
    }
  }

  return out
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

        // Parse quantity metadata without splitting into N rows — "6 Peking
        // Dumpling $9.12" stays one item with quantity=6 and unit_price=1.52.
        if (process.env.NODE_ENV !== 'production') console.log('[scan_api] Parsing quantity metadata...')
        const parsedItems = parseQuantityItems(ocrResult.items)

        // Smart emoji mapping instead of slow DALL-E icon generation
        if (process.env.NODE_ENV !== 'production') console.log('[scan_api] Applying smart emoji mapping...')
        const itemsWithEmojis = parsedItems.map(item => ({
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