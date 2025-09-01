/**
 * Centralized API client for all server requests
 * 
 * This replaces direct fetch() calls to ensure:
 * 1. Consistent absolute URL handling (bypasses Vite proxy issues)
 * 2. Proper error handling and logging
 * 3. Request/response standardization
 */

import { buildApiUrl, logApiConfig } from './apiBase'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  status: number
  ok: boolean
}

interface ErrorLogData {
  endpoint: string
  status_code: number
  message: string
  meta: {
    timestamp: string
    user_agent?: string
    method?: string
    duration_ms?: number
    [key: string]: any
  }
}

/**
 * Log API errors to server endpoint for debugging and monitoring
 * SECURITY: No direct client-side Supabase writes allowed
 */
async function logErrorToServer(errorData: ErrorLogData): Promise<void> {
  // Only log in development or if explicitly enabled
  if (import.meta.env.PROD && import.meta.env.VITE_LOG_API_ERRORS !== '1') {
    return
  }

  try {
    // Route through server API instead of direct Supabase write
    await fetch(buildApiUrl('/api/errors/log'), {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    })
    
    console.info('[api_client] Error logged via server API:', errorData.endpoint, errorData.status_code)
  } catch (error) {
    console.warn('[api_client] Failed to log error via server API:', error)
  }
}

/**
 * Enhanced fetch wrapper that handles absolute URLs and consistent error handling
 */
export async function apiFetch<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = buildApiUrl(endpoint)
  const startTime = Date.now()

  try {
    // Log the request for debugging
    console.info(`[api_client] ${options.method || 'GET'} ${url}`)

    const response = await fetch(url, {
      ...options,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const duration = Date.now() - startTime
    const contentType = response.headers.get('content-type') || ''
    
    let data: T | undefined
    
    // Handle JSON responses
    if (contentType.includes('application/json')) {
      try {
        data = await response.json()
      } catch (jsonError) {
        console.warn(`[api_client] Failed to parse JSON response in ${duration}ms:`, jsonError)
      }
    }

    const result: ApiResponse<T> = {
      data,
      status: response.status,
      ok: response.ok
    }

    if (response.ok) {
      console.info(`[api_client] ${response.status} ${url} completed in ${duration}ms`)
    } else {
      const errorMsg = (data as any)?.error || response.statusText || 'Request failed'
      result.error = errorMsg
      console.warn(`[api_client] ${response.status} ${url} failed in ${duration}ms: ${errorMsg}`)
      
      // Log error to server API
      logErrorToServer({
        endpoint: endpoint,
        status_code: response.status,
        message: errorMsg,
        meta: {
          timestamp: new Date().toISOString(),
          user_agent: typeof window !== 'undefined' ? window.navigator?.userAgent : undefined,
          method: options.method || 'GET',
          duration_ms: duration,
          full_url: url
        }
      })
      
      // Emit error event for dev banner
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api-error', {
          detail: {
            timestamp: new Date().toISOString(),
            endpoint: url,
            status: response.status,
            message: errorMsg
          }
        }))
      }
    }

    return result

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Network error'
    
    console.error(`[api_client] ${url} network error in ${duration}ms:`, error)
    
    // Log network error to server API
    logErrorToServer({
      endpoint: endpoint,
      status_code: 0,
      message: errorMsg,
      meta: {
        timestamp: new Date().toISOString(),
        user_agent: typeof window !== 'undefined' ? window.navigator?.userAgent : undefined,
        method: options.method || 'GET',
        duration_ms: duration,
        full_url: url,
        error_type: 'network_error'
      }
    })
    
    // Emit error event for dev banner
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: {
          timestamp: new Date().toISOString(),
          endpoint: url,
          status: 0,
          message: errorMsg
        }
      }))
    }
    
    return {
      error: errorMsg,
      status: 0,
      ok: false
    }
  }
}

/**
 * POST multipart form data (for file uploads)
 */
export async function apiUpload<T = any>(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  const url = buildApiUrl(endpoint)
  const startTime = Date.now()

  try {
    console.info(`[api_client] POST ${url} (multipart upload)`)

    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      body: formData
      // Don't set Content-Type header for FormData - browser will set it with boundary
    })

    const duration = Date.now() - startTime
    
    let data: T | undefined
    
    try {
      data = await response.json()
    } catch (jsonError) {
      console.warn(`[api_client] Failed to parse upload response in ${duration}ms:`, jsonError)
    }

    const result: ApiResponse<T> = {
      data,
      status: response.status,
      ok: response.ok
    }

    if (response.ok) {
      console.info(`[api_client] Upload ${response.status} ${url} completed in ${duration}ms`)
    } else {
      const errorMsg = (data as any)?.error || response.statusText || 'Upload failed'
      result.error = errorMsg
      console.warn(`[api_client] Upload ${response.status} ${url} failed in ${duration}ms: ${errorMsg}`)
      
      // Log upload error to server API
      logErrorToServer({
        endpoint: endpoint,
        status_code: response.status,
        message: errorMsg,
        meta: {
          timestamp: new Date().toISOString(),
          user_agent: typeof window !== 'undefined' ? window.navigator?.userAgent : undefined,
          method: 'POST',
          duration_ms: duration,
          full_url: url,
          error_type: 'upload_error'
        }
      })
      
      // Emit error event for dev banner
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api-error', {
          detail: {
            timestamp: new Date().toISOString(),
            endpoint: url,
            status: response.status,
            message: errorMsg
          }
        }))
      }
    }

    return result

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Upload network error'
    
    console.error(`[api_client] Upload ${url} network error in ${duration}ms:`, error)
    
    // Log upload network error to server API
    logErrorToServer({
      endpoint: endpoint,
      status_code: 0,
      message: errorMsg,
      meta: {
        timestamp: new Date().toISOString(),
        user_agent: typeof window !== 'undefined' ? window.navigator?.userAgent : undefined,
        method: 'POST',
        duration_ms: duration,
        full_url: url,
        error_type: 'upload_network_error'
      }
    })
    
    // Emit error event for dev banner
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: {
          timestamp: new Date().toISOString(),
          endpoint: url,
          status: 0,
          message: errorMsg
        }
      }))
    }
    
    return {
      error: errorMsg,
      status: 0,
      ok: false
    }
  }
}

// Initialize API client configuration logging
logApiConfig()