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
  operationId: string
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

// Helper function to apply EXIF rotation - draws image with correct orientation
function applyExifRotation(
  imageBitmap: ImageBitmap,
  orientation: number
): { canvas: OffscreenCanvas; width: number; height: number } {
  const width = imageBitmap.width
  const height = imageBitmap.height

  // Orientations 5-8 swap width and height
  const swapDimensions = orientation >= 5 && orientation <= 8
  const canvasWidth = swapDimensions ? height : width
  const canvasHeight = swapDimensions ? width : height

  const canvas = createCanvas(canvasWidth, canvasHeight)
  const ctx = canvas.getContext('2d')!

  // Apply transformation based on EXIF orientation
  switch (orientation) {
    case 1: // Normal - no transformation needed
      break
    case 2: // Flip horizontal
      ctx.scale(-1, 1)
      ctx.translate(-canvasWidth, 0)
      break
    case 3: // Rotate 180
      ctx.translate(canvasWidth, canvasHeight)
      ctx.rotate(Math.PI)
      break
    case 4: // Flip vertical
      ctx.scale(1, -1)
      ctx.translate(0, -canvasHeight)
      break
    case 5: // Rotate 90 CW + flip horizontal
      ctx.translate(canvasWidth, 0)
      ctx.rotate(Math.PI / 2)
      ctx.scale(-1, 1)
      break
    case 6: // Rotate 90 CW
      ctx.translate(canvasWidth, 0)
      ctx.rotate(Math.PI / 2)
      break
    case 7: // Rotate 90 CCW + flip horizontal
      ctx.translate(0, canvasHeight)
      ctx.rotate(-Math.PI / 2)
      ctx.scale(-1, 1)
      break
    case 8: // Rotate 90 CCW
      ctx.translate(0, canvasHeight)
      ctx.rotate(-Math.PI / 2)
      break
  }

  // Draw the image with the applied transformation
  ctx.drawImage(imageBitmap, 0, 0)

  return { canvas, width: canvasWidth, height: canvasHeight }
}

// #9: Simple skew detection using edge analysis
// Returns rotation angle in degrees (-45 to 45)
function detectSkewAngle(
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D
): number {
  try {
    const width = canvas.width;
    const height = canvas.height;

    // Sample a smaller region for performance (center of image)
    const sampleWidth = Math.min(800, width);
    const sampleHeight = Math.min(800, height);
    const startX = Math.floor((width - sampleWidth) / 2);
    const startY = Math.floor((height - sampleHeight) / 2);

    const imageData = ctx.getImageData(startX, startY, sampleWidth, sampleHeight);
    const data = imageData.data;

    // Convert to grayscale and find horizontal edges
    const edges: Array<{ x: number; y: number }> = [];

    for (let y = 1; y < sampleHeight - 1; y++) {
      for (let x = 1; x < sampleWidth - 1; x++) {
        const idx = (y * sampleWidth + x) * 4;
        const idxAbove = ((y - 1) * sampleWidth + x) * 4;
        const idxBelow = ((y + 1) * sampleWidth + x) * 4;

        // Get grayscale values
        const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const above = (data[idxAbove] + data[idxAbove + 1] + data[idxAbove + 2]) / 3;
        const below = (data[idxBelow] + data[idxBelow + 1] + data[idxBelow + 2]) / 3;

        // Simple Sobel-like vertical edge detection
        const gradient = Math.abs(above - below);

        // Strong horizontal edge (likely text baseline)
        if (gradient > 50) {
          edges.push({ x, y });
        }
      }
    }

    if (edges.length < 100) {
      // Not enough edges to determine skew
      return 0;
    }

    // Use Hough transform-like approach to find dominant line angle
    // Group edges by their approximate angle
    const angleBins: Map<number, number> = new Map();

    for (let i = 0; i < edges.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 50, edges.length); j++) {
        const dx = edges[j].x - edges[i].x;
        const dy = edges[j].y - edges[i].y;

        if (Math.abs(dx) > 20) { // Only consider somewhat horizontal lines
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          // Only consider small angles (receipt shouldn't be rotated more than 15 degrees typically)
          if (Math.abs(angle) < 15) {
            const binAngle = Math.round(angle * 2) / 2; // 0.5 degree bins
            angleBins.set(binAngle, (angleBins.get(binAngle) || 0) + 1);
          }
        }
      }
    }

    // Find the most common angle
    let maxCount = 0;
    let dominantAngle = 0;

    for (const [angle, count] of angleBins.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantAngle = angle;
      }
    }

    // Only correct if we have strong evidence of skew
    if (maxCount < 50 || Math.abs(dominantAngle) < 0.5) {
      return 0;
    }

    console.log(`[worker] Detected skew angle: ${dominantAngle.toFixed(1)}° (confidence: ${maxCount} votes)`);
    return -dominantAngle; // Negative to correct the skew
  } catch (error) {
    console.warn('[worker] Skew detection failed:', error);
    return 0;
  }
}

