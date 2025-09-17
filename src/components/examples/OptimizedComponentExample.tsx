import React, { useMemo } from 'react'
import { usePeople, useItems, useItemAssignments, usePersonTotal, useAssignedHash, createItemKey } from '@/lib/flowStoreSelectors'
import { MemoizedItemRow } from '@/components/ItemRow/MemoizedItemRow'
import { MemoizedPersonChip } from '@/components/PeopleDock/MemoizedPersonChip'
import { OptimizedDnDProvider } from '@/components/DragDropAssign/OptimizedDnDProvider'

/**
 * Example component demonstrating optimized state management and memoization
 * 
 * Key optimizations:
 * 1. Uses granular selectors instead of broad store access
 * 2. Memoizes components with stable keys
 * 3. Uses stable DnD sensors
 * 4. Prevents unnecessary re-renders
 */

export const OptimizedComponentExample: React.FC = () => {
  // Use granular selectors - only re-render when specific data changes
  const people = usePeople()
  const items = useItems()
  const getItemAssignments = useItemAssignments
  const getPersonTotal = usePersonTotal

  // Memoize expensive computations
  const peopleWithTotals = useMemo(() => 
    people.map(person => ({
      ...person,
      total: getPersonTotal(person.id),
      assignedItemsCount: getItemAssignments(person.id).length
    })), 
    [people, getPersonTotal, getItemAssignments]
  )

  // Memoize items with assigned hash for stable keys
  const itemsWithHashes = useMemo(() => 
    items.map(item => ({
      ...item,
      assignedHash: useAssignedHash(item.id)
    })), 
    [items]
  )

  return (
    <OptimizedDnDProvider>
      <div className="space-y-6">
        {/* People Section - Only re-renders when people or their totals change */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">People</h2>
          <div className="flex gap-4">
            {peopleWithTotals.map(person => (
              <MemoizedPersonChip
                key={createPersonKey(person.id, person.assignedItemsCount)}
                person={{...person, is_archived: false}}
                editorToken=""
                onUpdate={() => {}}
                assignedItems={[]}
                personTotal={{ 
                  subtotal: person.total, 
                  tax_share: 0, 
                  tip_share: 0, 
                  total: person.total 
                }}
                assignedHash={person.assignedItemsCount.toString()}
              />
            ))}
          </div>
        </div>

        {/* Items Section - Only re-renders when items or their assignments change */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Items</h2>
          <div className="space-y-2">
            {itemsWithHashes.map(item => (
              <MemoizedItemRow
                key={createItemKey(item.id, item.price, item.assignedHash)}
                item={{
                  id: item.id,
                  emoji: item.emoji || '📦',
                  label: item.label,
                  price: item.price,
                  quantity: item.quantity || 1,
                  unit_price: item.price / (item.quantity || 1)
                }}
                editorToken=""
                onUpdate={() => {}}
                assignedHash={item.assignedHash}
              />
            ))}
          </div>
        </div>
      </div>
    </OptimizedDnDProvider>
  )
}

// Helper function for creating stable person keys
const createPersonKey = (personId: string, assignedItemsCount: number) => 
  `${personId}-${assignedItemsCount}`
