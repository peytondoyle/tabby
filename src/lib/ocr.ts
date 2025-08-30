export interface OcrItem {
  name: string
  price: number
  quantity?: number
}

export interface OcrResult {
  success: boolean
  items: OcrItem[]
  subtotal?: number
  tax?: number
  tip?: number
  total?: number
  confidence: number
  error?: string
}

export async function processReceiptOcr(file: File): Promise<OcrResult> {
  try {
    // Convert file to base64
    const base64Data = await fileToBase64(file)
    
    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: base64Data,
        imageType: file.type
      })
    })

    if (!response.ok) {
      throw new Error(`OCR API error: ${response.statusText}`)
    }

    const result: OcrResult = await response.json()
    return result
  } catch (error) {
    console.error('OCR processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      items: [],
      confidence: 0
    }
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}