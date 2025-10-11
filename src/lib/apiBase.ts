import { assertEnvVars, hasLocalFallbacks } from './assertEnv'

/**
 * API Base URL configuration for client-side requests
 *
 * This ensures all API calls use absolute URLs to bypass Vite proxy issues.
 * In development: VITE_API_BASE=http://127.0.0.1:3000
 * In production: defaults to relative URLs
 */

// Assert API configuration at startup
assertEnvVars(
  ['VITE_API_BASE'],
  hasLocalFallbacks
)

export const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.DEV
    ? "http://127.0.0.1:3000"
    : "");

export function buildApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${API_BASE}${cleanEndpoint}`
}

// Helper to log API configuration
export function logApiConfig() {
  console.info('[api_config] API Base:', API_BASE || '(relative)', ', Mode:', import.meta.env.MODE)
}