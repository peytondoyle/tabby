// api/_utils/rateLimit.ts
import { IncomingMessage, ServerResponse } from 'http'
import { type RequestContext } from './request.js'
import { RATE_LIMITS } from './schemas.js'

// Simple in-memory rate limiting store
// In production, consider using Redis or similar
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

// Get client identifier for rate limiting
function getClientId(req: IncomingMessage): string {
  // Use IP address or a combination of identifiers
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection?.remoteAddress || 
             'unknown'
  
  // In development, you might want to be more permissive
  if (process.env.NODE_ENV === 'development') {
    return `dev_${ip}`
  }
  
  return String(ip)
}

// Check rate limit for a specific endpoint
export function checkRateLimit(
  req: IncomingMessage,
  endpoint: keyof typeof RATE_LIMITS,
  ctx: RequestContext
): { success: true } | { success: false; error: { error: string; code: string } } {
  const clientId = getClientId(req)
  const limit = RATE_LIMITS[endpoint] || RATE_LIMITS.default
  const now = Date.now()
  const key = `${clientId}:${endpoint}`
  
  const entry = rateLimitStore.get(key)
  
  if (!entry || now > entry.resetTime) {
    // First request or reset window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.windowMs
    })
    return { success: true }
  }
  
  if (entry.count >= limit.maxRequests) {
    ctx.log('warn', 'Rate limit exceeded', {
      clientId,
      endpoint,
      count: entry.count,
      maxRequests: limit.maxRequests,
      resetTime: new Date(entry.resetTime).toISOString()
    })
    
    return {
      success: false,
      error: {
        error: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED'
      }
    }
  }
  
  // Increment counter
  entry.count++
  return { success: true }
}

// Get rate limit info for client
export function getRateLimitInfo(
  req: IncomingMessage,
  endpoint: keyof typeof RATE_LIMITS
): { remaining: number; resetTime: number; limit: number } {
  const clientId = getClientId(req)
  const limit = RATE_LIMITS[endpoint] || RATE_LIMITS.default
  const now = Date.now()
  const key = `${clientId}:${endpoint}`
  
  const entry = rateLimitStore.get(key)
  
  if (!entry || now > entry.resetTime) {
    return {
      remaining: limit.maxRequests,
      resetTime: now + limit.windowMs,
      limit: limit.maxRequests
    }
  }
  
  return {
    remaining: Math.max(0, limit.maxRequests - entry.count),
    resetTime: entry.resetTime,
    limit: limit.maxRequests
  }
}

// Add rate limit headers to response
export function addRateLimitHeaders(
  res: ServerResponse,
  req: IncomingMessage,
  endpoint: keyof typeof RATE_LIMITS
): void {
  const info = getRateLimitInfo(req, endpoint)
  
  res.setHeader('X-RateLimit-Limit', info.limit.toString())
  res.setHeader('X-RateLimit-Remaining', info.remaining.toString())
  res.setHeader('X-RateLimit-Reset', new Date(info.resetTime).toISOString())
}
