import { VercelRequest, VercelResponse } from '@vercel/node'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from '../_lib/cors.js'
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

// Real OCR processing with OpenAI or other providers
async function processWithOCR(filePath: string, mimeType?: string): Promise<ScanReceiptResponse> {
  try {
    // Read the file buffer
    const fileBuffer = await fs.readFile(filePath)
    console.log(`[scan_api] OCR processing file: ${filePath}, size: ${fileBuffer.length} bytes`)
    
    // Use OpenAI if configured
    if (isOpenAIConfigured()) {
      console.log('[scan_api] Using OpenAI Vision for OCR')
      return await processWithOpenAI(fileBuffer, mimeType || 'image/jpeg')
    }
    
    // TODO: Add other OCR providers here (Google Vision, AWS Textract, etc.)
    
    // Fallback to mock data if no OCR provider is configured
    console.log('[scan_api] No OCR provider configured, using mock data')
    await new Promise(resolve => setTimeout(resolve, 800))
    
    return {
      place: "Chick-fil-A Store #02849",
      date: "2025-08-29",
      subtotal: 22.85,
      tax: 1.37,
      tip: 0,
      total: 24.22,
      rawText: `Mock receipt (configure OCR provider for real scanning)`,
      items: [
        { label: "Cobb Salad w/ Nuggets", price: 9.95 },
        { label: "Medium Waffle Fries", price: 2.75 },
        { label: "Chick-fil-A Deluxe Meal", price: 10.15 }
      ]
    }
  } catch (error) {
    console.error('[scan_api] OCR file processing failed:', error)
    throw error
  }
}

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

  const requestStart = Date.now()
  const method = req.method || 'UNKNOWN'
  const queryRedacted = redactQuery(req.query)
  
  console.log(`[scan_api] ${method} ${req.url} query=${queryRedacted}`)

  try {

    // Handle GET health check
    if (req.method === 'GET') {
      const { health } = req.query
      
      if (health === '1') {
        const response: HealthResponse = {
          ok: true,
          uptimeMs: Date.now() - startTime
        }
        const duration = Date.now() - requestStart
        console.log(`[scan_api] Health check completed in ${duration}ms - uptime: ${response.uptimeMs}ms`)
        return res.status(200).json(response)
      }
      
      const duration = Date.now() - requestStart
      console.log(`[scan_api] GET without health param completed in ${duration}ms`)
      return res.status(405).json({ error: 'GET method requires ?health=1 parameter' })
    }

    // Handle POST upload
    if (req.method !== 'POST') {
      const duration = Date.now() - requestStart
      console.log(`[scan_api] Method ${method} not allowed, completed in ${duration}ms`)
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Check REQUIRE_REAL_OCR flag
    if (REQUIRE_REAL_OCR && !hasOCRProviders) {
      const duration = Date.now() - requestStart
      console.error(`[scan_api] OCR not configured but required, rejected in ${duration}ms`)
      return res.status(400).json({
        ok: false,
        code: 'OCR_NOT_CONFIGURED',
        message: 'Real OCR scanning is required but no OCR provider keys are configured'
      })
    }

    console.log('[scan_api] Starting receipt processing...')

    // Parse multipart form data
    const formData = await parseFormData(req)
    
    if (!formData?.file) {
      const duration = Date.now() - requestStart
      console.warn(`[scan_api] No file provided, returning fallback in ${duration}ms`)
      return res.status(400).json({ 
        error: 'No file provided',
        ...getDEVFallback()
      })
    }

    const { file } = formData

    // Validate file type
    if (!file.mimetype?.startsWith('image/')) {
      const duration = Date.now() - requestStart
      console.warn(`[scan_api] Invalid file type: ${file.mimetype}, returning fallback in ${duration}ms`)
      return res.status(400).json({ 
        error: 'Invalid file type. Please upload an image.',
        ...getDEVFallback()
      })
    }

    console.log(`[scan_api] Processing image file: ${file.originalFilename} (${file.size} bytes, ${file.mimetype})`)
    
    // Note: supabaseAdmin can be used here for server-side database operations
    // Example: await supabaseAdmin?.from('receipts').insert({ ... })

    // Check if OCR is configured
    const ocrConfigured = process.env.OCR_ENABLED === 'true' || 
                         process.env.GOOGLE_VISION_API_KEY || 
                         process.env.AWS_TEXTRACT_ENABLED ||
                         process.env.OPENAI_API_KEY ||
                         process.env.OCR_SPACE_API_KEY

    let result: ScanReceiptResponse

    if (ocrConfigured) {
      // Use real OCR
      console.log('[scan_api] Using OCR processing')
      result = await processWithOCR(file.filepath, file.mimetype)
      console.log(`[scan_api] OCR processing completed - ${result.items.length} items extracted`)
    } else {
      // DEV fallback
      console.log('[scan_api] Using DEV fallback (OCR not configured)')
      result = getDEVFallback()
    }

    const duration = Date.now() - requestStart
    console.log(`[scan_api] Receipt processing successful in ${duration}ms - items: ${result.items.length}, place: ${!!result.place}`)
    
    res.status(200).json(result)

  } catch (error: any) {
    const duration = Date.now() - requestStart
    console.error(`[scan_api] Receipt processing error in ${duration}ms:`, {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      response: error.response?.data,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    })
    
    // Always return fallback data even on error
    const fallback = getDEVFallback()
    res.status(500).json({
      error: 'Receipt processing failed',
      errorMessage: error.message, // Include error message for debugging
      ...fallback
    })
  }
}

// Configure for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}