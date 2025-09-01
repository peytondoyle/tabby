import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from './_lib/cors.js'

// Server-side Supabase client using secret key
const supabaseAdmin = process.env.SUPABASE_SECRET_KEY 
  ? createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Apply CORS
  if (applyCors(req, res)) return

  const startTime = Date.now()
  
  // Check environment variables
  const envStatus = {
    VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    SUPABASE_SECRET_KEY: !!process.env.SUPABASE_SECRET_KEY,
    supabaseAdmin: !!supabaseAdmin,
    NODE_ENV: process.env.NODE_ENV
  }

  let dbStatus = null
  let dbError = null
  
  // Test database connection
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('bills')
        .select('id')
        .limit(1)
      
      if (error) {
        dbError = {
          message: error.message,
          code: error.code,
          details: error.details
        }
      } else {
        dbStatus = 'connected'
      }
    } catch (error) {
      dbError = {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'connection_error'
      }
    }
  }

  const duration = Date.now() - startTime

  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    duration_ms: duration,
    environment: envStatus,
    database: {
      status: dbStatus,
      error: dbError
    }
  })
}