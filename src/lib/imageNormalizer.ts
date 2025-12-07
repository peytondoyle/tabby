
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
  }>()

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL('../workers/imageNormalizer.worker.ts', import.meta.url),
        { type: 'module' }
      )
      
      this.worker.onmessage = (event) => {
        const { type, result, error } = event.data
        
        if (type === 'success') {
          // Find the pending operation (we'll use a simple approach for now)
          const pending = Array.from(this.pendingOperations.values())[0]
          if (pending) {
            // Clear timeout
            if ((pending as any).timeout) {
              clearTimeout((pending as any).timeout)
            }
            
            const normalizedFile: NormalizedFile = {
              file: new File([result.blob], 'normalized.jpg', { type: 'image/jpeg' }),
              originalSize: result.originalSize,
              normalizedSize: result.normalizedSize,
              transformations: result.steps
            }
            pending.resolve(normalizedFile)
            this.pendingOperations.clear()
          }
        } else if (type === 'error') {
          const pending = Array.from(this.pendingOperations.values())[0]
          if (pending) {
            // Clear timeout
            if ((pending as any).timeout) {
              clearTimeout((pending as any).timeout)
            }
            
            pending.reject(new Error(error))
            this.pendingOperations.clear()
          }
        }
      }
      
      this.worker.onerror = (error) => {
        console.error('[imageNormalizer] Worker error:', error)
        const pending = Array.from(this.pendingOperations.values())[0]
        if (pending) {
          // Clear timeout
          if ((pending as any).timeout) {
            clearTimeout((pending as any).timeout)
          }
          
          pending.reject(new Error(`Worker error: ${error.message || 'Unknown worker error'}`))
          this.pendingOperations.clear()
        }
      }
    }
    
    return this.worker
  }

  async normalizeFile(file: File): Promise<NormalizedFile> {
    return new Promise((resolve, reject) => {
      const operationId = Math.random().toString(36)
      
      this.pendingOperations.set(operationId, { resolve, reject })
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        this.pendingOperations.delete(operationId)
        reject(new Error('Image normalization timeout'))
      }, 30000) // 30 second timeout
      
      try {
        this.getWorker().postMessage({
          type: 'normalize',
          file
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
      
      // Store timeout with the operation so we can clear it on success/error
      const operation = this.pendingOperations.get(operationId)
      if (operation) {
        (operation as any).timeout = timeout
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
