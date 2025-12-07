
interface NormalizedFile {
  file: File
  originalSize: number
  normalizedSize: number
  transformations: string[]
}

class ImageNormalizerWorker {
  private worker: Worker | null = null
  private pendingOperations = new Map<string, {
    resolve: (result: NormalizedFile) => void
    reject: (error: Error) => void
    timeout: ReturnType<typeof setTimeout>
  }>()
  private operationCounter = 0

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL('../workers/imageNormalizer.worker.ts', import.meta.url),
        { type: 'module' }
      )

      this.worker.onmessage = (event) => {
        const { type, result, error, operationId } = event.data

        // Find the pending operation by ID (fixes race condition)
        const pending = this.pendingOperations.get(operationId)
        if (!pending) {
          console.warn('[imageNormalizer] Received response for unknown operation:', operationId)
          return
        }

        // Clear timeout
        clearTimeout(pending.timeout)

        if (type === 'success') {
          const normalizedFile: NormalizedFile = {
            file: new File([result.blob], 'normalized.jpg', { type: 'image/jpeg' }),
            originalSize: result.originalSize,
            normalizedSize: result.normalizedSize,
            transformations: result.steps
          }
          pending.resolve(normalizedFile)
        } else if (type === 'error') {
          pending.reject(new Error(error))
        }

        this.pendingOperations.delete(operationId)
      }

      this.worker.onerror = (error) => {
        console.error('[imageNormalizer] Worker error:', error)
        // Reject all pending operations on worker crash
        for (const [id, pending] of this.pendingOperations) {
          clearTimeout(pending.timeout)
          pending.reject(new Error(`Worker error: ${error.message || 'Unknown worker error'}`))
        }
        this.pendingOperations.clear()
        // Terminate and recreate worker on next use
        this.worker?.terminate()
        this.worker = null
      }
    }

    return this.worker
  }

  async normalizeFile(file: File): Promise<NormalizedFile> {
    return new Promise((resolve, reject) => {
      // Generate unique operation ID to prevent race conditions
      const operationId = `op-${++this.operationCounter}-${Date.now()}`

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        this.pendingOperations.delete(operationId)
        reject(new Error('Image normalization timeout'))
      }, 30000) // 30 second timeout

      this.pendingOperations.set(operationId, { resolve, reject, timeout })

      try {
        // Pass operation ID to worker so it can return it with response
        this.getWorker().postMessage({
          type: 'normalize',
          file,
          operationId
        })
      } catch (error) {
        clearTimeout(timeout)
        this.pendingOperations.delete(operationId)

        // If worker fails, try to handle HEIC files directly
        if (file.type === 'image/heic' || file.type === 'image/heif' ||
            file.name.toLowerCase().match(/\.(heic|heif)$/)) {
          console.warn('[imageNormalizer] Worker failed for HEIC, trying direct conversion')
          this.handleHeicDirectly(file).then(resolve).catch(reject)
        } else {
          reject(error instanceof Error ? error : new Error('Failed to start normalization'))
        }
      }
    })
  }

  private async handleHeicDirectly(file: File): Promise<NormalizedFile> {
    try {
      // Try to create image bitmap directly
      const imageBitmap = await createImageBitmap(file)
      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(imageBitmap, 0, 0)
      
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
      const normalizedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
      
      return {
        file: normalizedFile,
        originalSize: file.size,
        normalizedSize: blob.size,
        transformations: ['HEIC→JPEG (direct)']
      }
    } catch (error) {
      throw new Error(`HEIC conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.pendingOperations.clear()
  }
}

// Singleton instance
const imageNormalizer = new ImageNormalizerWorker()

export async function normalizeFile(file: File): Promise<NormalizedFile> {
  return imageNormalizer.normalizeFile(file)
}

export function terminateImageNormalizer() {
  imageNormalizer.terminate()
}

export type { NormalizedFile }
