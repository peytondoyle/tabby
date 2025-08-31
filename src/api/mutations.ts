import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient';
import { showError, showSuccess as _showSuccess } from '@/lib/exportUtils';
// import { mockDataStore } from '@/lib/mockData'; // DEPRECATED - removed


export function useUnassignItem(billToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, personId, editorToken }: { itemId: string, personId: string, editorToken: string }) => {
      console.log('Unassign mutation called with:', { itemId, personId, editorToken, isSupabaseAvailable: isSupabaseAvailable() });
      
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - mocking item unassignment');
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Mock implementation - no actual data modification needed
        const removed = true;
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
