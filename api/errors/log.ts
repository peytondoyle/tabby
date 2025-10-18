import { type VercelRequest, type VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from '../_utils/cors.js'

// Environment variables with fallbacks
const SB_URL = 
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL

const SB_SECRET = process.env.SUPABASE_SECRET_KEY

// Server-side Supabase client using secret key
const supabaseAdmin = (SB_URL && SB_SECRET)
  ? createClient(SB_URL, SB_SECRET, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

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

interface BatchLogData {
  logs: Array<{
    level: "error" | "warn" | "info"
    msg: string
    meta?: any
  }>
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const requestStart = Date.now()

  // Apply CORS - must be first
  if (applyCors(req, res)) return

  // Only allow POST
  if (req.method !== 'POST') {
    console.warn(`[error_log] Method not allowed: ${req.method}`)
    return res.status(405).json({ 
      ok: false, 
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only POST method is allowed' 
    })
  }

  // Only log in development or if explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.VITE_LOG_API_ERRORS !== '1') {
    const duration = Date.now() - requestStart
    console.info(`[error_log] Error logging disabled in production (${duration}ms)`)
    return res.status(200).json({ ok: true, message: 'Error logging disabled in production' })
  }

  // Check if Supabase admin client is available
  if (!supabaseAdmin) {
    const duration = Date.now() - requestStart
    console.warn(`[error_log] Supabase not configured, skipping error logging (${duration}ms)`)
    return res.status(200).json({ ok: true, message: 'Error logging not configured' })
  }

  try {
    // Handle both legacy single error format and new batch format
    const body = req.body as ErrorLogData | BatchLogData
    
    if ('logs' in body && Array.isArray(body.logs)) {
      // New batch format
      const logs = body.logs
      console.info(`[error_log] Processing batch of ${logs.length} logs`)
      
      // Process each log entry
      for (const log of logs) {
        const errorData: ErrorLogData = {
          endpoint: '/api/errors/log',
          status_code: log.level === 'error' ? 500 : log.level === 'warn' ? 400 : 200,
          message: log.msg,
          meta: {
            timestamp: new Date().toISOString(),
            level: log.level,
            ...log.meta
          }
        }
        
        // Insert error log using admin client
        const { error } = await supabaseAdmin
          .from('scan_errors')
          .insert({
            endpoint: errorData.endpoint,
            status_code: errorData.status_code,
            message: errorData.message,
            meta: errorData.meta
          })

        if (error) {
          console.error(`[error_log] Failed to log batch item:`, error)
        }
      }
      
      const duration = Date.now() - requestStart
      console.info(`[error_log] Batch of ${logs.length} logs processed in ${duration}ms`)
      
      res.status(200).json({
        ok: true,
        message: `Batch of ${logs.length} logs processed successfully`
      })
    } else {
      // Legacy single error format
      const errorData: ErrorLogData = body as ErrorLogData

      // Basic validation
      if (!errorData || typeof errorData !== 'object') {
        return res.status(400).json({
          ok: false,
          code: 'INVALID_PAYLOAD',
          message: 'Request body must be a valid error log object'
        })
      }

      console.info(`[error_log] Logging error for endpoint: ${errorData.endpoint}`)

      // Insert error log using admin client
      const { error } = await supabaseAdmin
        .from('scan_errors')
        .insert({
          endpoint: errorData.endpoint,
          status_code: errorData.status_code,
          message: errorData.message,
          meta: errorData.meta
        })

      if (error) {
        const duration = Date.now() - requestStart
        console.error(`[error_log] Failed to log error in ${duration}ms:`, {
          error: error,
          code: error.code,
          message: error.message,
          details: error.details
        })

        return res.status(500).json({ 
          ok: false, 
          code: 'DATABASE_ERROR',
          message: `Failed to log error: ${error.message}`,
          details: error.details,
          hint: error.hint
        })
      }

      const duration = Date.now() - requestStart
      console.info(`[error_log] Error logged successfully in ${duration}ms for ${errorData.endpoint}`)
      
      res.status(200).json({
        ok: true,
        message: 'Error logged successfully'
      })
    }

  } catch (error) {
    const duration = Date.now() - requestStart
    console.error(`[error_log] Unexpected error in ${duration}ms:`, error)
    
    res.status(500).json({ 
      ok: false, 
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while logging error' 
    })
  }
}