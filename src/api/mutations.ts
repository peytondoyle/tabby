import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError, showSuccess as _showSuccess } from '@/lib/exportUtils';
import { apiFetch } from '@/lib/apiClient';
// import { mockDataStore } from '@/lib/mockData'; // DEPRECATED - removed


export function useUnassignItem(billToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, personId, editorToken }: { itemId: string, personId: string, editorToken: string }) => {
      console.log('[item_unassign] Unassign mutation called via server API:', { itemId, personId, editorToken });
      
      // Use the server API to delete item share
      const response = await apiFetch('/api/item-shares/delete', {
        method: 'POST',
        body: JSON.stringify({
          item_id: itemId,
          person_id: personId,
          editor_token: editorToken
        })
      })

      if (!response.ok) {
        console.error('[item_unassign] Server API failed:', response.error)
        throw new Error(response.error || 'Failed to unassign item via server API')
      }
      
      console.log('[item_unassign] Item unassigned successfully via server API');
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
