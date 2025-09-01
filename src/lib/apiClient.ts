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
    }

    return result

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Network error'
    
    console.error(`[api_client] ${url} network error in ${duration}ms:`, error)
    
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
    }

    return result

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Upload network error'
    
    console.error(`[api_client] Upload ${url} network error in ${duration}ms:`, error)
    
    return {
      error: errorMsg,
      status: 0,
      ok: false
    }
  }
}

// Initialize API client configuration logging
logApiConfig()