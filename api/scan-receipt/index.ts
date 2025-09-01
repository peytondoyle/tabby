import { VercelRequest, VercelResponse } from '@vercel/node'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from '../_utils/cors.js'
import { createRequestContext, checkRequestSize, sendErrorResponse, sendSuccessResponse, logRequestCompletion } from '../_utils/request.js'
import { checkRateLimit, addRateLimitHeaders } from '../_utils/rateLimit.js'
import { FILE_LIMITS, HealthResponseSchema } from '../_utils/schemas.js'
import { processWithOpenAI, isOpenAIConfigured } from './openai-ocr.js'

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

// Validate that we're not using legacy keys
if (process.env.SUPABASE_SECRET_KEY && process.env.SUPABASE_SECRET_KEY.startsWith('eyJ')) {
  throw new Error('Legacy service_role key detected! Please use the new Secret key format.')
}

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
  total?: number | null
  rawText?: string | null
  items: Array<{
    label: string
    price: number
  }>
}

interface HealthResponse {
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
      { label: "Margherita Pizza", price: 18.00 },
      { label: "Caesar Salad", price: 12.00 },
      { label: "Craft Beer", price: 6.00 },
      { label: "Tiramisu", price: 6.00 }
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

    // Handle GET health check
    if (req.method === 'GET') {
      const { health } = req.query
      
      if (health === '1') {
        const response = {
          ok: true,
          uptimeMs: Date.now() - startTime
        }
        
        // Add rate limit headers
        addRateLimitHeaders(res as any, req as any, 'scan_receipt')
        
        // Send success response
        sendSuccessResponse(res as any, response, 200, ctx)
        return
      }
      
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

    // Check if OCR is configured
    const ocrConfigured = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ''

    let result: ScanReceiptResponse

    if (ocrConfigured) {
      // Use real OCR
      console.log('[scan_api] Using OpenAI OCR processing')
      try {
        // Read file as buffer for OpenAI processing
        const imageBuffer = await fs.readFile(file.filepath)
        console.log(`[scan_api] File read successfully, size: ${imageBuffer.length} bytes`)
        
        // Add timeout to OpenAI processing
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI API timeout after 30 seconds')), 30000)
        )
        
        const ocrPromise = processWithOpenAI(imageBuffer, file.mimetype)
        result = await Promise.race([ocrPromise, timeoutPromise])
        
        console.log(`[scan_api] OpenAI OCR processing completed - ${result.items.length} items extracted`)
      } catch (ocrError) {
        console.error('[scan_api] OCR processing failed:', ocrError)
        // Fall back to dev data if OCR fails
        result = getDEVFallback()
      }
    } else {
      // DEV fallback
      console.log('[scan_api] Using DEV fallback (OCR not configured)')
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