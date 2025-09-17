import { apiFetch } from './apiClient'

export interface ShareUpdate {
  item_id: string
  person_id: string
  weight: number
}

export interface BatchSharesRequest {
  shares: ShareUpdate[]
  editor_token: string
}

export interface BatchSharesResponse {
  success: boolean
  updated_shares: ShareUpdate[]
  count: number
}

/**
 * Batch update multiple item shares in a single transaction
 * @param shares Array of share updates
 * @param editorToken Editor token for authentication
 * @returns Promise resolving to batch update result
 */
export async function batchUpdateShares(
  shares: ShareUpdate[],
  editorToken: string
): Promise<BatchSharesResponse> {
  if (shares.length === 0) {
    return {
      success: true,
      updated_shares: [],
      count: 0
    }
  }

  const request: BatchSharesRequest = {
    shares,
    editor_token: editorToken
  }

  return apiFetch<BatchSharesResponse>('/api/shares/batch', {
    method: 'POST',
    body: request
  })
}

/**
 * Debounced batch update utility
 * Collects share updates and sends them in batches
 */
export class ShareUpdateBatcher {
  private pendingUpdates = new Map<string, ShareUpdate>()
  private timeoutId: NodeJS.Timeout | null = null
  private readonly debounceMs: number
  private readonly editorToken: string
  private readonly onSuccess?: (result: BatchSharesResponse) => void
  private readonly onError?: (error: Error) => void

  constructor(
    editorToken: string,
    options: {
      debounceMs?: number
      onSuccess?: (result: BatchSharesResponse) => void
      onError?: (error: Error) => void
    } = {}
  ) {
    this.editorToken = editorToken
    this.debounceMs = options.debounceMs || 500
    this.onSuccess = options.onSuccess
    this.onError = options.onError
  }

  /**
   * Add a share update to the batch
   * @param share Share update to add
   */
  addUpdate(share: ShareUpdate): void {
    // Create a unique key for this item-person combination
    const key = `${share.item_id}-${share.person_id}`
    this.pendingUpdates.set(key, share)

    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }

    // Set new timeout
    this.timeoutId = setTimeout(() => {
      this.flush()
    }, this.debounceMs)
  }

  /**
   * Immediately flush all pending updates
   */
  async flush(): Promise<void> {
    if (this.pendingUpdates.size === 0) return

    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    // Get all pending updates
    const updates = Array.from(this.pendingUpdates.values())
    this.pendingUpdates.clear()

    try {
      const result = await batchUpdateShares(updates, this.editorToken)
      this.onSuccess?.(result)
    } catch (error) {
      this.onError?.(error as Error)
    }
  }

  /**
   * Cancel pending updates
   */
  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    this.pendingUpdates.clear()
  }

  /**
   * Get the number of pending updates
   */
  getPendingCount(): number {
    return this.pendingUpdates.size
  }
}

/**
 * Hook for managing share updates with batching
 * @param editorToken Editor token for authentication
 * @param options Configuration options
 * @returns Object with update function and utilities
 */
export function useShareUpdateBatcher(
  editorToken: string,
  options: {
    debounceMs?: number
    onSuccess?: (result: BatchSharesResponse) => void
    onError?: (error: Error) => void
  } = {}
) {
  const batcher = new ShareUpdateBatcher(editorToken, options)

  const updateShare = (share: ShareUpdate) => {
    batcher.addUpdate(share)
  }

  const flushUpdates = () => {
    return batcher.flush()
  }

  const cancelUpdates = () => {
    batcher.cancel()
  }

  const getPendingCount = () => {
    return batcher.getPendingCount()
  }

  return {
    updateShare,
    flushUpdates,
    cancelUpdates,
    getPendingCount
  }
}
