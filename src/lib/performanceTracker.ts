/**
 * Performance Tracking Utility
 * 
 * Tracks performance metrics for virtualization and device-aware optimizations
 * to validate the effectiveness of our performance improvements.
 */

import { deviceDetector, DeviceCapabilities } from './deviceCapabilities'

export interface VirtualizationMetrics {
  listType: string
  itemCount: number
  deviceCapabilities: DeviceCapabilities
  renderTime: number
  scrollPerformance: number
  memoryUsage: number
  cacheHitRate?: number
  errorCount?: number
  timestamp: number
}

export interface PerformanceMetrics {
  componentName: string
  mountTime: number
  renderTime: number
  memoryUsage: number
  deviceCapabilities: DeviceCapabilities
  timestamp: number
}

class VirtualizationPerformanceTracker {
  private metrics: VirtualizationMetrics[] = []
  private maxMetrics = 100 // Keep last 100 metrics
  
  /**
   * Track virtualization performance metrics
   */
  trackVirtualizationMetrics(metrics: Omit<VirtualizationMetrics, 'timestamp'>): void {
    const fullMetrics: VirtualizationMetrics = {
      ...metrics,
      timestamp: Date.now()
    }
    
    this.metrics.push(fullMetrics)
    
    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
    
    console.log('[performance] Virtualization metrics:', fullMetrics)
    
    // Send to analytics if available
    this.sendToAnalytics('virtualization_performance', fullMetrics)
  }
  
  /**
   * Track general performance metrics
   */
  trackPerformanceMetrics(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const fullMetrics: PerformanceMetrics = {
      ...metrics,
      timestamp: Date.now()
    }
    
    console.log('[performance] Component metrics:', fullMetrics)
    
    // Send to analytics if available
    this.sendToAnalytics('component_performance', fullMetrics)
  }
  
  /**
   * Track memory usage
   */
  trackMemoryUsage(componentName: string): number {
    const memory = this.getMemoryUsage()
    
    this.trackPerformanceMetrics({
      componentName,
      mountTime: 0,
      renderTime: 0,
      memoryUsage: memory,
      deviceCapabilities: deviceDetector.detect()
    })
    
    return memory
  }
  
  /**
   * Track render time for a component
   */
  trackRenderTime(componentName: string, renderTime: number): void {
    this.trackPerformanceMetrics({
      componentName,
      mountTime: 0,
      renderTime,
      memoryUsage: this.getMemoryUsage(),
      deviceCapabilities: deviceDetector.detect()
    })
  }
  
  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return memory ? memory.usedJSHeapSize : 0
    }
    return 0
  }
  
  /**
   * Send metrics to analytics
   */
  private sendToAnalytics(eventName: string, data: any): void {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, {
        list_type: data.listType,
        item_count: data.itemCount,
        device_cores: data.deviceCapabilities?.cores,
        device_memory: data.deviceCapabilities?.memory,
        processing_power: data.deviceCapabilities?.processingPower,
        is_mobile: data.deviceCapabilities?.isMobile,
        render_time: data.renderTime,
        memory_usage: data.memoryUsage,
        cache_hit_rate: data.cacheHitRate,
        error_count: data.errorCount
      })
    }
  }
  
  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageRenderTime: number
    averageMemoryUsage: number
    deviceBreakdown: Record<string, number>
    errorRate: number
  } {
    if (this.metrics.length === 0) {
      return {
        averageRenderTime: 0,
        averageMemoryUsage: 0,
        deviceBreakdown: {},
        errorRate: 0
      }
    }
    
    const totalRenderTime = this.metrics.reduce((sum, m) => sum + m.renderTime, 0)
    const totalMemoryUsage = this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0)
    const totalErrors = this.metrics.reduce((sum, m) => sum + (m.errorCount || 0), 0)
    
    const deviceBreakdown = this.metrics.reduce((acc, m) => {
      const power = m.deviceCapabilities.processingPower
      acc[power] = (acc[power] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      averageRenderTime: totalRenderTime / this.metrics.length,
      averageMemoryUsage: totalMemoryUsage / this.metrics.length,
      deviceBreakdown,
      errorRate: totalErrors / this.metrics.length
    }
  }
  
  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = []
  }
}

// Singleton instance
export const performanceTracker = new VirtualizationPerformanceTracker()

// Performance monitoring hooks
export const usePerformanceTracking = (componentName: string) => {
  const startTime = performance.now()
  const startMemory = performanceTracker.trackMemoryUsage(componentName)
  
  return {
    trackRender: () => {
      const renderTime = performance.now() - startTime
      performanceTracker.trackRenderTime(componentName, renderTime)
    },
    
    trackVirtualization: (metrics: Omit<VirtualizationMetrics, 'timestamp' | 'deviceCapabilities'>) => {
      performanceTracker.trackVirtualizationMetrics({
        ...metrics,
        deviceCapabilities: deviceDetector.detect()
      })
    }
  }
}

// Performance observer for automatic tracking
export const createPerformanceObserver = () => {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return null
  }
  
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'measure') {
        performanceTracker.trackRenderTime(entry.name, entry.duration)
      }
    })
  })
  
  observer.observe({ entryTypes: ['measure'] })
  
  return observer
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  createPerformanceObserver()
}
