import { QueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseAvailable } from './supabaseClient'
import { logServer } from './errorLogger'
// import { getBillByToken } from './billUtils' // unused

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


export const useItemsQuery = (billToken: string) => ({
  queryKey: ['items', billToken],
  queryFn: async () => {
    // Handle scanned bills from localStorage
    if (billToken.startsWith('scanned-')) {
      const stored = localStorage.getItem(`bill-${billToken}`)
      if (stored) {
        try {
          const billData = JSON.parse(stored)
          return billData.items || []
        } catch (error) {
          console.error('Error parsing stored bill items:', error)
          logServer('error', 'Failed to parse stored bill items', { error, context: 'useItemsQuery.localStorage' })
        }
      }
      return []
    }

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

    try {
      const { data, error } = await supabase!.rpc('get_items_by_token', {
        bill_token: billToken
      })

      if (error) throw error
      return data || []
    } catch (error) {
      console.warn('Supabase items query failed, using mock data:', error)
      return []
    }
  },
  enabled: !!billToken
})

export const useSharesQuery = (billToken: string) => ({
  queryKey: ['shares', billToken],
  queryFn: async () => {
    // Handle scanned bills from localStorage (no shares initially)
    if (billToken.startsWith('scanned-')) {
      return []
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available - returning mock shares data')
      return [
        { item_id: 'item-1', person_id: 'person-1', weight: 1 },
        { item_id: 'item-2', person_id: 'person-2', weight: 1 },
        { item_id: 'item-3', person_id: 'person-1', weight: 0.5 },
        { item_id: 'item-3', person_id: 'person-2', weight: 0.5 }
      ]
    }

    try {
      const { data, error } = await supabase!.rpc('get_item_shares_by_token', {
        bill_token: billToken
      })

      if (error) throw error
      return data || []
    } catch (error) {
      console.warn('Supabase shares query failed, using mock data:', error)
      return []
    }
  },
  enabled: !!billToken
})

// Mutation for upserting item shares
export const useUpsertItemShareMutation = (editorToken: string) => ({
  mutationFn: async ({ itemId, personId, weight }: { itemId: string, personId: string, weight: number }) => {
    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available - mocking item share upsert')
      return { item_id: itemId, person_id: personId, weight }
    }

    const { data, error } = await supabase!.rpc('upsert_item_share_with_editor_token', {
      etoken: editorToken,
      item_id: itemId,
      person_id: personId,
      weight
    })

    if (error) throw error
    return data
  },
  onSuccess: () => {
    // Invalidate shares and items queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['shares'] })
    queryClient.invalidateQueries({ queryKey: ['items'] })
  }
})

// Mutation for deleting item shares
export const useDeleteItemShareMutation = (editorToken: string) => ({
  mutationFn: async ({ itemId, personId }: { itemId: string, personId: string }) => {
    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available - mocking item share deletion')
      return true
    }

    const { data, error } = await supabase!.rpc('delete_item_share_with_editor_token', {
      etoken: editorToken,
      item_id: itemId,
      person_id: personId
    })

    if (error) throw error
    return data
  },
  onSuccess: () => {
    // Invalidate shares and items queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['shares'] })
    queryClient.invalidateQueries({ queryKey: ['items'] })
  }
})
