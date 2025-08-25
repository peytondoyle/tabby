import { createClient } from '@supabase/supabase-js'

// Check if we have proper Supabase credentials
const hasValidCredentials = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create client if we have valid credentials
export const supabase = hasValidCredentials 
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Helper function to check if Supabase is available
export const isSupabaseAvailable = () => !!supabase

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
