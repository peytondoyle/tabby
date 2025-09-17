// Virtualization configuration constants
export const VIRTUALIZATION_CONFIG = {
  // Thresholds for when to enable virtualization
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

// Helper function to determine if virtualization should be enabled
export const shouldVirtualize = (
  itemCount: number, 
  threshold: number = VIRTUALIZATION_CONFIG.ITEM_LIST_THRESHOLD
): boolean => {
  return itemCount > threshold
}

// Helper function to get optimal estimated size based on content
export const getEstimatedItemSize = (hasAssignments: boolean = true): number => {
  return hasAssignments 
    ? VIRTUALIZATION_CONFIG.ESTIMATED_ITEM_SIZE 
    : VIRTUALIZATION_CONFIG.ESTIMATED_UNASSIGNED_ITEM_SIZE
}

// Helper function to get overscan based on item count
export const getOverscan = (itemCount: number): number => {
  if (itemCount < 100) return VIRTUALIZATION_CONFIG.OVERSCAN
  if (itemCount < 500) return VIRTUALIZATION_CONFIG.OVERSCAN * 2
  return VIRTUALIZATION_CONFIG.OVERSCAN * 3
}
