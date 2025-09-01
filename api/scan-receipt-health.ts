import { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from './_lib/cors'

/**
 * Health check alias for /api/scan-receipt-health
 * 
 * This provides a dedicated health endpoint that's easier to curl/test
 * and doesn't interfere with the main scan endpoint
 */

const startTime = Date.now()

interface HealthResponse {
  ok: boolean
  uptimeMs: number
  service: string
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Apply CORS headers and handle OPTIONS preflight
  if (applyCors(req, res)) return

  const requestStart = Date.now()
  
  console.log(`[health_api] ${req.method || 'GET'} ${req.url}`)

  try {

    // Only allow GET requests
    if (req.method !== 'GET') {
      const duration = Date.now() - requestStart
      console.log(`[health_api] Method ${req.method} not allowed, completed in ${duration}ms`)
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const response: HealthResponse = {
      ok: true,
      uptimeMs: Date.now() - startTime,
      service: 'scan-receipt'
    }

    const duration = Date.now() - requestStart
    console.log(`[health_api] Health check completed in ${duration}ms - uptime: ${response.uptimeMs}ms`)
    
    res.status(200).json(response)

  } catch (error) {
    const duration = Date.now() - requestStart
    console.error(`[health_api] Health check error in ${duration}ms:`, error)
    
    res.status(500).json({
      ok: false,
      uptimeMs: Date.now() - startTime,
      service: 'scan-receipt',
      error: 'Health check failed'
    })
  }
}