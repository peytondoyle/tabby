import { VercelRequest, VercelResponse } from '@vercel/node'

interface OcrItem {
  name: string
  price: number
  quantity?: number
}

interface OcrResult {
  success: boolean
  items: OcrItem[]
  subtotal?: number
  tax?: number
  tip?: number
  total?: number
  confidence: number
  error?: string
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { imageData, imageType } = req.body

    if (!imageData) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image data provided',
        items: [],
        confidence: 0
      })
    }

    // TODO: Replace with actual Google Vision API integration
    // For now, return mock OCR results
    const mockResult: OcrResult = {
      success: true,
      items: [
        { name: 'Margherita Pizza', price: 18.00 },
        { name: 'Caesar Salad', price: 12.00 },
        { name: 'Craft Beer', price: 6.00 },
        { name: 'Tiramisu', price: 8.00 }
      ],
      subtotal: 44.00,
      tax: 3.52,
      tip: 8.80,
      total: 56.32,
      confidence: 0.85
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500))

    res.status(200).json(mockResult)
  } catch (error) {
    console.error('OCR processing error:', error)
    res.status(500).json({ 
      success: false,
      error: 'OCR processing failed',
      items: [],
      confidence: 0
    })
  }
}