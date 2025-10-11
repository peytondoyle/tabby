/**
 * Device Capability Detection Utility
 * 
 * Provides comprehensive device capability detection for performance optimization.
 * Used by virtualization components to adapt behavior based on device capabilities.
 */

export interface DeviceCapabilities {
  cores: number
  memory: number
  connection: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'
  processingPower: 'low' | 'medium' | 'high'
  isMobile: boolean
  supportsWebWorkers: boolean
  supportsWebAssembly: boolean
  batteryLevel?: number
  isLowPowerMode?: boolean
}

class DeviceCapabilityDetector {
  private capabilities: DeviceCapabilities | null = null
  private detectionTime: number = 0
  
  /**
   * Detect device capabilities with caching
   */
  detect(): DeviceCapabilities {
    // Return cached result if available and recent (cache for 5 minutes)
    if (this.capabilities && Date.now() - this.detectionTime < 5 * 60 * 1000) {
      return this.capabilities
    }
    
    const cores = navigator.hardwareConcurrency || 4
    const memory = this.getMemoryEstimate()
    const connection = this.getConnectionType()
    const processingPower = this.getProcessingPower(cores, memory)
    const isMobile = this.isMobileDevice()
    const supportsWebWorkers = typeof Worker !== 'undefined'
    const supportsWebAssembly = typeof WebAssembly !== 'undefined'
    const batteryLevel = this.getBatteryLevel()
    const isLowPowerMode = this.isLowPowerMode()
    
    this.capabilities = {
      cores,
      memory,
      connection,
      processingPower,
      isMobile,
      supportsWebWorkers,
      supportsWebAssembly,
      batteryLevel,
      isLowPowerMode
    }
    
    this.detectionTime = Date.now()
    
    console.log('[device_detector] Device capabilities detected:', this.capabilities)
    
    return this.capabilities
  }
  
  /**
   * Get estimated device memory in bytes
   */
  private getMemoryEstimate(): number {
    // Try to get actual memory if available
    if ('memory' in performance) {
      const memory = (performance as any).memory
      if (memory && memory.jsHeapSizeLimit) {
        return memory.jsHeapSizeLimit
      }
    }
    
    // Fallback to device memory API if available
    if ('deviceMemory' in navigator) {
      const deviceMemory = (navigator as any).deviceMemory
      if (deviceMemory) {
        return deviceMemory * 1024 * 1024 * 1024 // Convert GB to bytes
      }
    }
    
    // Conservative fallback based on user agent
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 2 * 1024 * 1024 * 1024 // 2GB for iOS devices
    }
    if (userAgent.includes('android')) {
      return 1.5 * 1024 * 1024 * 1024 // 1.5GB for Android devices
    }
    
    return 4 * 1024 * 1024 * 1024 // 4GB default
  }
  
  /**
   * Get network connection type
   */
  private getConnectionType(): 'slow-2g' | '2g' | '3g' | '4g' | 'unknown' {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection && connection.effectiveType) {
        return connection.effectiveType as 'slow-2g' | '2g' | '3g' | '4g'
      }
    }
    
    return 'unknown'
  }
  
  /**
   * Determine processing power based on cores and memory
   */
  private getProcessingPower(cores: number, memory: number): 'low' | 'medium' | 'high' {
    const memoryGB = memory / (1024 * 1024 * 1024)
    
    // High-end devices: 8+ cores and 4GB+ memory
    if (cores >= 8 && memoryGB >= 4) {
      return 'high'
    }
    
    // Medium devices: 4+ cores and 2GB+ memory
    if (cores >= 4 && memoryGB >= 2) {
      return 'medium'
    }
    
    // Low-end devices: everything else
    return 'low'
  }
  
  /**
   * Detect if device is mobile
   */
  private isMobileDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase()
    const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone']
    
    return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0)
  }
  
  /**
   * Get battery level if available
   */
  private getBatteryLevel(): number | undefined {
    if ('getBattery' in navigator) {
      // Note: This is async, but we'll handle it in a future enhancement
      return undefined
    }
    return undefined
  }
  
  /**
   * Detect if device is in low power mode
   */
  private isLowPowerMode(): boolean | undefined {
    // This would require additional APIs that aren't widely supported yet
    return undefined
  }
  
  /**
   * Force re-detection (useful for testing or when device capabilities change)
   */
  forceRedetection(): void {
    this.capabilities = null
    this.detectionTime = 0
  }
  
  /**
   * Get performance recommendations based on device capabilities
   */
  getPerformanceRecommendations(): {
    virtualizationThreshold: number
    overscan: number
    estimatedItemSize: number
    enableAnimations: boolean
    enableComplexEffects: boolean
    maxConcurrentOperations: number
  } {
    const device = this.detect()
    
    return {
      virtualizationThreshold: device.processingPower === 'high' ? 100 : 
                              device.processingPower === 'medium' ? 60 : 30,
      overscan: device.processingPower === 'high' ? 12 :
                device.processingPower === 'medium' ? 8 : 4,
      estimatedItemSize: device.isMobile ? 70 : 80,
      enableAnimations: device.processingPower !== 'low' && device.connection !== 'slow-2g',
      enableComplexEffects: device.processingPower === 'high',
      maxConcurrentOperations: device.processingPower === 'high' ? 4 :
                              device.processingPower === 'medium' ? 2 : 1
    }
  }
}

// Singleton instance
export const deviceDetector = new DeviceCapabilityDetector()

// Helper function to get device-aware thresholds (for backward compatibility)
export const getDeviceAwareThresholds = () => {
  return deviceDetector.getPerformanceRecommendations()
}

// Helper function to check if virtualization should be enabled
export const shouldUseVirtualization = (itemCount: number, customThreshold?: number): boolean => {
  const recommendations = deviceDetector.getPerformanceRecommendations()
  const threshold = customThreshold ?? recommendations.virtualizationThreshold
  return itemCount > threshold
}

// Helper function to get optimal overscan
export const getOptimalOverscan = (itemCount: number): number => {
  const recommendations = deviceDetector.getPerformanceRecommendations()
  const baseOverscan = recommendations.overscan
  
  // Scale overscan based on item count
  if (itemCount < 100) return baseOverscan
  if (itemCount < 500) return baseOverscan * 2
  return baseOverscan * 3
}
