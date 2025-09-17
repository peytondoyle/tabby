import React, { useRef, useMemo, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { VIRTUALIZATION_CONFIG, shouldVirtualize, getOverscan } from '@/lib/virtualizationConfig'

interface Item {
  id: string
  emoji?: string
  label: string
  price: number
  quantity: number
  unit_price: number
}

interface AssignedPerson {
  id: string
  name: string
  weight: number
}

interface VirtualizedItemListProps {
  items: Item[]
  assignedPeople: Map<string, AssignedPerson[]>
  selectedItems: Set<string>
  onItemSelect: (itemId: string, index: number, event: React.MouseEvent) => void
  onItemMouseDown: (itemId: string, index: number) => void
  onItemMouseUp: () => void
  onItemMouseLeave: () => void
  onItemTouchStart: (itemId: string, index: number) => void
  onItemTouchEnd: () => void
  onAssignItem: (itemId: string, personId: string) => void
  onUnassignItem: (itemId: string, personId: string) => void
  getItemAssignments: (itemId: string) => string[]
  formatPrice: (price: number) => string
  className?: string
  height?: number
  enableVirtualization?: boolean
  virtualizationThreshold?: number
  estimatedItemSize?: number
  overscan?: number
}

// Memoized item row component
const MemoizedItemRow = React.memo<{
  item: Item
  index: number
  isSelected: boolean
  assignedPeople: AssignedPerson[]
  onItemSelect: (itemId: string, index: number, event: React.MouseEvent) => void
  onItemMouseDown: (itemId: string, index: number) => void
  onItemMouseUp: () => void
  onItemMouseLeave: () => void
  onItemTouchStart: (itemId: string, index: number) => void
  onItemTouchEnd: () => void
  onAssignItem: (itemId: string, personId: string) => void
  onUnassignItem: (itemId: string, personId: string) => void
  formatPrice: (price: number) => string
}>(({
  item,
  index,
  isSelected,
  assignedPeople,
  onItemSelect,
  onItemMouseDown,
  onItemMouseUp,
  onItemMouseLeave,
  onItemTouchStart,
  onItemTouchEnd,
  onAssignItem: _onAssignItem,
  onUnassignItem,
  formatPrice
}) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    onItemSelect(item.id, index, e)
  }, [item.id, index, onItemSelect])

  const handleMouseDown = useCallback(() => {
    onItemMouseDown(item.id, index)
  }, [item.id, index, onItemMouseDown])

  const handleTouchStart = useCallback(() => {
    onItemTouchStart(item.id, index)
  }, [item.id, index, onItemTouchStart])

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
        isSelected 
          ? 'bg-primary/10 border-2 border-primary ring-2 ring-primary/20' 
          : 'bg-surface hover:bg-surface-elevated'
      }`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={onItemMouseUp}
      onMouseLeave={onItemMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={onItemTouchEnd}
    >
      <div className="flex items-center gap-3">
        {isSelected && (
          <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs">
            ✓
          </div>
        )}
        <span className="text-xl">{item.emoji || '🍽️'}</span>
        <div className="flex flex-col">
          <span className="text-text-primary font-medium">{item.label}</span>
          {assignedPeople.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-success">Assigned to:</span>
              <span className="text-xs text-success font-medium">
                {assignedPeople.map(p => p.name).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="font-medium text-text-primary">{formatPrice(item.price)}</span>
        {assignedPeople.length > 0 && (
          <div className="flex gap-1">
            {assignedPeople.map(person => (
              <button
                key={person.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onUnassignItem(item.id, person.id)
                }}
                className="p-1 hover:bg-error/10 rounded text-error hover:text-error/80 transition-colors text-xs"
                title={`Remove ${item.label} from ${person.name}`}
              >
                ✕
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for memoization
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.assignedPeople.length === nextProps.assignedPeople.length &&
    prevProps.assignedPeople.every((person, index) => 
      nextProps.assignedPeople[index]?.id === person.id &&
      nextProps.assignedPeople[index]?.weight === person.weight
    )
  )
})

// Stable wrapper component for virtualized rows to maintain drag targets
const VirtualizedRowWrapper = React.memo<{
  virtualRow: any
  measureElement: (element: Element | null) => void
  item: Item
  index: number
  isSelected: boolean
  assignedPeople: AssignedPerson[]
  onItemSelect: (itemId: string, index: number, event: React.MouseEvent) => void
  onItemMouseDown: (itemId: string, index: number) => void
  onItemMouseUp: () => void
  onItemMouseLeave: () => void
  onItemTouchStart: (itemId: string, index: number) => void
  onItemTouchEnd: () => void
  onAssignItem: (itemId: string, personId: string) => void
  onUnassignItem: (itemId: string, personId: string) => void
  formatPrice: (price: number) => string
}>(({
  virtualRow,
  measureElement,
  item,
  index,
  isSelected,
  assignedPeople,
  onItemSelect,
  onItemMouseDown,
  onItemMouseUp,
  onItemMouseLeave,
  onItemTouchStart,
  onItemTouchEnd,
  onAssignItem: _onAssignItem,
  onUnassignItem,
  formatPrice
}) => {
  return (
    <div
      ref={measureElement}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      <MemoizedItemRow
        item={item}
        index={index}
        isSelected={isSelected}
        assignedPeople={assignedPeople}
        onItemSelect={onItemSelect}
        onItemMouseDown={onItemMouseDown}
        onItemMouseUp={onItemMouseUp}
        onItemMouseLeave={onItemMouseLeave}
        onItemTouchStart={onItemTouchStart}
        onItemTouchEnd={onItemTouchEnd}
        onAssignItem={_onAssignItem}
        onUnassignItem={onUnassignItem}
        formatPrice={formatPrice}
      />
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if the virtual row position or item data changes
  return (
    prevProps.virtualRow.key === nextProps.virtualRow.key &&
    prevProps.virtualRow.start === nextProps.virtualRow.start &&
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.assignedPeople.length === nextProps.assignedPeople.length
  )
})

VirtualizedRowWrapper.displayName = 'VirtualizedRowWrapper'

export const VirtualizedItemList: React.FC<VirtualizedItemListProps> = ({
  items,
  assignedPeople,
  selectedItems,
  onItemSelect,
  onItemMouseDown,
  onItemMouseUp,
  onItemMouseLeave,
  onItemTouchStart,
  onItemTouchEnd,
  onAssignItem: _onAssignItem,
  onUnassignItem,
  getItemAssignments: _getItemAssignments,
  formatPrice,
  className = '',
  height = 400,
  enableVirtualization = true,
  virtualizationThreshold = VIRTUALIZATION_CONFIG.ITEM_LIST_THRESHOLD,
  estimatedItemSize = VIRTUALIZATION_CONFIG.ESTIMATED_ITEM_SIZE,
  overscan: _overscan = VIRTUALIZATION_CONFIG.OVERSCAN
}) => {
  const parentRef = useRef<HTMLDivElement>(null)

  // Create assigned hash for memoization and measurement recalculation
  const assignedHash = useMemo(() => {
    const hash = new Map<string, string>()
    for (const [itemId, people] of assignedPeople) {
      const peopleStr = people
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(p => `${p.id}:${p.weight}`)
        .join(',')
      hash.set(itemId, peopleStr)
    }
    return hash
  }, [assignedPeople])

  // Create a combined hash for all assignments to trigger measurement recalculation
  const allAssignmentsHash = useMemo(() => {
    return Array.from(assignedHash.values()).join('|')
  }, [assignedHash])

  // Virtualizer setup with optimized configuration
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => estimatedItemSize, [estimatedItemSize]),
    measureElement: useCallback((element: Element) => {
      return element?.getBoundingClientRect().height ?? estimatedItemSize
    }, [estimatedItemSize]),
    overscan: getOverscan(items.length),
    enabled: enableVirtualization && shouldVirtualize(items.length, virtualizationThreshold)
  })

  // Recalculate heights when assignments change
  useEffect(() => {
    if (enableVirtualization && items.length > virtualizationThreshold) {
      // Small delay to ensure DOM has updated
      const timeoutId = setTimeout(() => {
        rowVirtualizer.measure()
      }, VIRTUALIZATION_CONFIG.MEASUREMENT_DELAY)
      
      return () => clearTimeout(timeoutId)
    }
  }, [allAssignmentsHash, rowVirtualizer, enableVirtualization, items.length, virtualizationThreshold])

  // If we don't need virtualization, render normally
  if (!enableVirtualization || !shouldVirtualize(items.length, virtualizationThreshold)) {
    return (
      <div className={`space-y-2 ${className}`}>
        {items.map((item, index) => {
          const assignedPeopleForItem = assignedPeople.get(item.id) || []
          const isSelected = selectedItems.has(item.id)
          
          return (
            <MemoizedItemRow
              key={`${item.id}-${item.price}-${assignedHash.get(item.id) || 'none'}`}
              item={item}
              index={index}
              isSelected={isSelected}
              assignedPeople={assignedPeopleForItem}
              onItemSelect={onItemSelect}
              onItemMouseDown={onItemMouseDown}
              onItemMouseUp={onItemMouseUp}
              onItemMouseLeave={onItemMouseLeave}
              onItemTouchStart={onItemTouchStart}
              onItemTouchEnd={onItemTouchEnd}
              onAssignItem={_onAssignItem}
              onUnassignItem={onUnassignItem}
              formatPrice={formatPrice}
            />
          )
        })}
      </div>
    )
  }

  // Virtualized rendering
  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height: `${height}px` }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index]
          const assignedPeopleForItem = assignedPeople.get(item.id) || []
          const isSelected = selectedItems.has(item.id)
          
          return (
            <VirtualizedRowWrapper
              key={virtualRow.key}
              virtualRow={virtualRow}
              measureElement={rowVirtualizer.measureElement}
              item={item}
              index={virtualRow.index}
              isSelected={isSelected}
              assignedPeople={assignedPeopleForItem}
              onItemSelect={onItemSelect}
              onItemMouseDown={onItemMouseDown}
              onItemMouseUp={onItemMouseUp}
              onItemMouseLeave={onItemMouseLeave}
              onItemTouchStart={onItemTouchStart}
              onItemTouchEnd={onItemTouchEnd}
              onAssignItem={_onAssignItem}
              onUnassignItem={onUnassignItem}
              formatPrice={formatPrice}
            />
          )
        })}
      </div>
    </div>
  )
}
