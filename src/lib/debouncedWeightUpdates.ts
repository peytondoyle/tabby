import { useCallback, useRef, useEffect } from 'react'
import { WeightSchema, BatchWeightUpdateSchema } from './schemas'
import { showError } from './exportUtils'
import { batchUpdateShares, type ShareUpdate } from './batchShares'

export interface WeightUpdate {
  itemId: string
  personId: string
  weight: number
}

export interface PendingWeightUpdate extends WeightUpdate {
  timestamp: number
}

/**
 * Hook for debounced weight updates with batch API
 * @param editorToken Editor token for authentication
 * @param onSuccess Callback for successful updates
 * @param onError Callback for errors
 * @param debounceMs Debounce delay in milliseconds
 * @returns Object with updateWeight function and flushUpdates function
 */
export function useDebouncedWeightUpdates(
  editorToken: string,
  onSuccess?: (result: any) => void,
  onError?: (error: Error) => void,
  debounceMs: number = 500
) {
  const pendingUpdatesRef = useRef<Map<string, PendingWeightUpdate>>(new Map())
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Flush pending updates to batch API
  const flushUpdates = useCallback(async () => {
    const updates = Array.from(pendingUpdatesRef.current.values())
    if (updates.length === 0) return

    try {
      // Convert to ShareUpdate format
      const shareUpdates: ShareUpdate[] = updates.map(update => ({
        item_id: update.itemId,
        person_id: update.personId,
        weight: update.weight
      }))

      // Send batch update
      const result = await batchUpdateShares(shareUpdates, editorToken)
      pendingUpdatesRef.current.clear()
      onSuccess?.(result)
    } catch (error) {
      onError?.(error as Error)
    }
  }, [editorToken, onSuccess, onError])

  // Update weight with debouncing
  const updateWeight = useCallback((
    itemId: string,
    personId: string,
    weight: number
  ) => {
    try {
      // Validate weight using zod schema
      const validatedWeight = WeightSchema.parse(weight)

      // Store the update
      const key = `${itemId}-${personId}`
      pendingUpdatesRef.current.set(key, {
        itemId,
        personId,
        weight: validatedWeight,
        timestamp: Date.now()
      })

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Set new timeout
      debounceTimeoutRef.current = setTimeout(() => {
        flushUpdates()
      }, debounceMs)
    } catch (error) {
      // Show validation error
      if (error instanceof Error) {
        showError(error.message)
      }
    }
  }, [debounceMs, flushUpdates])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return {
    updateWeight,
    flushUpdates
  }
}

/**
 * Group weight updates by item ID for efficient batching
 * @param updates Array of weight updates
 * @returns Map of itemId to array of updates for that item
 */
export function groupUpdatesByItem(updates: WeightUpdate[]): Map<string, WeightUpdate[]> {
  const grouped = new Map<string, WeightUpdate[]>()
  
  for (const update of updates) {
    if (!grouped.has(update.itemId)) {
      grouped.set(update.itemId, [])
    }
    grouped.get(update.itemId)!.push(update)
  }
  
  return grouped
}

/**
 * Validate that weight updates don't result in zero total weight for any item
 * @param updates Array of weight updates
 * @param currentShares Current shares for validation
 * @returns True if all updates are valid
 */
export function validateWeightUpdates(
  updates: WeightUpdate[],
  currentShares: Array<{ itemId: string; personId: string; weight: number }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const updatesByItem = groupUpdatesByItem(updates)

  for (const [itemId, itemUpdates] of updatesByItem) {
    // Get current shares for this item (excluding updated persons)
    const currentItemShares = currentShares.filter(
      share => share.itemId === itemId && 
      !itemUpdates.some(update => update.personId === share.personId)
    )
    
    // Calculate total weight after updates
    const currentWeight = currentItemShares.reduce((sum, share) => sum + share.weight, 0)
    const newWeight = itemUpdates.reduce((sum, update) => sum + update.weight, 0)
    const totalWeight = currentWeight + newWeight

    if (totalWeight <= 0) {
      errors.push(`Item ${itemId} would have zero total weight after updates`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Create a batch update payload for API calls
 * @param updates Array of weight updates
 * @returns Formatted payload for bulk update API
 */
export function createBatchUpdatePayload(updates: WeightUpdate[]): {
  shares: Array<{ item_id: string; person_id: string; weight: number }>
} {
  try {
    // Validate the entire batch
    const validatedPayload = BatchWeightUpdateSchema.parse({
      shares: updates.map(update => ({
        itemId: update.itemId,
        personId: update.personId,
        weight: update.weight
      }))
    })

    return {
      shares: validatedPayload.shares.map(share => ({
        item_id: share.itemId,
        person_id: share.personId,
        weight: share.weight
      }))
    }
  } catch (error) {
    if (error instanceof Error) {
      showError(`Batch update validation failed: ${error.message}`)
    }
    throw error
  }
}
