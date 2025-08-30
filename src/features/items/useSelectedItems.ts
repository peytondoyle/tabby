import { useState, useCallback } from 'react';

export function useSelectedItems() {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedItemIds(new Set());
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedItemIds(new Set(ids));
  }, []);

  const add = useCallback((id: string) => {
    setSelectedItemIds(prev => new Set([...prev, id]));
  }, []);

  const remove = useCallback((id: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const has = useCallback((id: string) => {
    return selectedItemIds.has(id);
  }, [selectedItemIds]);

  const size = selectedItemIds.size;
  const selectedArray = Array.from(selectedItemIds);

  return {
    selectedItemIds,
    selectedArray,
    size,
    toggle,
    clear,
    selectAll,
    add,
    remove,
    has,
    isEmpty: size === 0
  };
}
