import { createClient } from '@supabase/supabase-js';

/**
 * Get a Supabase client with service role key for server-side operations
 * This client has full database access and bypasses RLS
 */
export function getSupabaseServiceClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://evraslbpgcafyvvtbqxy.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SECRET_KEY environment variable is required');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
