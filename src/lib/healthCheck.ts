import { apiFetch } from './apiClient'

/**
 * Dev-only health check to verify API availability
 * SECURITY: No longer uses legacy RPC calls
 */
export function runHealthCheck() {
  if (!import.meta.env.DEV) return
  
  apiFetch('/api/scan-receipt?health=1').then(response => {
    // apiFetch returns the raw response data, so check if it has the expected structure
    if (response && typeof response === 'object' && 'ok' in response && response.ok) {
      console.log('[Tabby] API health check ✅ Server responsive')
    } else {
      console.warn('[Tabby] API health check ❌ Server not responding: invalid response format')
    }
  }).catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn('[Tabby] API health check ❌ Health probe failed:', errorMessage)
  })
}