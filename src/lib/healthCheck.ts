import { apiFetch } from './apiClient'

let hasCheckedHealth = false;
let apiIsAvailable = false;

/**
 * Dev-only health check to verify API availability
 * SECURITY: No longer uses legacy RPC calls
 */
export function runHealthCheck() {
  if (!import.meta.env.DEV) return

  // Only check once to avoid spamming the console
  if (hasCheckedHealth) return
  hasCheckedHealth = true

  apiFetch('/api/scan-receipt?health=1').then(response => {
    // apiFetch returns the raw response data, so check if it has the expected structure
    if (response && typeof response === 'object' && 'ok' in response && response.ok) {
      console.log('[Tabby] API health check ✅ Server responsive')
      apiIsAvailable = true
    } else {
      console.warn('[Tabby] API health check ❌ Server not responding: invalid response format')
      apiIsAvailable = false
    }
  }).catch((error: unknown) => {
    // Only log once, don't keep retrying
    console.warn('[Tabby] API health check ❌ Health probe failed: API server not running')
    apiIsAvailable = false
  })
}

export function isApiAvailable() {
  return apiIsAvailable
}