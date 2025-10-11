/**
 * Performance monitoring for AI scanning operations
 */

interface PerformanceMetrics {
  imageProcessing: number
  apiLatency: number
  totalTime: number
  cacheHitRate: number
  errorRate: number
  fileSize: number
  normalizedSize: number
  compressionRatio: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    imageProcessing: 0,
    apiLatency: 0,
    totalTime: 0,
    cacheHitRate: 0,
    errorRate: 0,
    fileSize: 0,
    normalizedSize: 0,
    compressionRatio: 0
  }

  private startTime: number = 0
  private imageProcessingStart: number = 0
  private apiStart: number = 0

  start() {
    this.startTime = performance.now()
    console.log('[performance] Starting scan operation')
  }

  startImageProcessing() {
    this.imageProcessingStart = performance.now()
    console.log('[performance] Starting image processing')
  }

  endImageProcessing(originalSize: number, normalizedSize: number) {
    this.metrics.imageProcessing = performance.now() - this.imageProcessingStart
    this.metrics.fileSize = originalSize
    this.metrics.normalizedSize = normalizedSize
    this.metrics.compressionRatio = originalSize / normalizedSize
    
    console.log(`[performance] Image processing completed in ${this.metrics.imageProcessing.toFixed(0)}ms`)
    console.log(`[performance] File size: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(normalizedSize / 1024 / 1024).toFixed(2)}MB (${this.metrics.compressionRatio.toFixed(1)}x compression)`)
  }

  startApiCall() {
    this.apiStart = performance.now()
    console.log('[performance] Starting API call')
  }

  endApiCall() {
    this.metrics.apiLatency = performance.now() - this.apiStart
    console.log(`[performance] API call completed in ${this.metrics.apiLatency.toFixed(0)}ms`)
  }

  end(success: boolean = true) {
    this.metrics.totalTime = performance.now() - this.startTime
    this.metrics.errorRate = success ? 0 : 1
    
    console.log(`[performance] Total scan time: ${this.metrics.totalTime.toFixed(0)}ms`)
    console.log(`[performance] Breakdown:`)
    console.log(`  - Image processing: ${this.metrics.imageProcessing.toFixed(0)}ms (${((this.metrics.imageProcessing / this.metrics.totalTime) * 100).toFixed(1)}%)`)
    console.log(`  - API latency: ${this.metrics.apiLatency.toFixed(0)}ms (${((this.metrics.apiLatency / this.metrics.totalTime) * 100).toFixed(1)}%)`)
    console.log(`  - Other: ${(this.metrics.totalTime - this.metrics.imageProcessing - this.metrics.apiLatency).toFixed(0)}ms`)
    
    // Log to analytics service if available
    this.logToAnalytics()
  }

  private logToAnalytics() {
    // Send metrics to analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'scan_performance', {
        event_category: 'performance',
        event_label: 'ai_scanning',
        value: Math.round(this.metrics.totalTime),
        custom_map: {
          image_processing_time: Math.round(this.metrics.imageProcessing),
          api_latency: Math.round(this.metrics.apiLatency),
          compression_ratio: Math.round(this.metrics.compressionRatio * 10) / 10,
          file_size_mb: Math.round(this.metrics.fileSize / 1024 / 1024 * 100) / 100
        }
      })
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Helper function to measure async operations
export async function measureAsync<T>(
  operation: () => Promise<T>,
  label: string
): Promise<T> {
  const start = performance.now()
  try {
    const result = await operation()
    const duration = performance.now() - start
    console.log(`[performance] ${label} completed in ${duration.toFixed(0)}ms`)
    return result
  } catch (error) {
    const duration = performance.now() - start
    console.log(`[performance] ${label} failed after ${duration.toFixed(0)}ms`)
    throw error
  }
}

export type { PerformanceMetrics }
