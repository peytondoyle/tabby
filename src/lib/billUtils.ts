import { supabase, isSupabaseAvailable } from './supabaseClient'
import type { OcrParsedReceipt, OcrLineItem } from '@/types/domain'
import { logServer } from './errorLogger'
import { showError } from './exportUtils'

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
  ocr_json?: OcrParsedReceipt
  trip_id?: string
  items?: OcrLineItem[]
}

// Helper function to check if we should show dev mocks
const shouldShowDevMocks = (): boolean => {
  // Only in dev mode and with ?dev=1 query param
  return !import.meta.env.PROD && new URLSearchParams(window.location.search).get('dev') === '1'
}

// Helper function to create mock bill data
const createMockBill = (token: string): Bill => ({
  id: 'mock-bill-id',
  title: '🍕 Pizza & Beers',
  place: 'Tony\'s Pizzeria',
  date: '2025-01-02',
  currency: 'USD',
  subtotal: 40.00,
  sales_tax: 4.00,
  tip: 6.00,
  tax_split_method: 'proportional',
  tip_split_method: 'proportional',
  include_zero_item_people: true,
  editor_token: token,
  viewer_token: token
})

export const getBillByToken = async (token: string): Promise<Bill | null> => {
  
  // Always check localStorage first for scanned bills (they start with "scanned-")
  if (token.startsWith('scanned-')) {
    console.log('Checking localStorage for scanned bill token:', token)
    
    // Check for scanned bill in localStorage (try both formats)
    const stored1 = localStorage.getItem(`bill-${token}`)
    const stored2 = localStorage.getItem(`bill_${token}`)
    console.log('Checking localStorage bill-' + token + ':', stored1 ? 'found' : 'not found')
    console.log('Checking localStorage bill_' + token + ':', stored2 ? 'found' : 'not found')
    
    const stored = stored1 || stored2
    if (stored) {
      try {
        const billData = JSON.parse(stored)
        console.log('Found scanned bill in localStorage:', billData)
        
        // Convert to the expected Bill format
        return {
          id: billData.id || token,
          title: billData.title || billData.restaurant_name || 'Scanned Receipt',
          place: billData.place || billData.location,
          date: billData.date,
          currency: 'USD',
          subtotal: billData.subtotal || 0,
          sales_tax: billData.tax || billData.sales_tax || 0,
          tip: billData.tip || 0,
          tax_split_method: 'proportional',
          tip_split_method: 'proportional', 
          include_zero_item_people: false,
          editor_token: token,
          viewer_token: token + '_viewer',
          receipt_file_path: billData.receipt_file_path,
          ocr_json: billData.ocr_json,
          trip_id: billData.trip_id,
          items: billData.items || []
        }
      } catch (error) {
        console.error('Error parsing stored bill data:', error)
        logServer('error', 'Failed to parse stored bill data', { error, context: 'getBillByToken.localStorage' })
      }
    } else {
      console.warn('Scanned bill not found in localStorage for token:', token)
    }
    
    // Return null if not found
    return null
  }

  // If Supabase is not available, show error and return null
  if (!isSupabaseAvailable()) {
    console.warn('Supabase not available for token:', token)
    showError('Can\'t load bill. Check your link or try again.')
    return null
  }

  try {
    const { data, error } = await supabase!.rpc('get_bill_by_token', {
      bill_token: token
    })

    if (error) {
      console.warn('Supabase RPC error:', error)
      showError('Can\'t load bill. Check your link or try again.')
      return null
    }
    
    return data?.[0] || null
  } catch (error) {
    console.error('Error fetching bill:', error)
    logServer('error', 'Failed to fetch bill', { error, context: 'getBillByToken.supabase' })
    showError('Can\'t load bill. Check your link or try again.')
    
    // Only return mock data in dev mode with ?dev=1 query param
    if (shouldShowDevMocks()) {
      console.log('Dev mode: returning mock bill data')
      return createMockBill(token)
    }
    
    return null
  }
}


export function generateBillTitle(items: OcrLineItem[], fileName?: string): string {
  if (items.length === 0) return fileName ? `Receipt from ${fileName}` : 'New Receipt'
  
  // Try to infer venue type from items
  const foodKeywords = ['pizza', 'burger', 'sandwich', 'salad', 'pasta', 'soup']
  const drinkKeywords = ['beer', 'wine', 'cocktail', 'coffee', 'tea', 'soda']
  
  const hasFood = items.some(item => 
    foodKeywords.some(keyword => 
      item.label.toLowerCase().includes(keyword)
    )
  )
  
  const hasDrinks = items.some(item =>
    drinkKeywords.some(keyword =>
      item.label.toLowerCase().includes(keyword)
    )
  )

  if (hasFood && hasDrinks) {
    return '🍽️ Dinner & Drinks'
  } else if (hasFood) {
    return '🍕 Food Order'
  } else if (hasDrinks) {
    return '🍻 Drinks'
  } else {
    return `📄 Receipt (${items.length} items)`
  }
}
