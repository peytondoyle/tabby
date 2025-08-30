import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient';
import { showError, showSuccess } from '@/lib/toast';
import { mockDataStore } from '@/lib/mockData';

export function useAssignItems(billToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemIds, personId, editorToken }: { itemIds: string[], personId: string, editorToken: string }) => {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - mocking item assignment');
        // Actually modify the mock data store
        itemIds.forEach(itemId => {
          mockDataStore.addShare(itemId, personId, 1);
        });
        return itemIds.map(itemId => ({ item_id: itemId, person_id: personId, weight: 1 }));
      }

      const promises = itemIds.map(itemId =>
        supabase!.rpc('upsert_item_share_with_editor_token', {
          etoken: editorToken,
          item_id: itemId,
          person_id: personId,
          weight: 1
        })
      );

      const results = await Promise.all(promises);
      
      // Check for errors
      for (const result of results) {
        if (result.error) throw result.error;
      }

      return results.map(r => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares', billToken] });
      queryClient.invalidateQueries({ queryKey: ['items', billToken] });
    },
    onError: (error) => {
      console.error('Error assigning items:', error);
      showError('Failed to assign items');
    }
  });
}

export function useUnassignItem(billToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, personId, editorToken }: { itemId: string, personId: string, editorToken: string }) => {
      console.log('Unassign mutation called with:', { itemId, personId, editorToken, isSupabaseAvailable: isSupabaseAvailable() });
      
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - mocking item unassignment');
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Actually modify the mock data store
        const removed = mockDataStore.removeShare(itemId, personId);
        console.log('Mock unassignment completed for item:', itemId, 'person:', personId, 'removed:', removed);
        return { success: removed, itemId, personId };
      }

      // Direct delete since the RPC function has issues
      const { data, error } = await supabase!
        .from('item_shares')
        .delete()
        .eq('item_id', itemId)
        .eq('person_id', personId);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      
      console.log('Direct delete successful:', data);
      return { success: true, itemId, personId };
    },
    onSuccess: (data) => {
      console.log('Unassign mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: ['shares', billToken] });
      queryClient.invalidateQueries({ queryKey: ['items', billToken] });
      queryClient.invalidateQueries({ queryKey: ['people', billToken] });
    },
    onError: (error) => {
      console.error('Unassign mutation failed:', error);
      showError('Failed to unassign item');
    }
  });
}
