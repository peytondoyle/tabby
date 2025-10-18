/**
 * Enhanced Edge Function with KV Support
 * Automatically uses KV if available, falls back to in-memory caching
 */

// Edge runtime configuration
export const config = {
  runtime: 'edge',
  regions: ['iad1', 'sfo1', 'lhr1', 'syd1'], // Global distribution
}

// Simple in-memory cache (fallback)
const edgeCache = new Map<string, { result: any; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

// Generate simple hash for caching
function generateImageHash(imageBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(imageBuffer)
  let hash = 0
  for (let i = 0; i < Math.min(bytes.length, 1024); i++) {
    hash = ((hash << 5) - hash + bytes[i]) & 0xffffffff
  }
  return Math.abs(hash).toString(36)
}

// Clean expired cache entries
function cleanupCache(): void {
  const now = Date.now()
  for (const [key, value] of edgeCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      edgeCache.delete(key)
    }
  }
}

// Redis Cache functions
async function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL
  
  if (!redisUrl) {
    return null
  }
  
  return redisUrl
}

async function getCachedResult(imageHash: string): Promise<any | null> {
  const redisUrl = await getRedisConnection()
  
  if (!redisUrl) {
    // Fallback to in-memory cache
    const cachedEntry = edgeCache.get(imageHash)
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
      return cachedEntry.result
    }
    return null
  }
  
  try {
    // Parse Redis URL
    const url = new URL(redisUrl)
    const host = url.hostname
    const port = parseInt(url.port) || 6379
    const password = url.password
    
    // Simple Redis GET request
    const response = await fetch(`https://${host}:${port}/get/receipt:${imageHash}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`:${password}`)}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (response.ok) {
      const data = await response.text()
      if (data && data !== 'null') {
        return JSON.parse(data)
      }
    }
  } catch (error) {
    console.warn('[edge] Redis cache read failed, using fallback:', error)
  }
  
  // Fallback to in-memory cache
  const cachedEntry = edgeCache.get(imageHash)
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
    return cachedEntry.result
  }
  
  return null
}

async function setCachedResult(imageHash: string, result: any): Promise<void> {
  const redisUrl = await getRedisConnection()
  
  if (!redisUrl) {
    // Fallback to in-memory cache
    edgeCache.set(imageHash, {
      result,
      timestamp: Date.now()
    })
    return
  }
  
  try {
    // Parse Redis URL
    const url = new URL(redisUrl)
    const host = url.hostname
    const port = parseInt(url.port) || 6379
    const password = url.password
    
    // Simple Redis SETEX request
    await fetch(`https://${host}:${port}/setex/receipt:${imageHash}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`:${password}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: JSON.stringify(result),
        ex: 86400 // 24 hours in seconds
      })
    })
  } catch (error) {
    console.warn('[edge] Redis cache write failed, using fallback:', error)
    // Fallback to in-memory cache
    edgeCache.set(imageHash, {
      result,
      timestamp: Date.now()
    })
  }
}

// OpenAI processing function
async function processWithOpenAI(imageBuffer: ArrayBuffer, mimeType: string) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))
  const imageUrl = `data:${mimeType};base64,${base64}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Fast and cost-effective
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract receipt data as JSON:
              {
                "place": "store name",
                "date": "YYYY-MM-DD",
                "items": [{"label": "item", "price": number}],
                "subtotal": number,
                "tax": number,
                "tip": number,
                "total": number
              }
              
              Rules:
              - Extract ALL line items with prices
              - Use numbers for prices
              - Use null for missing fields
              - Be accurate with prices`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No content in OpenAI response')
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in OpenAI response')
  }

  return JSON.parse(jsonMatch[0])
}

export default async function handler(req: Request) {
  const startTime = Date.now()
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    // Clean up expired cache entries
    cleanupCache()

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return new Response('No file provided', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new Response('Invalid file type', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Convert file to buffer
    const imageBuffer = await file.arrayBuffer()
    const imageHash = generateImageHash(imageBuffer)

    // Check cache first (KV or in-memory)
    const cachedResult = await getCachedResult(imageHash)
    if (cachedResult) {
      console.log(`[edge] Cache hit for ${file.name}`)
      return new Response(JSON.stringify({
        ...cachedResult,
        cached: true,
        processingTime: Date.now() - startTime,
        cacheType: await getRedisConnection() ? 'Redis' : 'memory'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-Type': await getRedisConnection() ? 'Redis' : 'memory',
          'X-Processing-Time': (Date.now() - startTime).toString()
        }
      })
    }

    // Process with OpenAI
    console.log(`[edge] Processing ${file.name} (${imageBuffer.byteLength} bytes)`)
    const result = await processWithOpenAI(imageBuffer, file.type)

    // Cache the result (KV or in-memory)
    await setCachedResult(imageHash, result)

    const processingTime = Date.now() - startTime
    console.log(`[edge] Processing completed in ${processingTime}ms`)

    return new Response(JSON.stringify({
      ...result,
      cached: false,
      processingTime,
      region: process.env.VERCEL_REGION || 'unknown',
      cacheType: await getRedisConnection() ? 'Redis' : 'memory'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'X-Cache-Type': await getRedisConnection() ? 'Redis' : 'memory',
        'X-Processing-Time': processingTime.toString(),
        'X-Region': process.env.VERCEL_REGION || 'unknown'
      }
    })

  } catch (error) {
    console.error('[edge] Processing error:', error)
    
    return new Response(JSON.stringify({
      error: 'Processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
}