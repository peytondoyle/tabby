import { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from '../_lib/cors.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const requestStart = Date.now()

  // Apply CORS
  if (applyCors(req, res)) return

  // Only allow GET
  if (req.method !== 'GET') {
    console.warn(`[env_diag] Method not allowed: ${req.method}`)
    return res.status(405).json({ 
      ok: false, 
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only GET method is allowed' 
    })
  }

  // Guard: only allow in development (Vercel dev doesn't set NODE_ENV)
  const isDev = process.env.NODE_ENV !== 'production' || !process.env.VERCEL_URL
  if (!isDev) {
    const duration = Date.now() - requestStart
    console.warn(`[env_diag] Not allowed in production (${duration}ms)`)
    return res.status(404).json({
      ok: false,
      code: 'NOT_FOUND',
      message: 'This endpoint is only available in development'
    })
  }

  try {
    // Environment variables with fallbacks
    const SB_URL = 
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL

    const SB_SECRET = process.env.SUPABASE_SECRET_KEY
    const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

    // Check if OCR provider keys are available
    const hasOCRProviders = !!(
      process.env.GOOGLE_CLOUD_VISION_API_KEY ||
      process.env.AWS_ACCESS_KEY_ID ||
      process.env.AZURE_VISION_ENDPOINT ||
      process.env.OCR_SPACE_API_KEY
    )

    const diagnostics = {
      supabase_url: !!SB_URL,
      supabase_secret: !!SB_SECRET,
      anon_key: !!ANON_KEY,
      ocr_providers: hasOCRProviders,
      feature_flags: {
        require_supabase_persist: process.env.REQUIRE_SUPABASE_PERSIST === '1',
        require_real_ocr: process.env.REQUIRE_REAL_OCR === '1',
        allow_dev_fallback: process.env.VITE_ALLOW_DEV_FALLBACK !== '0',
        allow_local_fallback: process.env.VITE_ALLOW_LOCAL_FALLBACK === '1',
      }
    }

    const duration = Date.now() - requestStart
    console.info(`[env_diag] Environment diagnostics completed in ${duration}ms`)
    
    res.status(200).json({
      ok: true,
      ...diagnostics
    })

  } catch (error) {
    const duration = Date.now() - requestStart
    console.error(`[env_diag] Unexpected error in ${duration}ms:`, error)
    
    res.status(500).json({ 
      ok: false, 
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred during diagnostics' 
    })
  }
}