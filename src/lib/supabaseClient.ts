import { createClient } from '@supabase/supabase-js'

// Check if we have proper Supabase credentials
// Fallback values ensure connection works even if env vars don't load properly
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://evraslbpgcafyvvtbqxy.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cmFzbGJwZ2NhZnl2dnRicXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjQ4MTIsImV4cCI6MjA3MTcwMDgxMn0.X7z5jIFwBFvmD6UrJ6KVkxllmz7BDkvHcwOc5pgb8Ew'

const hasValidCredentials = SUPABASE_URL && SUPABASE_ANON_KEY

// Only create client if we have valid credentials
export const supabase = hasValidCredentials 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
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
