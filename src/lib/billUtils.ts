import { supabase, isSupabaseAvailable } from './supabaseClient'
import type { OcrItem, OcrResult } from './ocr'

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
      }
    } else {
      console.warn('Scanned bill not found in localStorage for token:', token)
    }
    
    // Return null if not found
    return null
  }

  // If Supabase is not available, return mock data for non-scanned bills
  if (!isSupabaseAvailable()) {
    console.warn('Supabase not available - returning mock data for token:', token)
    return {
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
    }
  }

  try {
    const { data, error } = await supabase!.rpc('get_bill_by_token', {
      bill_token: token
    })

    if (error) {
      console.warn('Supabase RPC error, falling back to mock data:', error)
      // Fall back to mock data if RPC doesn't exist yet
      return {
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
      }
    }
    
    return data?.[0] || null
  } catch (error) {
    console.error('Error fetching bill, falling back to mock data:', error)
    // Fall back to mock data on any error
    return {
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
    }
  }
}

export const isEditorToken = async (token: string): Promise<boolean> => {
  const bill = await getBillByToken(token)
  return bill?.editor_token === token
}

export const createBillFromOcr = async (ocrResults: (OcrResult & { file: File })[]): Promise<{ editor_token: string } | null> => {
  // Generate random tokens
  const editorToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const viewerToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  // Combine all items from multiple receipts
  const allItems = ocrResults.flatMap(result => result.items)
  
  // Calculate totals from OCR results
  const subtotal = ocrResults.reduce((sum, result) => sum + (result.subtotal || 0), 0)
  const tax = ocrResults.reduce((sum, result) => sum + (result.tax || 0), 0)
  const tip = ocrResults.reduce((sum, result) => sum + (result.tip || 0), 0)

  // Generate a title based on receipt content
  const title = generateBillTitle(allItems, ocrResults[0]?.file.name)

  if (!isSupabaseAvailable()) {
    console.warn('Supabase not available - returning mock editor token')
    // Store OCR results in localStorage for mock mode
    const billData = {
      id: 'mock-bill-from-ocr',
      title,
      currency: 'USD',
      subtotal,
      sales_tax: tax,
      tip,
      tax_split_method: 'proportional',
      tip_split_method: 'proportional',
      include_zero_item_people: true,
      editor_token: editorToken,
      viewer_token: viewerToken,
      ocr_results: ocrResults,
      items: allItems
    }
    localStorage.setItem(`bill_${editorToken}`, JSON.stringify(billData))
    return { editor_token: editorToken }
  }

  try {
    // Create bill in database
    const { data, error } = await supabase!.from('bills').insert({
      title,
      currency: 'USD',
      subtotal,
      sales_tax: tax,
      tip,
      tax_split_method: 'proportional',
      tip_split_method: 'proportional',
      include_zero_item_people: true,
      editor_token: editorToken,
      viewer_token: viewerToken,
      ocr_json: ocrResults
    }).select().single()

    if (error) throw error

    // Create items from OCR results
    const itemsToInsert = allItems.map(item => ({
      bill_id: data.id,
      label: item.name,
      price_cents: Math.round(item.price * 100),
      quantity: item.quantity || 1
    }))

    await supabase!.from('items').insert(itemsToInsert)

    return { editor_token: editorToken }
  } catch (error) {
    console.error('Error creating bill from OCR:', error)
    return null
  }
}

function generateBillTitle(items: OcrItem[], fileName?: string): string {
  if (items.length === 0) return fileName ? `Receipt from ${fileName}` : 'New Receipt'
  
  // Try to infer venue type from items
  const foodKeywords = ['pizza', 'burger', 'sandwich', 'salad', 'pasta', 'soup']
  const drinkKeywords = ['beer', 'wine', 'cocktail', 'coffee', 'tea', 'soda']
  
  const hasFood = items.some(item => 
    foodKeywords.some(keyword => 
      item.name.toLowerCase().includes(keyword)
    )
  )
  
  const hasDrinks = items.some(item =>
    drinkKeywords.some(keyword =>
      item.name.toLowerCase().includes(keyword)
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
