import React, { useRef, useMemo, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { VIRTUALIZATION_CONFIG, shouldVirtualize, getOverscan, getDeviceAwareConfig } from '@/lib/virtualizationConfig'
import { deviceDetector } from '@/lib/deviceCapabilities'
import { usePerformanceTracking } from '@/lib/performanceTracker'

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
  virtualizationThreshold,
  estimatedItemSize,
  overscan: _overscan
}) => {
  const parentRef = useRef<HTMLDivElement>(null)
  
  // Device-aware configuration
  const device = deviceDetector.detect()
  const deviceConfig = getDeviceAwareConfig()
  
  // Use device-aware defaults if not provided
  const finalThreshold = virtualizationThreshold ?? deviceConfig.itemListThreshold
  const finalItemSize = estimatedItemSize ?? deviceConfig.estimatedItemSize
  const finalOverscan = _overscan ?? deviceConfig.overscan
  
  // Performance tracking
  const { trackRender, trackVirtualization } = usePerformanceTracking('VirtualizedItemList')

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

  // Virtualizer setup with device-aware configuration
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => finalItemSize, [finalItemSize]),
    measureElement: useCallback((element: Element) => {
      return element?.getBoundingClientRect().height ?? finalItemSize
    }, [finalItemSize]),
    overscan: getOverscan(items.length),
    enabled: enableVirtualization && shouldVirtualize(items.length, finalThreshold),
    // Device-aware scroll behavior
    scrollMargin: device.isMobile ? 50 : 100,
    scrollPaddingStart: device.isMobile ? 20 : 40
  })

  // Recalculate heights when assignments change (device-aware delay)
  useEffect(() => {
    if (enableVirtualization && items.length > finalThreshold) {
      // Device-aware delay to ensure DOM has updated
      const timeoutId = setTimeout(() => {
        rowVirtualizer.measure()
      }, deviceConfig.measurementDelay)
      
      return () => clearTimeout(timeoutId)
    }
  }, [allAssignmentsHash, rowVirtualizer, enableVirtualization, items.length, finalThreshold, deviceConfig.measurementDelay])

  // If we don't need virtualization, render normally
  if (!enableVirtualization || !shouldVirtualize(items.length, finalThreshold)) {
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
  
  // Track performance metrics
  useEffect(() => {
    trackRender()
    
    // Track virtualization-specific metrics
    trackVirtualization({
      listType: 'item-list',
      itemCount: items.length,
      renderTime: performance.now(),
      scrollPerformance: 0, // Could be enhanced with scroll event tracking
      memoryUsage: 0 // Will be filled by the hook
    })
  }, [items.length, virtualItems.length, trackRender, trackVirtualization])

  // Device-aware performance hints
  const getContainerStyles = () => {
    const baseStyles = {
      height: `${height}px`,
      overflow: 'auto' as const
    }
    
    if (device.processingPower === 'low') {
      return {
        ...baseStyles,
        willChange: 'auto',
        contain: 'layout'
      }
    }
    
    if (device.processingPower === 'medium') {
      return {
        ...baseStyles,
        willChange: 'transform',
        contain: 'layout style'
      }
    }
    
    // High-end devices
    return {
      ...baseStyles,
      willChange: 'transform',
      contain: 'layout style paint',
      transform: 'translateZ(0)' // Force GPU acceleration
    }
  }

  return (
    <div
      ref={parentRef}
      className={className}
      style={getContainerStyles()}
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
