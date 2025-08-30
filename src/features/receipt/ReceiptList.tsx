import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient';
import { ReceiptItemRow } from '@/components/ReceiptPanel/ReceiptItemRow';
import { useSelectedItems } from '@/features/items/useSelectedItems';
import { showSuccess } from '@/lib/toast';
import { mockDataStore } from '@/lib/mockData';

interface ReceiptListProps {
  billToken?: string;
  editorToken?: string;
  onAssignItems: (itemIds: string[], personId: string) => void;
}

interface ReceiptItem {
  id: string;
  emoji: string;
  label: string;
  price: number;
  quantity: number;
  unit_price: number;
  source?: 'ocr' | 'manual';
}

interface ItemShare {
  item_id: string;
  person_id: string;
  weight: number;
}

export const ReceiptList: React.FC<ReceiptListProps> = ({
  billToken,
  editorToken,
  onAssignItems
}) => {
  const [showAssigned, setShowAssigned] = useState(false);
  const selectedItems = useSelectedItems();

  // React Query hooks
  const { data: items = [] } = useQuery({
    queryKey: ['items', billToken],
    queryFn: async () => {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - using mock items data');
        return [
          {
            id: 'item-1',
            emoji: '☕',
            label: 'Cappuccino',
            price: 4.50,
            quantity: 1,
            unit_price: 4.50,
            source: 'ocr' as const
          },
          {
            id: 'item-2',
            emoji: '🥐',
            label: 'Croissant',
            price: 3.25,
            quantity: 1,
            unit_price: 3.25,
            source: 'ocr' as const
          },
          {
            id: 'item-3',
            emoji: '🥗',
            label: 'Caesar Salad',
            price: 12.99,
            quantity: 1,
            unit_price: 12.99,
            source: 'ocr' as const
          }
        ];
      }

      const { data, error } = await supabase!.rpc('get_items_by_token', {
        bill_token: billToken!
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!billToken
  });

  const { data: shares = [] } = useQuery({
    queryKey: ['shares', billToken],
    queryFn: async () => {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - using mock data store');
        return mockDataStore.getShares();
      }

      const { data, error } = await supabase!.rpc('get_item_shares_by_token', {
        bill_token: billToken!
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!billToken
  });

  const { data: people = [] } = useQuery({
    queryKey: ['people', billToken],
    queryFn: async () => {
      if (!isSupabaseAvailable()) {
        return [
          { id: 'p1', name: 'Alice', avatar_url: '👩', venmo_handle: 'alice-smith', is_archived: false },
          { id: 'p2', name: 'Bob', avatar_url: '👨', venmo_handle: 'bob-jones', is_archived: false },
          { id: 'p3', name: 'Charlie', avatar_url: '🧑', venmo_handle: 'charlie-brown', is_archived: false }
        ];
      }
      
      const { data, error } = await supabase!.rpc('get_people_by_token', {
        bill_token: billToken!
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!billToken
  });

  // Calculate assigned status for each item
  const itemSumWeights = new Map<string, number>();
  const itemAssignments = new Map<string, string[]>(); // item_id -> person names
  
  console.log('ReceiptList: Current shares data:', shares);
  console.log('ReceiptList: Current people data:', people);
  
  shares.forEach(share => {
    // Calculate weights
    const current = itemSumWeights.get(share.item_id) || 0;
    itemSumWeights.set(share.item_id, current + share.weight);
    
    // Calculate assignments (person names)
    const person = people.find(p => p.id === share.person_id);
    if (person) {
      const currentAssignments = itemAssignments.get(share.item_id) || [];
      currentAssignments.push(person.name);
      itemAssignments.set(share.item_id, currentAssignments);
    }
  });

  // Filter items based on assignment status
  const unassignedItems = items.filter(item => {
    const sumWeight = itemSumWeights.get(item.id) || 0;
    return sumWeight === 0;
  });

  const assignedItems = items.filter(item => {
    const sumWeight = itemSumWeights.get(item.id) || 0;
    return sumWeight > 0;
  });

  const displayedItems = showAssigned ? items : unassignedItems;

  // Separate items by source
  const scannedItems = displayedItems.filter(item => item.source === 'ocr' || !item.source);
  const manualItems = displayedItems.filter(item => item.source === 'manual');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectedItems.clear();
      } else if (e.key === 'a' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const visibleUnassignedIds = unassignedItems.map(item => item.id);
        selectedItems.selectAll(visibleUnassignedIds);
        if (visibleUnassignedIds.length > 0) {
          showSuccess(`Selected ${visibleUnassignedIds.length} unassigned items`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, unassignedItems]);

  const handleItemClick = (itemId: string) => {
    selectedItems.toggle(itemId);
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectedItems.toggle(itemId);
    }
  };

  const handleSelectAll = () => {
    const visibleIds = displayedItems.map(item => item.id);
    selectedItems.selectAll(visibleIds);
    if (visibleIds.length > 0) {
      showSuccess(`Selected ${visibleIds.length} items`);
    }
  };

  const total = displayedItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAssigned(!showAssigned)}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              showAssigned 
                ? 'bg-brand text-white' 
                : 'bg-paper text-ink border border-line hover:bg-paper/80'
            }`}
          >
            {showAssigned ? 'Hide Assigned' : 'Show Assigned'}
          </button>
          {selectedItems.size > 0 && (
            <span className="text-xs text-ink-dim">
              {selectedItems.size} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <button
              onClick={selectedItems.clear}
              className="px-3 py-1 text-xs bg-paper text-ink border border-line rounded-lg hover:bg-paper/80 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 text-xs bg-paper text-ink border border-line rounded-lg hover:bg-paper/80 transition-colors"
          >
            Select All
          </button>
        </div>
      </div>

      <AnimatePresence>
        {displayedItems.length > 0 ? (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Scanned Items Section */}
            {scannedItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-ink-dim uppercase tracking-wide">
                  Scanned Items (OCR)
                </h3>
                {scannedItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div
                      className={`rounded-lg border transition-all cursor-pointer ${
                        selectedItems.has(item.id)
                          ? 'ring-2 ring-brand/40 bg-brand/5 border-brand/30'
                          : 'border-line hover:border-brand/30 hover:bg-paper/50'
                      }`}
                      onClick={() => handleItemClick(item.id)}
                      onKeyDown={(e) => handleItemKeyDown(e, item.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <ReceiptItemRow
                        item={item}
                        index={index}
                        onDelete={() => {
                          // TODO: Implement item deletion
                          console.log('Delete item:', item.id);
                        }}
                        isSelected={selectedItems.has(item.id)}
                        onClick={() => handleItemClick(item.id)}
                        assignedTo={itemAssignments.get(item.id) || []}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Manual Items Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-ink-dim uppercase tracking-wide">
                Manual Items
              </h3>
              {manualItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div
                    className={`rounded-lg border transition-all cursor-pointer ${
                      selectedItems.has(item.id)
                        ? 'ring-2 ring-brand/40 bg-brand/5 border-brand/30'
                        : 'border-line hover:border-brand/30 hover:bg-paper/50'
                    }`}
                    onClick={() => handleItemClick(item.id)}
                    onKeyDown={(e) => handleItemKeyDown(e, item.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <ReceiptItemRow
                      item={item}
                      index={index}
                      onDelete={() => {
                        // TODO: Implement item deletion
                        console.log('Delete item:', item.id);
                      }}
                      isSelected={selectedItems.has(item.id)}
                      onClick={() => handleItemClick(item.id)}
                      assignedTo={itemAssignments.get(item.id) || []}
                    />
                  </div>
                </motion.div>
              ))}
              
              {/* Add Item ghost row */}
              <motion.div
                className="px-3 py-2 rounded-lg border-2 border-dashed border-line hover:border-brand/50 hover:bg-brand/5 transition-all cursor-pointer flex items-center gap-3"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  // TODO: Open add item modal/form
                  console.log('Add item clicked');
                }}
              >
                <span className="text-[20px] text-ink-dim">+</span>
                <span className="font-medium text-ink-dim text-[14px]">Add Item</span>
              </motion.div>
            </div>
            
            {/* Section Total */}
            <motion.div 
              className="flex items-center justify-between py-4 border-t border-line mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span className="font-medium text-ink">Subtotal</span>
              <div className="flex items-center">
                <span className="leaders"></span>
                <span className="currency tracking-tight text-ink ml-2 text-lg">
                  ${total.toFixed(2)}
                </span>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* Empty State */
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div 
              className="text-6xl mb-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            >
              🍽️
            </motion.div>
            <p className="text-ink-dim text-lg mb-2">
              {showAssigned ? 'No items yet' : 'All items assigned'}
            </p>
            <p className="text-sm text-ink-dim">
              {showAssigned ? 'Upload a receipt to get started' : 'Great job! All items have been assigned.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
