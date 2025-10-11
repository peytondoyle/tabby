/**
 * On-device processing for common receipts
 * Uses Web Workers and local AI models for offline processing
 */

interface OnDeviceResult {
  success: boolean
  result?: any
  confidence: number
  processingTime: number
  model: 'on-device' | 'fallback'
  error?: string
}

interface DeviceCapabilities {
  hasWebGL: boolean
  hasWebAssembly: boolean
  hasWebWorkers: boolean
  memoryLimit: number
  processingPower: 'low' | 'medium' | 'high'
}

class OnDeviceProcessor {
  private worker: Worker | null = null
  private capabilities: DeviceCapabilities
  private isInitialized = false
  private modelLoaded = false

  constructor() {
    this.capabilities = this.detectCapabilities()
  }

  private detectCapabilities(): DeviceCapabilities {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    
    return {
      hasWebGL: !!gl,
      hasWebAssembly: typeof WebAssembly !== 'undefined',
      hasWebWorkers: typeof Worker !== 'undefined',
      memoryLimit: this.getMemoryLimit(),
      processingPower: this.getProcessingPower()
    }
  }

  private getMemoryLimit(): number {
    // Estimate available memory
    if ('memory' in performance) {
      return (performance as any).memory?.jsHeapSizeLimit || 1073741824 // 1GB default
    }
    return 1073741824
  }

  private getProcessingPower(): 'low' | 'medium' | 'high' {
    const cores = navigator.hardwareConcurrency || 4
    const memory = this.getMemoryLimit()
    
    if (cores >= 8 && memory >= 4294967296) return 'high' // 4GB+
    if (cores >= 4 && memory >= 2147483648) return 'medium' // 2GB+
    return 'low'
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true
    
    try {
      // Check if device can handle on-device processing
      if (!this.canProcessOnDevice()) {
        console.log('[on_device] Device not capable of on-device processing')
        return false
      }

      // Initialize Web Worker
      this.worker = new Worker('/workers/receipt-processor.worker.js')
      
      // Load model
      await this.loadModel()
      
      this.isInitialized = true
      console.log('[on_device] On-device processor initialized')
      return true
      
    } catch (error) {
      console.error('[on_device] Initialization failed:', error)
      return false
    }
  }

  private canProcessOnDevice(): boolean {
    return (
      this.capabilities.hasWebWorkers &&
      this.capabilities.hasWebAssembly &&
      this.capabilities.processingPower !== 'low'
    )
  }

  private async loadModel(): Promise<void> {
    if (this.modelLoaded) return
    
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Model loading timeout'))
      }, 30000)

      this.worker.onmessage = (event) => {
        if (event.data.type === 'model_loaded') {
          clearTimeout(timeout)
          this.modelLoaded = true
          resolve()
        } else if (event.data.type === 'model_error') {
          clearTimeout(timeout)
          reject(new Error(event.data.error))
        }
      }

      this.worker.postMessage({ type: 'load_model' })
    })
  }

  async processReceipt(imageData: ImageData): Promise<OnDeviceResult> {
    const startTime = Date.now()
    
    if (!this.isInitialized || !this.modelLoaded) {
      return {
        success: false,
        confidence: 0,
        processingTime: Date.now() - startTime,
        model: 'fallback',
        error: 'Processor not initialized'
      }
    }

    try {
      const result = await this.processWithWorker(imageData)
      const processingTime = Date.now() - startTime
      
      return {
        success: true,
        result,
        confidence: result.confidence || 0.8,
        processingTime,
        model: 'on-device'
      }
      
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        processingTime: Date.now() - startTime,
        model: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private processWithWorker(imageData: ImageData): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Processing timeout'))
      }, 10000)

      this.worker.onmessage = (event) => {
        if (event.data.type === 'processing_complete') {
          clearTimeout(timeout)
          resolve(event.data.result)
        } else if (event.data.type === 'processing_error') {
          clearTimeout(timeout)
          reject(new Error(event.data.error))
        }
      }

      this.worker.postMessage({
        type: 'process_receipt',
        imageData
      })
    })
  }

  // Check if receipt is suitable for on-device processing
  isSuitableForOnDevice(receiptData: any): boolean {
    // Simple heuristics for on-device processing
    const itemCount = receiptData.items?.length || 0
    const hasComplexFormatting = receiptData.rawText?.includes('$') || false
    const isCommonFormat = this.isCommonReceiptFormat(receiptData)
    
    return (
      itemCount <= 10 && // Simple receipts only
      hasComplexFormatting &&
      isCommonFormat &&
      this.capabilities.processingPower !== 'low'
    )
  }

  private isCommonReceiptFormat(receiptData: any): boolean {
    const commonVenues = [
      'mcdonalds', 'burger king', 'subway', 'starbucks', 'dunkin',
      'chick-fil-a', 'taco bell', 'kfc', 'pizza hut', 'dominos'
    ]
    
    const venue = receiptData.venue?.name?.toLowerCase() || ''
    return commonVenues.some(commonVenue => venue.includes(commonVenue))
  }

  // Get device capabilities
  getCapabilities(): DeviceCapabilities {
    return { ...this.capabilities }
  }

  // Cleanup
  destroy(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.isInitialized = false
    this.modelLoaded = false
  }
}

// Web Worker for receipt processing
const createReceiptProcessorWorker = () => {
  // This would be in a separate worker file
  const workerCode = `
    let model = null;
    
    self.onmessage = async function(event) {
      const { type, data } = event.data;
      
      switch (type) {
        case 'load_model':
          try {
            // Load TensorFlow.js model for receipt processing
            // This is a simplified example
            model = {
              process: (imageData) => {
                // Simulate model processing
                return {
                  place: 'Sample Restaurant',
                  items: [
                    { label: 'Burger', price: 8.99 },
                    { label: 'Fries', price: 3.99 }
                  ],
                  total: 12.98,
                  confidence: 0.85
                };
              }
            };
            
            self.postMessage({ type: 'model_loaded' });
          } catch (error) {
            self.postMessage({ type: 'model_error', error: error.message });
          }
          break;
          
        case 'process_receipt':
          try {
            if (!model) {
              throw new Error('Model not loaded');
            }
            
            const result = model.process(data.imageData);
            self.postMessage({ type: 'processing_complete', result });
          } catch (error) {
            self.postMessage({ type: 'processing_error', error: error.message });
          }
          break;
      }
    };
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' })
  return new Worker(URL.createObjectURL(blob))
}

// Singleton instance
export const onDeviceProcessor = new OnDeviceProcessor()

// Helper function to convert image to ImageData
export function imageToImageData(image: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  
  ctx.drawImage(image, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

// Helper function to determine if we should use on-device processing
export function shouldUseOnDeviceProcessing(
  receiptData: any,
  deviceCapabilities: DeviceCapabilities
): boolean {
  // Check device capabilities
  if (deviceCapabilities.processingPower === 'low') return false
  if (!deviceCapabilities.hasWebWorkers) return false
  
  // Check receipt complexity
  const itemCount = receiptData.items?.length || 0
  if (itemCount > 10) return false
  
  // Check if it's a common format
  const commonVenues = [
    'mcdonalds', 'burger king', 'subway', 'starbucks', 'dunkin'
  ]
  
  const venue = receiptData.venue?.name?.toLowerCase() || ''
  const isCommonVenue = commonVenues.some(v => venue.includes(v))
  
  return isCommonVenue && itemCount <= 5
}
