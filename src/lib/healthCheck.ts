import { supabase, isSupabaseAvailable } from './supabaseClient'

/**
 * Dev-only health check to verify RPC availability
 */
export function runHealthCheck() {
  if (!import.meta.env.DEV) return
  
  if (!isSupabaseAvailable() || !supabase) {
    console.warn('[Tabby] RPC check ❌ Supabase not available')
    return
  }

  supabase.rpc('list_bills').then(r => {
    if (r.error) {
      console.warn('[Tabby] RPC check ❌ list_bills not available:', r.error.message)
    } else {
      console.log('[Tabby] RPC check ✅ list_bills OK')
    }
  }, (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn('[Tabby] RPC check ❌ health probe failed:', errorMessage)
  })
}