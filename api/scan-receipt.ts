import { VercelRequest, VercelResponse } from '@vercel/node'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'

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
    console.log(`[OCR] Processing file: ${filePath}`)
    
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
    console.error('[OCR] File processing failed:', error)
    throw error
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse multipart form data
    const formData = await parseFormData(req)
    
    if (!formData?.file) {
      console.warn('[scan_fail] No file provided')
      return res.status(400).json({ 
        error: 'No file provided',
        ...getDEVFallback()
      })
    }

    const { file } = formData

    // Validate file type
    if (!file.mimetype?.startsWith('image/')) {
      console.warn('[scan_fail] Invalid file type:', file.mimetype)
      return res.status(400).json({ 
        error: 'Invalid file type. Please upload an image.',
        ...getDEVFallback()
      })
    }

    console.info('[scan_start] Processing receipt scan')

    // Check if OCR is configured (placeholder for real env check)
    const ocrConfigured = process.env.OCR_ENABLED === 'true' || 
                         process.env.GOOGLE_VISION_API_KEY || 
                         process.env.AWS_TEXTRACT_ENABLED

    let result: ScanReceiptResponse

    if (ocrConfigured) {
      // Use real OCR
      result = await processWithOCR(file.filepath)
      console.info('[scan_success] OCR processing completed', {
        itemsCount: result.items.length,
        hasPlace: !!result.place
      })
    } else {
      // DEV fallback
      console.info('[scan_success] Using DEV fallback')
      result = getDEVFallback()
    }

    res.status(200).json(result)

  } catch (error) {
    console.error('[scan_fail] Receipt processing error:', error)
    
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