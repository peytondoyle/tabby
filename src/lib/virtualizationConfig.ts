import { deviceDetector, getDeviceAwareThresholds } from './deviceCapabilities'

// Virtualization configuration constants
export const VIRTUALIZATION_CONFIG = {
  // Thresholds for when to enable virtualization (device-aware defaults)
  ITEM_LIST_THRESHOLD: 40,
  ASSIGNED_ITEMS_THRESHOLD: 20,
  UNASSIGNED_ITEMS_THRESHOLD: 10,
  
  // Estimated item sizes (in pixels)
  ESTIMATED_ITEM_SIZE: 80,
  ESTIMATED_UNASSIGNED_ITEM_SIZE: 40,
  
  // Overscan for better scrolling performance
  OVERSCAN: 8,
  
  // Measurement recalculation delay (in milliseconds)
  MEASUREMENT_DELAY: 50,
  
  // Maximum items to show in quick assign section
  MAX_QUICK_ASSIGN_ITEMS: 5
} as const

// Helper function to determine if virtualization should be enabled (device-aware)
export const shouldVirtualize = (
  itemCount: number, 
  threshold?: number
): boolean => {
  const deviceThresholds = getDeviceAwareThresholds()
  const finalThreshold = threshold ?? deviceThresholds.virtualizationThreshold
  return itemCount > finalThreshold
}

// Helper function to get optimal estimated size based on content (device-aware)
export const getEstimatedItemSize = (hasAssignments: boolean = true): number => {
  const deviceThresholds = getDeviceAwareThresholds()
  const baseSize = hasAssignments 
    ? VIRTUALIZATION_CONFIG.ESTIMATED_ITEM_SIZE 
    : VIRTUALIZATION_CONFIG.ESTIMATED_UNASSIGNED_ITEM_SIZE
  
  // Adjust based on device capabilities
  return deviceThresholds.estimatedItemSize || baseSize
}

// Helper function to get overscan based on item count (device-aware)
export const getOverscan = (itemCount: number): number => {
  const deviceThresholds = getDeviceAwareThresholds()
  const baseOverscan = deviceThresholds.overscan || VIRTUALIZATION_CONFIG.OVERSCAN
  
  // Scale overscan based on item count
  if (itemCount < 100) return baseOverscan
  if (itemCount < 500) return baseOverscan * 2
  return baseOverscan * 3
}

// Device-aware configuration getters
export const getDeviceAwareConfig = () => {
  const device = deviceDetector.detect()
  const recommendations = getDeviceAwareThresholds()
  
  return {
    // Thresholds
    itemListThreshold: recommendations.virtualizationThreshold,
    assignedItemsThreshold: device.processingPower === 'high' ? 30 :
                           device.processingPower === 'medium' ? 20 : 10,
    unassignedItemsThreshold: device.processingPower === 'high' ? 15 :
                             device.processingPower === 'medium' ? 10 : 5,
    
    // Sizes
    estimatedItemSize: recommendations.estimatedItemSize,
    estimatedUnassignedItemSize: Math.round(recommendations.estimatedItemSize * 0.5),
    
    // Performance
    overscan: recommendations.overscan,
    measurementDelay: device.processingPower === 'low' ? 100 : 50,
    
    // Features
    enableAnimations: recommendations.enableAnimations,
    enableComplexEffects: recommendations.enableComplexEffects,
    maxConcurrentOperations: recommendations.maxConcurrentOperations,
    
    // Device info
    isMobile: device.isMobile,
    processingPower: device.processingPower,
    connection: device.connection
  }
}
