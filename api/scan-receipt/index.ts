import { VercelRequest, VercelResponse } from '@vercel/node'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'
import { createClient } from '@supabase/supabase-js'

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

// Real OCR processing (placeholder for Google Vision, AWS Textract, etc.)
async function processWithOCR(filePath: string): Promise<ScanReceiptResponse> {
  // In production, this would:
  // 1. Read the file buffer
  // 2. Call external OCR service (Google Vision API, AWS Textract, etc.)
  // 3. Parse the OCR text to extract structured data
  
  // For now, read file to validate it exists and return structured mock data
  try {
    await fs.access(filePath)
    console.log(`[scan_api] OCR processing file: ${filePath}`)
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Return more realistic receipt data
    return {
      place: "Chick-fil-A Store #02849",
      date: "2025-08-29",
      subtotal: 22.85,
      tax: 1.37,
      tip: 0,
      total: 24.22,
      rawText: `
        Chick-fil-A
        Store #02849  
        Richmond, VA 23230
        8/29/2025 9:39 AM
        
        Cobb Salad w/ Nuggets                $9.95
        Medium Waffle Fries                  $2.75
        Chick-fil-A Deluxe Meal             $10.15
        
        Subtotal                            $22.85
        Tax                                  $1.37
        Total                               $24.22
      `.trim(),
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
): Promise<void> {
  const requestStart = Date.now()
  const method = req.method || 'UNKNOWN'
  const queryRedacted = redactQuery(req.query)
  
  console.log(`[scan_api] ${method} ${req.url} query=${queryRedacted}`)

  // Set CORS headers - widened to include GET, POST, OPTIONS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  try {
    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
      const duration = Date.now() - requestStart
      console.log(`[scan_api] OPTIONS completed in ${duration}ms`)
      return res.status(200).end()
    }

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

    // Check if OCR is configured (placeholder for real env check)
    const ocrConfigured = process.env.OCR_ENABLED === 'true' || 
                         process.env.GOOGLE_VISION_API_KEY || 
                         process.env.AWS_TEXTRACT_ENABLED

    let result: ScanReceiptResponse

    if (ocrConfigured) {
      // Use real OCR
      console.log('[scan_api] Using OCR processing')
      result = await processWithOCR(file.filepath)
      console.log(`[scan_api] OCR processing completed - ${result.items.length} items extracted`)
    } else {
      // DEV fallback
      console.log('[scan_api] Using DEV fallback (OCR not configured)')
      result = getDEVFallback()
    }

    const duration = Date.now() - requestStart
    console.log(`[scan_api] Receipt processing successful in ${duration}ms - items: ${result.items.length}, place: ${!!result.place}`)
    
    res.status(200).json(result)

  } catch (error) {
    const duration = Date.now() - requestStart
    console.error(`[scan_api] Receipt processing error in ${duration}ms:`, error)
    
    // Always return fallback data even on error
    const fallback = getDEVFallback()
    res.status(500).json({
      error: 'Receipt processing failed',
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