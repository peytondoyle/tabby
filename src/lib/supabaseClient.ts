import { createClient } from '@supabase/supabase-js'
import { assertEnvVars, hasLocalFallbacks } from './assertEnv'

// Assert Supabase environment variables at startup
assertEnvVars(
  ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
  hasLocalFallbacks
)

// Get Supabase configuration (trim any whitespace/newlines)
const SUPABASE_URL = typeof import.meta.env.VITE_SUPABASE_URL === 'string'
  ? import.meta.env.VITE_SUPABASE_URL.trim()
  : ''
const SUPABASE_ANON_KEY = typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string'
  ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
  : ''

// Warn if secret key is accidentally used in client code
if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.startsWith('sb_secret_')) {
  console.error(
    '🚨 CRITICAL SECURITY WARNING: Secret key detected in client code!\n' +
    'The secret key should NEVER be used in client-side code.\n' +
    'Use the anon key instead.'
  )
  // In production, we should throw an error here
  if (!import.meta.env.DEV) {
    throw new Error('Secret key cannot be used in client-side code')
  }
}

const hasValidCredentials = SUPABASE_URL && SUPABASE_ANON_KEY

// Only create client if we have valid credentials
export const supabase = hasValidCredentials
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      db: {
        schema: 'tabby'
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window?.localStorage
      }
    })
  : null

// Helper function to check if Supabase is available
export const isSupabaseAvailable = () => {
  return !!supabase
}

// Database types (to be generated from schema)
export interface Database {
  public: {
    Tables: {
      bills: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          total: number
          tax: number
          tip: number
          tax_mode: 'proportional' | 'even'
          tip_mode: 'proportional' | 'even'
          include_zero_people: boolean
          editor_token: string
          viewer_token: string
          receipt_url?: string
          receipt_thumb_url?: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          total: number
          tax: number
          tip: number
          tax_mode?: 'proportional' | 'even'
          tip_mode?: 'proportional' | 'even'
          include_zero_people?: boolean
          editor_token: string
          viewer_token: string
          receipt_url?: string
          receipt_thumb_url?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          total?: number
          tax?: number
          tip?: number
          tax_mode?: 'proportional' | 'even'
          tip_mode?: 'proportional' | 'even'
          include_zero_people?: boolean
          editor_token?: string
          viewer_token?: string
          receipt_url?: string
          receipt_thumb_url?: string
        }
      }
      people: {
        Row: {
          id: string
          bill_id: string
          created_at: string
          name: string
          avatar_url?: string
          venmo_handle?: string
          is_paid: boolean
        }
        Insert: {
          id?: string
          bill_id: string
          created_at?: string
          name: string
          avatar_url?: string
          venmo_handle?: string
          is_paid?: boolean
        }
        Update: {
          id?: string
          bill_id?: string
          created_at?: string
          name?: string
          avatar_url?: string
          venmo_handle?: string
          is_paid?: boolean
        }
      }
      items: {
        Row: {
          id: string
          bill_id: string
          created_at: string
          emoji: string
          label: string
          price: number
          quantity: number
          line_number?: number
          confidence?: number
        }
        Insert: {
          id?: string
          bill_id: string
          created_at?: string
          emoji: string
          label: string
          price: number
          quantity?: number
          line_number?: number
          confidence?: number
        }
        Update: {
          id?: string
          bill_id?: string
          created_at?: string
          emoji?: string
          label?: string
          price?: number
          quantity?: number
          line_number?: number
          confidence?: number
        }
      }
      item_shares: {
        Row: {
          id: string
          item_id: string
          person_id: string
          created_at: string
          weight: number
        }
        Insert: {
          id?: string
          item_id: string
          person_id: string
          created_at?: string
          weight: number
        }
        Update: {
          id?: string
          item_id?: string
          person_id?: string
          created_at?: string
          weight?: number
        }
      }
      bill_groups: {
        Row: {
          id: string
          bill_id: string
          created_at: string
          name: string
          is_active: boolean
        }
        Insert: {
          id?: string
          bill_id: string
          created_at?: string
          name: string
          is_active?: boolean
        }
        Update: {
          id?: string
          bill_id?: string
          created_at?: string
          name?: string
          is_active?: boolean
        }
      }
      bill_group_members: {
        Row: {
          id: string
          group_id: string
          person_id: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          person_id: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          person_id?: string
          created_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          created_at: string
          name: string
          description?: string
          start_date?: string
          end_date?: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string
          start_date?: string
          end_date?: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string
          start_date?: string
          end_date?: string
        }
      }
    }
  }
}
