/**
 * API Base URL configuration for client-side requests
 * 
 * This ensures all API calls use absolute URLs to bypass Vite proxy issues.
 * In development: VITE_API_BASE=http://127.0.0.1:3000
 * In production: defaults to relative URLs
 */

export function getApiBase(): string {
  // In development, use the explicit API base to bypass Vite proxy
  if (import.meta.env.DEV && import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE
  }
  
  // In production, use relative URLs (same domain)
  return ''
}

export function buildApiUrl(endpoint: string): string {
  const apiBase = getApiBase()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${apiBase}${cleanEndpoint}`
}

// Helper to log API configuration
export function logApiConfig() {
  const apiBase = getApiBase()
  console.info('[api_config] API Base:', apiBase || '(relative)', ', Mode:', import.meta.env.MODE)
}