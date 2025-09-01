import { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * CORS Helper for Vercel Functions
 * 
 * Handles cross-origin requests between UI (http://localhost:5173) and API (http://127.0.0.1:3000)
 * Supports configurable allowed origins via environment variables
 */

// Default allowed origins for local development
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]

/**
 * Get allowed origins from environment or use defaults
 */
function getAllowedOrigins(): string[] {
  // Check if wildcard is enabled for dev
  if (process.env.CORS_ALLOW_ALL === '1') {
    return ['*']
  }
  
  // Parse comma-separated origins from env
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
  }
  
  // Use defaults for local dev
  return DEFAULT_ALLOWED_ORIGINS
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return false
  if (allowedOrigins.includes('*')) return true
  return allowedOrigins.includes(origin)
}

/**
 * Apply CORS headers and handle OPTIONS preflight
 * 
 * Usage: Call this at the top of your handler:
 * ```ts
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   if (applyCors(req, res)) return // OPTIONS handled
 *   // ... rest of handler
 * }
 * ```
 * 
 * @returns true if OPTIONS was handled (handler should return), false otherwise
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin as string | undefined
  const allowedOrigins = getAllowedOrigins()
  
  // Set CORS headers
  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else if (origin && isOriginAllowed(origin, allowedOrigins)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  
  // Always set these headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.setHeader('Access-Control-Max-Age', '86400') // 24 hours
  res.setHeader('Vary', 'Origin')
  
  // Support Safari local development with Private Network Access
  res.setHeader('Access-Control-Allow-Private-Network', 'true')
  
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true // Signal that response was sent
  }
  
  return false // Continue with normal handler
}

/**
 * Middleware-style CORS handler (alternative usage)
 * Wraps a handler function with CORS support
 */
export function withCors(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
): (req: VercelRequest, res: VercelResponse) => Promise<void> {
  return async (req: VercelRequest, res: VercelResponse) => {
    if (applyCors(req, res)) return
    await handler(req, res)
  }
}