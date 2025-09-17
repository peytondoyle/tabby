// api/_utils/request.ts
import { IncomingMessage, ServerResponse } from 'http'
import { z } from 'zod'
import { ErrorResponse } from './schemas.js'

// Generate unique request ID for tracing
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Enhanced request context with logging
export interface RequestContext {
  reqId: string
  route: string
  method: string
  startTime: number
  log: (level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: any) => void
}

// Create request context for consistent logging
export function createRequestContext(
  req: IncomingMessage & { method?: string },
  res: ServerResponse,
  route: string
): RequestContext {
  const reqId = generateRequestId()
  const startTime = Date.now()
  
  // Add request ID to response headers for client tracing
  res.setHeader('X-Request-ID', reqId)
  
  return {
    reqId,
    route,
    method: req.method || 'UNKNOWN',
    startTime,
    log: (level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: any) => {
      const duration = Date.now() - startTime
      const logData = {
        reqId,
        route,
        method: req.method || 'UNKNOWN',
        duration,
        message,
        ...meta
      }
      
      switch (level) {
        case 'info':
          console.info(`[${route}] ${message}`, logData)
          break
        case 'warn':
          console.warn(`[${route}] ${message}`, logData)
          break
        case 'error':
          console.error(`[${route}] ${message}`, logData)
          break
        case 'debug':
          console.debug(`[${route}] ${message}`, logData)
          break
      }
    }
  }
}

// Validate request body against Zod schema
export function validateRequest<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
  ctx: RequestContext
): { success: true; data: T } | { success: false; error: ErrorResponse } {
  try {
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(err => ({
        path: err.path,
        message: err.message,
        code: err.code
      }))
      
      ctx.log('warn', 'Request validation failed', { issues })
      
      return {
        success: false,
        error: {
          error: 'Request validation failed',
          code: 'VALIDATION_ERROR',
          issues
        }
      }
    }
    
    ctx.log('error', 'Unexpected validation error', { error: String(error) })
    
    return {
      success: false,
      error: {
        error: 'Internal validation error',
        code: 'INTERNAL_ERROR'
      }
    }
  }
}

// Check request size limits
export function checkRequestSize(
  req: IncomingMessage,
  maxSize: number,
  ctx: RequestContext
): { success: true } | { success: false; error: ErrorResponse } {
  const contentLength = req.headers['content-length']
  
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (size > maxSize) {
      ctx.log('warn', 'Request too large', { size, maxSize })
      return {
        success: false,
        error: {
          error: `Request too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
          code: 'REQUEST_TOO_LARGE'
        }
      }
    }
  }
  
  return { success: true }
}

// Send error response with consistent format
export function sendErrorResponse(
  res: ServerResponse,
  error: ErrorResponse,
  statusCode: number = 400,
  ctx?: RequestContext
): void {
  if (ctx) {
    ctx.log('warn', `Sending error response: ${statusCode}`, { error, statusCode })
  }
  
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(error))
}

// Send success response with consistent format
export function sendSuccessResponse<T>(
  res: ServerResponse,
  data: T,
  statusCode: number = 200,
  ctx?: RequestContext
): void {
  if (ctx) {
    ctx.log('info', `Sending success response: ${statusCode}`)
  }
  
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

// Log request completion
export function logRequestCompletion(
  ctx: RequestContext,
  statusCode: number,
  error?: string
): void {
  const duration = Date.now() - ctx.startTime
  const level = statusCode >= 400 ? 'error' : 'info'
  
  ctx.log(level, `Request completed`, {
    statusCode,
    duration,
    error: error || undefined
  })
}
