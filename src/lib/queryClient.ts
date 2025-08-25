import { QueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseAvailable } from './supabaseClient'

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Custom hooks for data fetching
export const useBillQuery = (billToken: string) => ({
  queryKey: ['bill', billToken],
  queryFn: async () => {
    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available - returning mock bill data')
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

    const { data, error } = await supabase!.rpc('get_bill_by_token', {
      bill_token: billToken
    })

    if (error) throw error
    return data?.[0] || null
  },
  enabled: !!billToken
})

export const usePeopleQuery = (billToken: string) => ({
  queryKey: ['people', billToken],
  queryFn: async () => {
    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available - returning mock people data')
      return [
        {
          id: 'person-1',
          name: 'Alice',
          avatar_url: '👩',
          venmo_handle: 'alice-smith',
          is_archived: false
        },
        {
          id: 'person-2',
          name: 'Bob',
          avatar_url: '👨',
          venmo_handle: 'bob-jones',
          is_archived: false
        },
        {
          id: 'person-3',
          name: 'Charlie',
          avatar_url: '🧑',
          venmo_handle: 'charlie-brown',
          is_archived: false
        }
      ]
    }

    const { data, error } = await supabase!.rpc('get_people_by_token', {
      bill_token: billToken
    })

    if (error) throw error
    return data || []
  },
  enabled: !!billToken
})

export const useItemsQuery = (billToken: string) => ({
  queryKey: ['items', billToken],
  queryFn: async () => {
    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available - returning mock items data')
      return [
        {
          id: 'item-1',
          emoji: '☕',
          label: 'Cappuccino',
          price: 4.50,
          quantity: 1,
          unit_price: 4.50
        },
        {
          id: 'item-2',
          emoji: '🥐',
          label: 'Croissant',
          price: 3.25,
          quantity: 1,
          unit_price: 3.25
        },
        {
          id: 'item-3',
          emoji: '🥗',
          label: 'Caesar Salad',
          price: 12.99,
          quantity: 1,
          unit_price: 12.99
        }
      ]
    }

    const { data, error } = await supabase!.rpc('get_items_by_token', {
      bill_token: billToken
    })

    if (error) throw error
    return data || []
  },
  enabled: !!billToken
})

export const useSharesQuery = (billToken: string) => ({
  queryKey: ['shares', billToken],
  queryFn: async () => {
    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available - returning mock shares data')
      return [
        { item_id: 'item-1', person_id: 'person-1', weight: 1 },
        { item_id: 'item-2', person_id: 'person-2', weight: 1 },
        { item_id: 'item-3', person_id: 'person-1', weight: 0.5 },
        { item_id: 'item-3', person_id: 'person-2', weight: 0.5 }
      ]
    }

    const { data, error } = await supabase!.rpc('get_item_shares_by_token', {
      bill_token: billToken
    })

    if (error) throw error
    return data || []
  },
  enabled: !!billToken
})

// Mutation for upserting item shares
export const useUpsertItemShareMutation = (billToken: string) => ({
  mutationFn: async ({ itemId, personId, weight }: { itemId: string, personId: string, weight: number }) => {
    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available - mocking item share upsert')
      return { item_id: itemId, person_id: personId, weight }
    }

    const { data, error } = await supabase!.rpc('upsert_item_share_with_editor_token', {
      etoken: billToken,
      item_id: itemId,
      person_id: personId,
      weight
    })

    if (error) throw error
    return data
  },
  onSuccess: () => {
    // Invalidate shares query to refetch data
    queryClient.invalidateQueries({ queryKey: ['shares', billToken] })
  }
})
