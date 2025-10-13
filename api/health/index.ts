import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Check if OpenAI key is available
  const hasOpenAIKey = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim())
  const keyLength = process.env.OPENAI_API_KEY?.length || 0
  const keyPrefix = process.env.OPENAI_API_KEY?.slice(0, 7) || 'missing'

  // Check if Supabase keys are available
  const hasSupabaseUrl = !!process.env.VITE_SUPABASE_URL
  const hasSupabaseSecret = !!process.env.SUPABASE_SECRET_KEY

  res.status(200).json({
    ok: true,
    env: {
      openai: {
        configured: hasOpenAIKey,
        keyLength,
        keyPrefix,
      },
      supabase: {
        hasUrl: hasSupabaseUrl,
        hasSecret: hasSupabaseSecret,
      }
    }
  })
}