// Apply rotation to correct skew
function applySkewCorrection(
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D,
  angle: number
): { canvas: OffscreenCanvas; ctx: OffscreenCanvasRenderingContext2D } {
  if (Math.abs(angle) < 0.5) {
    return { canvas, ctx }; // No significant skew
  }

  const radians = angle * (Math.PI / 180);
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));

  // Calculate new dimensions to fit rotated image
  const newWidth = Math.ceil(canvas.width * cos + canvas.height * sin);
  const newHeight = Math.ceil(canvas.height * cos + canvas.width * sin);

  const newCanvas = createCanvas(newWidth, newHeight);
  const newCtx = newCanvas.getContext('2d')!;

  // White background
  newCtx.fillStyle = 'white';
  newCtx.fillRect(0, 0, newWidth, newHeight);

  // Rotate around center
  newCtx.translate(newWidth / 2, newHeight / 2);
  newCtx.rotate(radians);
  newCtx.translate(-canvas.width / 2, -canvas.height / 2);
  newCtx.drawImage(canvas, 0, 0);

  return { canvas: newCanvas, ctx: newCtx };
}

// #7: Image enhancement for better OCR - applies contrast and sharpening
function enhanceImageForOCR(
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D
): boolean {
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Calculate histogram to detect if image needs enhancement
    let minBrightness = 255
    let maxBrightness = 0
    let totalBrightness = 0

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
      minBrightness = Math.min(minBrightness, brightness)
      maxBrightness = Math.max(maxBrightness, brightness)
      totalBrightness += brightness
    }

    const avgBrightness = totalBrightness / (data.length / 4)
    const contrastRange = maxBrightness - minBrightness

    // Only enhance if image has low contrast or is too dark/bright
    const needsEnhancement = contrastRange < 180 || avgBrightness < 80 || avgBrightness > 200

    if (!needsEnhancement) {
      return false
    }

    console.log(`[worker] Enhancing image - contrast range: ${contrastRange}, avg brightness: ${avgBrightness.toFixed(0)}`)

    // Apply contrast stretching (histogram normalization)
    const range = maxBrightness - minBrightness || 1
    const contrastFactor = 255 / range

    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast stretching to each channel
      data[i] = Math.min(255, Math.max(0, (data[i] - minBrightness) * contrastFactor))
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - minBrightness) * contrastFactor))
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - minBrightness) * contrastFactor))
    }

    ctx.putImageData(imageData, 0, 0)

    // Apply simple sharpening using unsharp mask technique
    // We create a slightly blurred version and subtract it
    const tempCanvas = createCanvas(canvas.width, canvas.height)
    const tempCtx = tempCanvas.getContext('2d')!

    // Draw original
    tempCtx.drawImage(canvas, 0, 0)

    // Apply slight blur
    tempCtx.filter = 'blur(1px)'
    tempCtx.drawImage(canvas, 0, 0)

    // Get blurred data
    const blurredData = tempCtx.getImageData(0, 0, canvas.width, canvas.height)
    const blurred = blurredData.data

    // Apply unsharp mask: original + (original - blurred) * amount
    const sharpAmount = 0.3 // Subtle sharpening
    const enhancedData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const enhanced = enhancedData.data

    for (let i = 0; i < enhanced.length; i += 4) {
      enhanced[i] = Math.min(255, Math.max(0, enhanced[i] + (enhanced[i] - blurred[i]) * sharpAmount))
      enhanced[i + 1] = Math.min(255, Math.max(0, enhanced[i + 1] + (enhanced[i + 1] - blurred[i + 1]) * sharpAmount))
      enhanced[i + 2] = Math.min(255, Math.max(0, enhanced[i + 2] + (enhanced[i + 2] - blurred[i + 2]) * sharpAmount))
    }

    ctx.putImageData(enhancedData, 0, 0)

    return true
  } catch (error) {
    console.warn('[worker] Image enhancement failed:', error)
    return false
  }
}

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
  quality: number = 0.92
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
        
        // Convert to JPEG blob with high quality for OCR
        currentFile = new File([await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })],
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
    
    // Step 3: Create image bitmap
    let imageBitmap: ImageBitmap
    try {
      imageBitmap = await createImageBitmap(currentFile)
    } catch (bitmapError) {
      console.error('[worker] Failed to create image bitmap:', bitmapError)
      throw new Error(`Unsupported image format or corrupted file: ${bitmapError instanceof Error ? bitmapError.message : 'Unknown error'}`)
    }

    // Step 4: Apply EXIF rotation (fixes sideways/upside-down photos)
    let canvas: OffscreenCanvas
    let ctx: OffscreenCanvasRenderingContext2D

    if (orientation !== 1) {
      const rotated = applyExifRotation(imageBitmap, orientation)
      canvas = rotated.canvas
      ctx = canvas.getContext('2d')!
      steps.push(`rotated (EXIF ${orientation})`)
      console.log(`[worker] Applied EXIF rotation ${orientation} - new dimensions: ${rotated.width}x${rotated.height}`)
    } else {
      canvas = createCanvas(imageBitmap.width, imageBitmap.height)
      ctx = canvas.getContext('2d')!
      ctx.drawImage(imageBitmap, 0, 0)
    }

    // Step 5: Detect and correct skew (tilted photos)
    const skewAngle = detectSkewAngle(canvas, ctx)
    if (Math.abs(skewAngle) >= 0.5) {
      const corrected = applySkewCorrection(canvas, ctx, skewAngle)
      canvas = corrected.canvas
      ctx = corrected.ctx
      steps.push(`deskewed (${skewAngle.toFixed(1)}°)`)
      console.log(`[worker] Applied skew correction: ${skewAngle.toFixed(1)}°`)
    }

    // Step 6: Enhance image for better OCR (contrast + sharpening)
    const wasEnhanced = enhanceImageForOCR(canvas, ctx)
    if (wasEnhanced) {
      steps.push('enhanced (contrast/sharpen)')
    }

    // Step 7: Downscale if needed (optimized for OCR accuracy)
    const beforeDownscale = canvas.width * canvas.height
    const downscaledDimensions = downscaleImage(canvas, ctx, 2048) // Higher resolution for better OCR text recognition
    if (canvas.width * canvas.height !== beforeDownscale) {
      steps.push(`downscaled to ${downscaledDimensions.width}x${downscaledDimensions.height}`)
      console.log(`[worker] Downscaled image - new dimensions: ${downscaledDimensions.width}x${downscaledDimensions.height}`)
    }

    // Step 8: Compress to target size (optimized for OCR accuracy)
    const beforeCompress = (await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })).size
    const compressedBlob = await compressImage(canvas, 4 * 1024 * 1024, 0.92) // Higher quality for better text clarity
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
  const { type, file, operationId } = event.data

  if (type === 'normalize') {
    try {
      const result = await normalizeImage(file)
      // Include operationId in response for proper request tracking
      self.postMessage({ type: 'success', result, operationId })
    } catch (error) {
      console.error('[worker] Error in worker:', error)
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        operationId
      })
    }
  }
}

// Add global error handler to prevent worker crashes
self.onerror = (error) => {
  console.error('[worker] Global worker error:', error)
  let errorMessage = 'Unknown error'
  if (typeof error === 'string') {
    errorMessage = error
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = (error as any).message || 'Unknown error'
  }
  self.postMessage({
    type: 'error',
    error: 'Worker crashed: ' + errorMessage
  })
}

self.onunhandledrejection = (event) => {
  console.error('[worker] Unhandled promise rejection:', event.reason)
  event.preventDefault()
  self.postMessage({ 
    type: 'error', 
    error: 'Unhandled promise rejection: ' + (event.reason?.message || 'Unknown error')
  })
}

// Export types for use in main thread
export type { NormalizationResult }
