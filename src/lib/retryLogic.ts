/**
 * Smart retry logic with exponential backoff and circuit breaker pattern
 */

export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  jitter?: boolean
  retryCondition?: (error: any) => boolean
}

export interface CircuitBreakerOptions {
  failureThreshold?: number
  recoveryTimeoutMs?: number
  monitoringPeriodMs?: number
}

class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private options: CircuitBreakerOptions = {}
  ) {
    const {
      failureThreshold = 5,
      recoveryTimeoutMs = 60000, // 1 minute
      monitoringPeriodMs = 300000 // 5 minutes
    } = options

    this.options = {
      failureThreshold,
      recoveryTimeoutMs,
      monitoringPeriodMs
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.recoveryTimeoutMs!) {
        this.state = 'HALF_OPEN'
        console.log('[circuit_breaker] Moving to HALF_OPEN state')
      } else {
        throw new Error('Circuit breaker is OPEN - operation blocked')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.options.failureThreshold!) {
      this.state = 'OPEN'
      console.log(`[circuit_breaker] Circuit breaker OPEN after ${this.failures} failures`)
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }
}

// Global circuit breakers for different operations
const circuitBreakers = {
  scanApi: new CircuitBreaker({
    failureThreshold: 3,
    recoveryTimeoutMs: 30000, // 30 seconds
    monitoringPeriodMs: 300000 // 5 minutes
  }),
  healthCheck: new CircuitBreaker({
    failureThreshold: 5,
    recoveryTimeoutMs: 10000, // 10 seconds
    monitoringPeriodMs: 60000 // 1 minute
  })
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    jitter = true,
    retryCondition = (error) => {
      // Retry on network errors, timeouts, and 5xx status codes
      if (error.name === 'AbortError') return false
      if (error.status >= 500) return true
      if (error.code === 'NETWORK_ERROR') return true
      if (error.message?.includes('timeout')) return true
      return false
    }
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Don't retry if it's the last attempt or if retry condition is false
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      )

      // Add jitter to prevent thundering herd
      const jitteredDelay = jitter 
        ? delay + Math.random() * delay * 0.1
        : delay

      console.log(`[retry] Attempt ${attempt + 1} failed, retrying in ${jitteredDelay.toFixed(0)}ms:`, error.message)
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay))
    }
  }

  throw lastError
}

/**
 * Retry with circuit breaker
 */
export async function retryWithCircuitBreaker<T>(
  operation: () => Promise<T>,
  breakerType: keyof typeof circuitBreakers = 'scanApi',
  retryOptions: RetryOptions = {}
): Promise<T> {
  const circuitBreaker = circuitBreakers[breakerType]

  return circuitBreaker.execute(async () => {
    return retryWithBackoff(operation, retryOptions)
  })
}

/**
 * Retry with adaptive strategy
 */
export async function retryWithAdaptiveStrategy<T>(
  operation: () => Promise<T>,
  context: string = 'unknown'
): Promise<T> {
  const startTime = Date.now()
  
  try {
    // First attempt with circuit breaker
    return await retryWithCircuitBreaker(operation, 'scanApi', {
      maxRetries: 2,
      baseDelayMs: 500,
      maxDelayMs: 5000
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.warn(`[adaptive_retry] ${context} failed after ${duration}ms:`, error)

    // If circuit breaker is open, try with different strategy
    const breakerState = circuitBreakers.scanApi.getState()
    if (breakerState.state === 'OPEN') {
      console.log(`[adaptive_retry] Circuit breaker is OPEN, trying fallback strategy`)
      
      // Try with more aggressive retry settings
      return retryWithBackoff(operation, {
        maxRetries: 1,
        baseDelayMs: 2000,
        maxDelayMs: 8000,
        retryCondition: () => true // Retry on any error
      })
    }

    throw error
  }
}

/**
 * Health check with retry
 */
export async function healthCheckWithRetry(
  healthCheckFn: () => Promise<boolean>,
  maxRetries: number = 3
): Promise<boolean> {
  return retryWithCircuitBreaker(
    async () => {
      const isHealthy = await healthCheckFn()
      if (!isHealthy) {
        throw new Error('Health check failed')
      }
      return isHealthy
    },
    'healthCheck',
    {
      maxRetries,
      baseDelayMs: 200,
      maxDelayMs: 2000
    }
  )
}

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus(): Record<string, any> {
  return {
    scanApi: circuitBreakers.scanApi.getState(),
    healthCheck: circuitBreakers.healthCheck.getState()
  }
}

/**
 * Reset circuit breakers (for testing or manual recovery)
 */
export function resetCircuitBreakers(): void {
  Object.values(circuitBreakers).forEach(breaker => {
    // Reset by creating new instance
    Object.assign(breaker, new CircuitBreaker())
  })
  console.log('[circuit_breaker] All circuit breakers reset')
}
