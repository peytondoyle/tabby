import { createClient } from '@supabase/supabase-js'

// Environment variables with fallbacks
const SB_URL = 
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL

const SB_SECRET = process.env.SUPABASE_SECRET_KEY

console.log('[supabase_init] Initializing with URL:', SB_URL || 'NOT SET')
console.log('[supabase_init] Has secret key:', !!SB_SECRET)

// Server-side Supabase client using secret key
export const supabaseAdmin = (SB_URL && SB_SECRET)
  ? createClient(SB_URL, SB_SECRET, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    })
  : null

export { SB_URL, SB_SECRET }
