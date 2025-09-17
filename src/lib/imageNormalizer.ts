
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
            pending.reject(new Error(error))
            this.pendingOperations.clear()
          }
        }
      }
      
      this.worker.onerror = (error) => {
        const pending = Array.from(this.pendingOperations.values())[0]
        if (pending) {
          pending.reject(new Error(`Worker error: ${error.message}`))
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
      
      try {
        this.getWorker().postMessage({
          type: 'normalize',
          file
        })
      } catch (error) {
        this.pendingOperations.delete(operationId)
        reject(error instanceof Error ? error : new Error('Failed to start normalization'))
      }
    })
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
