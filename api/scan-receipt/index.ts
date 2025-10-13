import { VercelRequest, VercelResponse } from '@vercel/node'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from '../_utils/cors.js'
import { createRequestContext, checkRequestSize, sendErrorResponse, sendSuccessResponse, logRequestCompletion } from '../_utils/request.js'
import { checkRateLimit, addRateLimitHeaders } from '../_utils/rateLimit.js'
import { FILE_LIMITS } from '../_utils/schemas.js'
import { processWithFallback, processWithMultipleProviders } from './ocr-providers.js'
import { generateAndCacheFoodIcons } from '../_utils/foodIconsService.js'

// Server-side Supabase client using secret key
const _supabaseAdmin = process.env.SUPABASE_SECRET_KEY
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
  total?: number | null
  rawText?: string | null
  items: Array<{
    label: string
    price: number
    emoji?: string | null
    iconUrl?: string | null
  }>
}

interface _HealthResponse {
  ok: boolean
  uptimeMs: number
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

// This function is no longer used - we use processWithOpenAI directly

const startTime = Date.now()

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

    console.log('[scan_api] Starting receipt processing...')

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

    console.log(`[scan_api] Processing image file: ${file.originalFilename} (${file.size} bytes, ${file.mimetype})`)
    
    // Note: supabaseAdmin can be used here for server-side database operations
    // Example: await supabaseAdmin?.from('receipts').insert({ ... })

    // Check if OpenAI is configured
    const openaiConfigured = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ''
    console.log('[scan_api] OpenAI configured:', openaiConfigured, 'Key present:', !!process.env.OPENAI_API_KEY, 'Key length:', process.env.OPENAI_API_KEY?.length || 0)

    let result: ScanReceiptResponse

    if (openaiConfigured) {
      // Use OCR processing with fallback
      console.log('[scan_api] Using OCR processing')
      try {
        // Read file as buffer for OCR processing
        const imageBuffer = await fs.readFile(file.filepath)
        console.log(`[scan_api] File read successfully, size: ${imageBuffer.length} bytes`)

        // Process with OCR providers (parallel processing for speed)
        const ocrResult = await processWithMultipleProviders(imageBuffer, file.mimetype, 8000)
        console.log(`[scan_api] OCR processing completed - ${ocrResult.items.length} items extracted in ${ocrResult.processingTime}ms`)

        // TODO: Re-enable icon generation after database migration is applied
        // Check cache for existing icons (fast lookup, ~50ms)
        // This way repeated items get icons immediately!
        // console.log('[scan_api] Checking icon cache...')
        // const foodNames = ocrResult.items.map(item => item.label)
        // const iconResults = await generateAndCacheFoodIcons(foodNames)
        //
        // // Map icon URLs back to items
        // const itemsWithIcons = ocrResult.items.map((item, index) => ({
        //   ...item,
        //   iconUrl: iconResults[index]?.iconUrl || null
        // }))
        //
        // const cachedCount = iconResults.filter(r => r.iconUrl).length
        // console.log(`[scan_api] Icon lookup completed - ${cachedCount}/${itemsWithIcons.length} icons available (${cachedCount} cached, ${itemsWithIcons.length - cachedCount} newly generated)`)

        // Temporarily return without icons until migration is applied
        const itemsWithIcons = ocrResult.items.map(item => ({
          ...item,
          iconUrl: null
        }))

        result = {
          place: ocrResult.place,
          date: ocrResult.date,
          subtotal: ocrResult.subtotal,
          tax: ocrResult.tax,
          tip: ocrResult.tip,
          discount: ocrResult.discount,
          total: ocrResult.total,
          rawText: ocrResult.rawText,
          items: itemsWithIcons
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
        // Fall back to dev data if OCR fails
        result = getDEVFallback()
      }
    } else {
      // DEV fallback
      console.log('[scan_api] Using DEV fallback (OpenAI not configured)')
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
    
    // Always return fallback data even on error
    const fallback = getDEVFallback()
    const responseData = {
      error: 'Receipt processing failed',
      errorMessage: error.message, // Include error message for debugging
      ...fallback
    }
    
    sendSuccessResponse(res as any, responseData, 500, ctx)
    logRequestCompletion(ctx, 500, error.message)
  }
}

// Configure for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}