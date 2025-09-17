import { QueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseAvailable } from './supabaseClient'
import { logServer } from './errorLogger'
import { validateWeight, validateItemWeights, findExistingShare, validateAllItemWeights, type ItemShare } from './computeTotals'
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
    // Validate weight
    validateWeight(weight)

    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available - mocking item share upsert')
      return { item_id: itemId, person_id: personId, weight }
    }

    // Check for existing share before upserting
    const { data: existingShares, error: fetchError } = await supabase!.rpc('get_item_shares_by_token', {
      bill_token: editorToken // Using editorToken as bill_token for now
    })

    if (fetchError) {
      console.warn('Failed to fetch existing shares, proceeding with upsert:', fetchError)
    }

    // Convert to ItemShare format for validation
    const shares: ItemShare[] = existingShares?.map((share: any) => ({
      item_id: share.item_id,
      person_id: share.person_id,
      weight: share.weight
    })) || []

    // Check if this specific (item_id, person_id) combination already exists
    const existingShare = findExistingShare(shares, itemId, personId)

    if (existingShare) {
      // Update existing share instead of creating duplicate
      const { data, error } = await supabase!.rpc('upsert_item_share_with_editor_token', {
        etoken: editorToken,
        item_id: itemId,
        person_id: personId,
        weight
      })

      if (error) throw error
      return data
    }

    // Validate that all weights for this item wouldn't sum to 0
    validateItemWeights(itemId, shares, weight, personId)

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

    // Check existing shares before deletion to validate
    const { data: existingShares, error: fetchError } = await supabase!.rpc('get_item_shares_by_token', {
      bill_token: editorToken
    })

    if (fetchError) {
      console.warn('Failed to fetch existing shares, proceeding with deletion:', fetchError)
    } else {
      // Convert to ItemShare format for validation
      const shares: ItemShare[] = existingShares?.map((share: any) => ({
        item_id: share.item_id,
        person_id: share.person_id,
        weight: share.weight
      })) || []

      // Check if removing this share would leave the item with no positive weights
      const itemShares = shares.filter(share => share.item_id === itemId)
      const otherWeights = itemShares
        .filter(share => share.person_id !== personId)
        .reduce((sum, share) => sum + share.weight, 0)
      
      if (otherWeights <= 0) {
        throw new Error('Cannot remove this assignment - each item needs at least one person with weight > 0')
      }
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

// Mutation for bulk upserting multiple item shares
export const useBulkUpsertItemSharesMutation = (editorToken: string) => ({
  mutationFn: async (shares: { itemId: string, personId: string, weight: number }[]) => {
    // Validate all weights first
    for (const share of shares) {
      validateWeight(share.weight)
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available - mocking bulk item share upsert')
      return shares.map(share => ({ item_id: share.itemId, person_id: share.personId, weight: share.weight }))
    }

    // Get existing shares for validation
    const { data: existingShares, error: fetchError } = await supabase!.rpc('get_item_shares_by_token', {
      bill_token: editorToken
    })

    if (fetchError) {
      console.warn('Failed to fetch existing shares, proceeding with bulk upsert:', fetchError)
    } else {
      // Convert to ItemShare format for validation
      const currentShares: ItemShare[] = existingShares?.map((share: any) => ({
        item_id: share.item_id,
        person_id: share.person_id,
        weight: share.weight
      })) || []

      // Create a map of new shares for validation
      const newShares: ItemShare[] = shares.map(share => ({
        item_id: share.itemId,
        person_id: share.personId,
        weight: share.weight
      }))

      // Merge current and new shares, with new shares taking precedence
      const mergedShares = [...currentShares]
      for (const newShare of newShares) {
        const existingIndex = mergedShares.findIndex(share => 
          share.item_id === newShare.item_id && share.person_id === newShare.person_id
        )
        if (existingIndex >= 0) {
          mergedShares[existingIndex] = newShare
        } else {
          mergedShares.push(newShare)
        }
      }

      // Validate that no item would have all weights <= 0
      validateAllItemWeights(mergedShares)
    }

    // Execute bulk upsert
    const promises = shares.map(share =>
      supabase!.rpc('upsert_item_share_with_editor_token', {
        etoken: editorToken,
        item_id: share.itemId,
        person_id: share.personId,
        weight: share.weight
      })
    )

    const results = await Promise.all(promises)
    
    // Check for errors
    for (const result of results) {
      if (result.error) throw result.error
    }

    return results.map(result => result.data)
  },
  onSuccess: () => {
    // Invalidate shares and items queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['shares'] })
    queryClient.invalidateQueries({ queryKey: ['items'] })
  }
})