/**
 * Streaming scan adapter for real-time receipt processing
 * Provides progressive updates as AI processes the receipt
 */

import { parseReceipt, ensureApiHealthy, type ParseResult } from './receiptScanning'
import { advancedCache, shouldUseAdvancedCache } from './advancedCache'
import { retryWithAdaptiveStrategy } from './retryLogic'

export interface StreamingScanProgress {
  stage: 'checking' | 'uploading' | 'analyzing' | 'extracting' | 'finalizing' | 'complete'
  progress: number
  message: string
  partialData?: Partial<ParseResult>
  estimatedTimeRemaining?: number
}

export interface StreamingScanResult {
  result: ParseResult
  totalTime: number
  cacheHit: boolean
  provider: string
}

export class StreamingScanAdapter {
  private abortController: AbortController | null = null
  private startTime: number = 0
  private listeners: Set<(progress: StreamingScanProgress) => void> = new Set()

  subscribe(listener: (progress: StreamingScanProgress) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(progress: StreamingScanProgress): void {
    this.listeners.forEach(listener => listener(progress))
  }

  async scan(file: File): Promise<AsyncGenerator<StreamingScanProgress, StreamingScanResult, unknown>> {
    this.startTime = Date.now()
    this.abortController = new AbortController()

    return this.scanGenerator(file)
  }

  private async* scanGenerator(file: File): AsyncGenerator<StreamingScanProgress, StreamingScanResult, unknown> {
    try {
      // Stage 1: Check cache
      yield this.createProgress('checking', 0.1, 'Checking cache...')
      
      if (shouldUseAdvancedCache(file)) {
        const cachedResult = await advancedCache.get(file)
        if (cachedResult) {
          console.log('[streaming_scan] Cache hit - returning immediately')
          yield this.createProgress('complete', 1.0, 'Using cached result')
          
          return {
            result: cachedResult,
            totalTime: Date.now() - this.startTime,
            cacheHit: true,
            provider: 'cache'
          }
        }
      }

      // Stage 2: Health check
      yield this.createProgress('checking', 0.2, 'Checking service health...')
      
      const isHealthy = await ensureApiHealthy({ tries: 1, delayMs: 200 })
      if (!isHealthy) {
        throw new Error('Receipt scanning service is unavailable')
      }

      // Stage 3: Upload preparation
      yield this.createProgress('uploading', 0.3, 'Preparing upload...')

      // Stage 4: Start parsing with progress updates
      yield this.createProgress('analyzing', 0.4, 'AI is analyzing the receipt...')

      const parseResult = await retryWithAdaptiveStrategy(
        () => this.parseWithProgress(file),
        'streaming_receipt_parsing'
      )

      // Stage 5: Finalize
      yield this.createProgress('finalizing', 0.9, 'Finalizing results...')

      // Cache the result
      if (shouldUseAdvancedCache(file)) {
        await advancedCache.set(
          file,
          parseResult,
          Date.now() - this.startTime,
          'streaming-scan'
        )
      }

      yield this.createProgress('complete', 1.0, 'Scan complete!')

      return {
        result: parseResult,
        totalTime: Date.now() - this.startTime,
        cacheHit: false,
        provider: 'streaming-scan'
      }

    } catch (error) {
      console.error('[streaming_scan] Error:', error)
      throw error
    }
  }

  private async parseWithProgress(file: File): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const progressCallback = (step: string) => {
        const progressMap: Record<string, { stage: StreamingScanProgress['stage'], progress: number, message: string }> = {
          'Selecting…': { stage: 'uploading', progress: 0.4, message: 'Processing file...' },
          'Normalizing…': { stage: 'uploading', progress: 0.5, message: 'Optimizing image...' },
          'Uploading…': { stage: 'uploading', progress: 0.6, message: 'Uploading to AI...' },
          'Analyzing…': { stage: 'analyzing', progress: 0.7, message: 'AI is reading the receipt...' },
          'Mapping…': { stage: 'extracting', progress: 0.8, message: 'Extracting items...' }
        }

        const progressInfo = progressMap[step]
        if (progressInfo) {
          this.notify(this.createProgress(
            progressInfo.stage,
            progressInfo.progress,
            progressInfo.message
          ))
        }
      }

      parseReceipt(file, progressCallback, this.abortController?.signal)
        .then(resolve)
        .catch(reject)
    })
  }

  private createProgress(
    stage: StreamingScanProgress['stage'],
    progress: number,
    message: string,
    partialData?: Partial<ParseResult>
  ): StreamingScanProgress {
    const elapsed = Date.now() - this.startTime
    const estimatedTotal = elapsed / progress
    const estimatedRemaining = Math.max(0, estimatedTotal - elapsed)

    return {
      stage,
      progress,
      message,
      partialData,
      estimatedTimeRemaining: estimatedRemaining
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
}

// Hook for React components
export function useStreamingScan() {
  const [adapter] = React.useState(() => new StreamingScanAdapter())
  
  React.useEffect(() => {
    return () => adapter.cancel()
  }, [adapter])

  return adapter
}

// Import React for the hook
import React from 'react'
