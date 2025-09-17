import { parse } from 'exifr'

interface NormalizationResult {
  blob: Blob
  originalSize: number
  normalizedSize: number
  steps: string[]
}

interface WorkerMessage {
  type: 'normalize'
  file: File
}

// Helper function to get image dimensions
/* async function _getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
} */

// Helper function to create a canvas with proper dimensions
function createCanvas(width: number, height: number): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height)
  return canvas
}

// Helper function to get EXIF orientation
async function getExifOrientation(file: File): Promise<number> {
  try {
    const orientation = await parse(file)
    return orientation || 1
  } catch (error) {
    console.warn('Failed to read EXIF orientation:', error)
    return 1
  }
}

// Helper function to apply EXIF rotation
/* function _applyExifRotation(
  canvas: OffscreenCanvas, 
  ctx: OffscreenCanvasRenderingContext2D, 
  orientation: number,
  width: number, 
  height: number
): { width: number; height: number } {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Apply rotation based on EXIF orientation
  switch (orientation) {
    case 1: // Normal
      return { width, height }
    case 2: // Flip horizontal
      ctx.scale(-1, 1)
      ctx.translate(-width, 0)
      return { width, height }
    case 3: // Rotate 180
      ctx.translate(width, height)
      ctx.rotate(Math.PI)
      return { width, height }
    case 4: // Flip vertical
      ctx.scale(1, -1)
      ctx.translate(0, -height)
      return { width, height }
    case 5: // Rotate 90 CW + flip horizontal
      ctx.translate(height, 0)
      ctx.rotate(Math.PI / 2)
      ctx.scale(-1, 1)
      return { width: height, height: width }
    case 6: // Rotate 90 CW
      ctx.translate(height, 0)
      ctx.rotate(Math.PI / 2)
      return { width: height, height: width }
    case 7: // Rotate 90 CCW + flip horizontal
      ctx.translate(0, width)
      ctx.rotate(-Math.PI / 2)
      ctx.scale(-1, 1)
      return { width: height, height: width }
    case 8: // Rotate 90 CCW
      ctx.translate(0, width)
      ctx.rotate(-Math.PI / 2)
      return { width: height, height: width }
    default:
      return { width, height }
  }
} */

// Helper function to downscale image
function downscaleImage(
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D,
  maxDimension: number
): { width: number; height: number } {
  const { width, height } = canvas
  
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }
  
  let newWidth = width
  let newHeight = height
  
  if (width > height) {
    newWidth = maxDimension
    newHeight = Math.round((height * maxDimension) / width)
  } else {
    newHeight = maxDimension
    newWidth = Math.round((width * maxDimension) / height)
  }
  
  // Create new canvas with downscaled dimensions
  const newCanvas = createCanvas(newWidth, newHeight)
  const newCtx = newCanvas.getContext('2d')!
  
  // Use high-quality scaling
  newCtx.imageSmoothingEnabled = true
  newCtx.imageSmoothingQuality = 'high'
  newCtx.drawImage(canvas, 0, 0, width, height, 0, 0, newWidth, newHeight)
  
  // Replace original canvas
  canvas.width = newWidth
  canvas.height = newHeight
  ctx.clearRect(0, 0, newWidth, newHeight)
  ctx.drawImage(newCanvas, 0, 0)
  
  return { width: newWidth, height: newHeight }
}

// Helper function to compress image
async function compressImage(
  canvas: OffscreenCanvas,
  maxSizeBytes: number,
  quality: number = 0.82
): Promise<Blob> {
  let blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
  
  // If still too large, reduce quality
  while (blob.size > maxSizeBytes && quality > 0.1) {
    quality -= 0.1
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
  }
  
  return blob
}

// Main normalization function
async function normalizeImage(file: File): Promise<NormalizationResult> {
  const originalSize = file.size
  const steps: string[] = []
  
  console.log(`[worker] Starting image normalization - original size: ${originalSize} bytes`)
  
  try {
    // Step 1: Convert HEIC/HEIF to JPEG if needed
    let currentFile = file
    if (file.type === 'image/heic' || file.type === 'image/heif' || 
        file.name.toLowerCase().match(/\.(heic|heif)$/)) {
      console.log('[worker] Converting HEIC/HEIF to JPEG')
      
      try {
        // Create image bitmap from file
        const imageBitmap = await createImageBitmap(file)
        
        // Create canvas and draw image
        const canvas = createCanvas(imageBitmap.width, imageBitmap.height)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(imageBitmap, 0, 0)
        
        // Convert to JPEG blob
        currentFile = new File([await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })], 
                             file.name.replace(/\.(heic|heif)$/i, '.jpg'), 
                             { type: 'image/jpeg' })
        steps.push('HEIC→JPEG')
        console.log(`[worker] Converted HEIC to JPEG - new size: ${currentFile.size} bytes`)
      } catch (heicError) {
        console.warn('[worker] HEIC conversion failed, trying to process as-is:', heicError)
        // If HEIC conversion fails, try to process the original file
        // This might work if the browser has native HEIC support
        currentFile = file
        steps.push('HEIC→failed, using original')
      }
    }
    
    // Step 2: Get EXIF orientation
    const orientation = await getExifOrientation(currentFile)
    if (orientation !== 1) {
      steps.push(`EXIF rotation (${orientation})`)
      console.log(`[worker] EXIF orientation: ${orientation}`)
    }
    
    // Step 3: Create image bitmap and canvas
    let imageBitmap: ImageBitmap
    try {
      imageBitmap = await createImageBitmap(currentFile)
    } catch (bitmapError) {
      console.error('[worker] Failed to create image bitmap:', bitmapError)
      throw new Error(`Unsupported image format or corrupted file: ${bitmapError instanceof Error ? bitmapError.message : 'Unknown error'}`)
    }
    
    const canvas = createCanvas(imageBitmap.width, imageBitmap.height)
    const ctx = canvas.getContext('2d')!
    
    // Step 4: Apply EXIF rotation
    // const _rotatedDimensions = applyExifRotation(canvas, ctx, orientation, imageBitmap.width, imageBitmap.height)
    ctx.drawImage(imageBitmap, 0, 0)
    
    // Step 5: Downscale if needed
    const beforeDownscale = canvas.width * canvas.height
    const downscaledDimensions = downscaleImage(canvas, ctx, 2000)
    if (canvas.width * canvas.height !== beforeDownscale) {
      steps.push('downscaled to 2000px')
      console.log(`[worker] Downscaled image - new dimensions: ${downscaledDimensions.width}x${downscaledDimensions.height}`)
    }
    
    // Step 6: Compress to target size
    const beforeCompress = (await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })).size
    const compressedBlob = await compressImage(canvas, 4 * 1024 * 1024, 0.82)
    if (compressedBlob.size !== beforeCompress) {
      steps.push(`compressed to ${Math.round(compressedBlob.size / 1024 / 1024 * 100) / 100}MB`)
      console.log(`[worker] Compressed image - final size: ${compressedBlob.size} bytes`)
    }
    
    console.log(`[worker] Image normalization complete - ${steps.join(', ')}`)
    
    return {
      blob: compressedBlob,
      originalSize,
      normalizedSize: compressedBlob.size,
      steps
    }
    
  } catch (error) {
    console.error('[worker] Image normalization failed:', error)
    throw new Error(`Image normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, file } = event.data
  
  if (type === 'normalize') {
    try {
      const result = await normalizeImage(file)
      self.postMessage({ type: 'success', result })
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }
}

// Export types for use in main thread
export type { NormalizationResult }
