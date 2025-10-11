/**
 * Adapter for receipt scanning API with proper error handling and status management
 */

import { parseReceipt, ensureApiHealthy, type ParseResult } from './receiptScanning'

// Scan status types
export type ScanStatus =
  | 'idle'
  | 'checking'
  | 'uploading'
  | 'parsing'
  | 'success'
  | 'partial'
  | 'error'
  | 'retrying'

// Scan result types
export interface ScanItem {
  id: string
  name: string
  price: number
  emoji: string
  quantity: number
}

export interface ScanVenue {
  name: string
  location: string
  date: Date
}

export interface ScanResult {
  venue: ScanVenue
  items: ScanItem[]
  subtotal: number
  tax: number
  tip: number
  total: number
  isPartial?: boolean
}

export interface ScanError {
  code: 'HEALTH_CHECK_FAILED' | 'UPLOAD_FAILED' | 'PARSE_FAILED' | 'NO_ITEMS' | 'NETWORK_ERROR'
  message: string
  canRetry: boolean
}

// State machine for scan process
export class ScanStateMachine {
  private status: ScanStatus = 'idle'
  private progress: number = 0
  private error: ScanError | null = null
  private result: ScanResult | null = null
  private abortController: AbortController | null = null
  private startTime: number = 0

  private listeners: Set<(state: ScanState) => void> = new Set()

  getState(): ScanState {
    return {
      status: this.status,
      progress: this.progress,
      error: this.error,
      result: this.result
    }
  }

  subscribe(listener: (state: ScanState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }

  private updateState(updates: Partial<ScanState>) {
    if (updates.status !== undefined) this.status = updates.status
    if (updates.progress !== undefined) this.progress = updates.progress
    if (updates.error !== undefined) this.error = updates.error
    if (updates.result !== undefined) this.result = updates.result
    this.notify()
  }

  async scan(file: File): Promise<void> {
    // Reset state
    this.startTime = Date.now()
    this.abortController = new AbortController()
    this.updateState({
      status: 'checking',
      progress: 0,
      error: null,
      result: null
    })

    // Check advanced cache first
    const { advancedCache, shouldUseAdvancedCache } = await import('./advancedCache')
    if (shouldUseAdvancedCache(file)) {
      const cachedResult = await advancedCache.get(file)
      if (cachedResult) {
        console.log('[scan_machine] Using advanced cached result')
        this.updateState({
          status: 'success',
          progress: 1.0,
          result: cachedResult
        })
        return
      }
    }

    try {
      // Step 1: Health check with retry logic (10% progress)
      this.updateState({ progress: 0.1 })
      
      const { healthCheckWithRetry } = await import('./retryLogic')
      const isHealthy = await healthCheckWithRetry(
        () => ensureApiHealthy({ tries: 1, delayMs: 200 }),
        2
      )

      if (!isHealthy) {
        throw {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Receipt scanning service is unavailable. Please try again later.',
          canRetry: true
        }
      }

      // Step 2: Upload and parse (10-90% progress)
      this.updateState({
        status: 'uploading',
        progress: 0.3
      })

      // Use the progress callback to update state
      const progressCallback = (step: string) => {
        const progressMap: Record<string, number> = {
          'Selecting…': 0.3,
          'Normalizing…': 0.4,
          'Uploading…': 0.5,
          'Analyzing…': 0.7,
          'Mapping…': 0.9
        }
        const progress = progressMap[step] || this.progress
        this.updateState({
          status: step.includes('Analyzing') ? 'parsing' : 'uploading',
          progress
        })
      }

      // Use retry logic for parsing
      const { retryWithAdaptiveStrategy } = await import('./retryLogic')
      const parseResult = await retryWithAdaptiveStrategy(
        () => parseReceipt(file, progressCallback, this.abortController.signal),
        'receipt_parsing'
      )

      // Step 3: Process result (90-100% progress)
      this.updateState({ progress: 0.95 })

      const result = this.processParseResult(parseResult)

      // Cache the result with advanced cache
      if (shouldUseAdvancedCache(file)) {
        await advancedCache.set(
          file, 
          result, 
          Date.now() - (this.startTime || Date.now()), 
          'scan-adapter'
        )
      }

      // Check if partial (missing critical data)
      const isPartial = !result.venue.name || result.items.length === 0

      this.updateState({
        status: isPartial ? 'partial' : 'success',
        progress: 1,
        result
      })

    } catch (error: any) {
      // Handle different error types
      if (error.code) {
        // Our custom error
        this.updateState({
          status: 'error',
          error: error as ScanError
        })
      } else if (error.name === 'AbortError') {
        // User cancelled
        this.updateState({
          status: 'idle',
          progress: 0
        })
      } else {
        // Generic error
        this.updateState({
          status: 'error',
          error: {
            code: 'NETWORK_ERROR',
            message: error.message || 'An unexpected error occurred',
            canRetry: true
          }
        })
      }
    }
  }

  async retry(): Promise<void> {
    if (this.error?.canRetry && this.lastFile) {
      await this.scan(this.lastFile)
    }
  }

  cancel(): void {
    this.abortController?.abort()
    this.updateState({
      status: 'idle',
      progress: 0,
      error: null
    })
  }

  private lastFile: File | null = null

  private processParseResult(parseResult: ParseResult): ScanResult {
    // Store for retry
    this.lastFile = null

    // Map items
    const items: ScanItem[] = parseResult.items.map(item => ({
      id: item.id,
      name: item.label,
      price: item.price,
      emoji: item.emoji || '🍽️',
      quantity: item.quantity
    }))

    // Create venue info
    const venue: ScanVenue = {
      name: parseResult.place || 'Receipt Upload',
      location: parseResult.place || 'Unknown Location',
      date: parseResult.date ? new Date(parseResult.date) : new Date()
    }

    return {
      venue,
      items,
      subtotal: parseResult.subtotal || 0,
      tax: parseResult.tax || 0,
      tip: parseResult.tip || 0,
      total: parseResult.total || 0,
      isPartial: items.length === 0
    }
  }
}

export interface ScanState {
  status: ScanStatus
  progress: number
  error: ScanError | null
  result: ScanResult | null
}

// Hook for React components
export function useScanMachine() {
  const [machine] = React.useState(() => new ScanStateMachine())
  const [state, setState] = React.useState<ScanState>(machine.getState())

  React.useEffect(() => {
    return machine.subscribe(setState)
  }, [machine])

  return {
    state,
    scan: (file: File) => machine.scan(file),
    retry: () => machine.retry(),
    cancel: () => machine.cancel()
  }
}

// Import React for the hook
import React from 'react'