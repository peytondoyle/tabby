import { supabase, isSupabaseAvailable } from './supabaseClient'

export interface Bill {
  id: string
  title: string
  place?: string
  date?: string
  currency: string
  subtotal: number
  sales_tax: number
  tip: number
  tax_split_method: 'proportional' | 'even'
  tip_split_method: 'proportional' | 'even'
  include_zero_item_people: boolean
  editor_token: string
  viewer_token: string
  receipt_file_path?: string
  ocr_json?: any
  trip_id?: string
}

export const getBillByToken = async (token: string): Promise<Bill | null> => {
  if (!isSupabaseAvailable()) {
    console.warn('Supabase not available - returning mock data')
    // Return mock data for development
    return {
      id: 'mock-bill-id',
      title: 'Coffee & Lunch',
      place: 'Starbucks Downtown',
      date: '2024-12-15',
      currency: 'USD',
      subtotal: 45.67,
      sales_tax: 3.65,
      tip: 9.13,
      tax_split_method: 'proportional',
      tip_split_method: 'proportional',
      include_zero_item_people: true,
      editor_token: 'mock-editor-token',
      viewer_token: 'mock-viewer-token'
    }
  }

  try {
    const { data, error } = await supabase!.rpc('get_bill_by_token', {
      bill_token: token
    })

    if (error) throw error
    
    return data?.[0] || null
  } catch (error) {
    console.error('Error fetching bill:', error)
    return null
  }
}

export const isEditorToken = async (token: string): Promise<boolean> => {
  const bill = await getBillByToken(token)
  return bill?.editor_token === token
}
