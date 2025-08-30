import type { SupabaseClient } from '@supabase/supabase-js'

export type BillSummary = {
  id: string
  token: string
  title: string | null
  place: string | null
  date: string | null
  created_at: string
  item_count: number
  people_count: number
  total_amount: number
}

/**
 * Load bills from localStorage fallback
 */
function loadBillsFromLocalStorage(): BillSummary[] {
  try {
    const localBillsJson = localStorage.getItem('local-bills')
    const localBills = JSON.parse(localBillsJson || '[]')
    
    return localBills.map((bill: any) => ({
      id: bill.id,
      token: bill.token || bill.editor_token,
      title: bill.title,
      place: bill.place || bill.location,
      date: bill.date,
      created_at: bill.created_at,
      item_count: bill.item_count || 0,
      people_count: bill.people_count || 0,
      total_amount: bill.total_amount || bill.total || 0
    }))
  } catch (error) {
    console.error('Error loading bills from localStorage:', error)
    return []
  }
}

/**
 * Fetch bills from Supabase with localStorage fallback
 */
export async function fetchBills(client: SupabaseClient): Promise<BillSummary[]> {
  const { data, error } = await client.rpc('list_bills')
  
  if (error) {
    console.warn('[Tabby] list_bills RPC failed, using local fallback:', error)
    return loadBillsFromLocalStorage()
  }
  
  return (data ?? []) as BillSummary[]
}