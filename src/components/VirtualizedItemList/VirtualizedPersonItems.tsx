import React, { useRef, useMemo, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion } from 'framer-motion'
import { useAssignedHash } from '@/lib/flowStoreSelectors'
import { useMotionPreferences, getMotionVariants } from '@/lib/motionPreferences'

interface Item {
  id: string
  emoji?: string
  label: string
  price: number
  quantity: number
  unit_price: number
}

interface Person {
  id: string
  name: string
  avatar?: string
}

interface VirtualizedPersonItemsProps {
  person: Person
  items: Item[]
  assignedItems: Item[]
  unassignedItems: Item[]
  selectedItems: Set<string>
  onItemSelect: (itemId: string, index: number, event: React.MouseEvent) => void
  onItemMouseDown: (itemId: string, index: number) => void
  onItemMouseUp: () => void
  onItemMouseLeave: () => void
  onItemTouchStart: (itemId: string, index: number) => void
  onItemTouchEnd: () => void
  onAssignItem: (itemId: string, personId: string) => void
  onUnassignItem: (itemId: string, personId: string) => void
  onMultiAssign: (itemIds: string[], personId: string) => void
  getItemAssignments: (itemId: string) => string[]
  formatPrice: (price: number) => string
  getInitials: (name: string) => string
  className?: string
  height?: number
  virtualizationThreshold?: number
  estimatedItemSize?: number
  overscan?: number
}

// Memoized assigned item row
const MemoizedAssignedItemRow = React.memo<{
  item: Item
  index: number
  isSelected: boolean
  onItemSelect: (itemId: string, index: number, event: React.MouseEvent) => void
  onItemMouseDown: (itemId: string, index: number) => void
  onItemMouseUp: () => void
  onItemMouseLeave: () => void
  onItemTouchStart: (itemId: string, index: number) => void
  onItemTouchEnd: () => void
  _onUnassignItem: (itemId: string, personId: string) => void
  formatPrice: (price: number) => string
  personId: string
}>(({
  item,
  index,
  isSelected,
  onItemSelect,
  onItemMouseDown,
  onItemMouseUp,
  onItemMouseLeave,
  onItemTouchStart,
  onItemTouchEnd,
  _onUnassignItem,
  formatPrice,
  personId
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

  const handleUnassign = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    _onUnassignItem(item.id, personId)
  }, [item.id, personId, _onUnassignItem])

  const prefersReducedMotion = useMotionPreferences()
  const motionVariants = getMotionVariants(prefersReducedMotion)

  return (
    <motion.div
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
      // Use motion variants based on preferences
      initial={motionVariants.initial}
      animate={motionVariants.animate}
      whileHover={prefersReducedMotion ? {} : motionVariants.hover}
      whileTap={prefersReducedMotion ? {} : motionVariants.tap}
      layout={motionVariants.layout}
      // Optimize for performance
      transition={{
        duration: prefersReducedMotion ? 0 : 0.2,
        ease: 'easeOut'
      }}
    >
      <div className="flex items-center gap-3">
        {isSelected && (
          <motion.div
            className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            ✓
          </motion.div>
        )}
        <span className="text-xl">{item.emoji || '🍽️'}</span>
        <span className="text-text-primary">{item.label}</span>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="font-medium text-text-primary">{formatPrice(item.price)}</span>
        <button
          onClick={handleUnassign}
          className="p-1 hover:bg-error/10 rounded text-error hover:text-error/80 transition-colors"
          title={`Remove ${item.label}`}
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.isSelected === nextProps.isSelected
  )
})

// Memoized unassigned item button
const MemoizedUnassignedItemButton = React.memo<{
  item: Item
  index: number
  isSelected: boolean
  onItemSelect: (itemId: string, index: number, event: React.MouseEvent) => void
  onItemMouseDown: (itemId: string, index: number) => void
  onItemMouseUp: () => void
  onItemMouseLeave: () => void
  onItemTouchStart: (itemId: string, index: number) => void
  onItemTouchEnd: () => void
  _onAssignItem: (itemId: string, personId: string) => void
  formatPrice: (price: number) => string
  personId: string
}>(({
  item,
  index,
  isSelected,
  onItemSelect,
  onItemMouseDown,
  onItemMouseUp,
  onItemMouseLeave,
  onItemTouchStart,
  onItemTouchEnd,
  _onAssignItem: _onAssignItem,
  formatPrice,
  personId: _personId
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

  /* const _handleAssign = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    _onAssignItem(item.id, personId)
  }, [item.id, personId, _onAssignItem]) */

  const prefersReducedMotion = useMotionPreferences()
  const motionVariants = getMotionVariants(prefersReducedMotion)

  return (
    <motion.button
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={onItemMouseUp}
      onMouseLeave={onItemMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={onItemTouchEnd}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary transition-colors ${
        isSelected
          ? 'bg-primary text-white'
          : 'bg-primary-light/20 hover:bg-primary-light/30 border border-primary/30'
      }`}
      // Use motion variants based on preferences
      initial={motionVariants.initial}
      animate={motionVariants.animate}
      whileHover={prefersReducedMotion ? {} : motionVariants.hover}
      whileTap={prefersReducedMotion ? {} : motionVariants.tap}
      layout={motionVariants.layout}
      // Optimize for performance
      transition={{
        duration: prefersReducedMotion ? 0 : 0.2,
        ease: 'easeOut'
      }}
    >
      {isSelected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          ✓
        </motion.span>
      )}
      <span>{item.emoji || '🍽️'}</span>
      <span className="truncate max-w-24">{item.label}</span>
      <span className="font-medium">{formatPrice(item.price)}</span>
    </motion.button>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.isSelected === nextProps.isSelected
  )
})

export const VirtualizedPersonItems: React.FC<VirtualizedPersonItemsProps> = ({
  person,
  items,
  assignedItems,
  unassignedItems,
  selectedItems,
  onItemSelect,
  onItemMouseDown,
  onItemMouseUp,
  onItemMouseLeave,
  onItemTouchStart,
  onItemTouchEnd,
  onAssignItem: _onAssignItem,
  onUnassignItem: _onUnassignItem,
  onMultiAssign: _onMultiAssign,
  getItemAssignments: _getItemAssignments,
  formatPrice,
  getInitials,
  className = '',
  height = 300,
  virtualizationThreshold = 40,
  estimatedItemSize = 80,
  overscan = 8
}) => {
  const assignedItemsRef = useRef<HTMLDivElement>(null)
  const unassignedItemsRef = useRef<HTMLDivElement>(null)

  // Create assigned hash for memoization and measurement recalculation
  const assignedHash = useMemo(() => {
    return assignedItems
      .map(item => `${item.id}-${item.price}`)
      .sort()
      .join('|')
  }, [assignedItems])

  // Create a combined hash for all assignments to trigger measurement recalculation
  const allAssignmentsHash = useMemo(() => {
    const assignedHashes = assignedItems.map(item => useAssignedHash(item.id))
    return assignedHashes.join('|')
  }, [assignedItems])

  // Virtualizer for assigned items with optimized configuration
  const assignedItemsVirtualizer = useVirtualizer({
    count: assignedItems.length,
    getScrollElement: () => assignedItemsRef.current,
    estimateSize: useCallback(() => estimatedItemSize, [estimatedItemSize]),
    measureElement: useCallback((element: Element) => {
      return element?.getBoundingClientRect().height ?? estimatedItemSize
    }, [estimatedItemSize]),
    overscan: overscan,
    enabled: assignedItems.length > virtualizationThreshold
  })

  // Virtualizer for unassigned items (quick assign section)
  const unassignedItemsVirtualizer = useVirtualizer({
    count: Math.min(unassignedItems.length, 5), // Limit to 5 items in quick assign
    getScrollElement: () => unassignedItemsRef.current,
    estimateSize: useCallback(() => 40, []),
    measureElement: useCallback((element: Element) => {
      return element?.getBoundingClientRect().height ?? 40
    }, []),
    overscan: overscan,
    enabled: unassignedItems.length > 10
  })

  // Recalculate heights when assignments change
  useEffect(() => {
    if (assignedItems.length > virtualizationThreshold) {
      const timeoutId = setTimeout(() => {
        assignedItemsVirtualizer.measure()
      }, 50) // Reduced delay for more responsive updates
      return () => clearTimeout(timeoutId)
    }
  }, [allAssignmentsHash, assignedItemsVirtualizer, assignedItems.length, virtualizationThreshold])

  useEffect(() => {
    if (unassignedItems.length > 10) {
      const timeoutId = setTimeout(() => {
        unassignedItemsVirtualizer.measure()
      }, 50) // Reduced delay for more responsive updates
      return () => clearTimeout(timeoutId)
    }
  }, [unassignedItems.length, unassignedItemsVirtualizer])

  const handleMultiAssign = useCallback(() => {
    const selectedItemsArray = Array.from(selectedItems)
    if (selectedItemsArray.length > 0) {
      _onMultiAssign(selectedItemsArray, person.id)
    }
  }, [selectedItems, person.id, _onMultiAssign])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Person Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center text-lg font-bold">
            {person.avatar ? '👤' : getInitials(person.name)}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-text-primary">{person.name}</h3>
            <p className="text-text-muted">{assignedItems.length} item{assignedItems.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">
            {formatPrice(assignedItems.reduce((sum, item) => sum + item.price, 0))}
          </p>
        </div>
      </div>

      {/* Assigned Items */}
      <div className="space-y-2">
        {assignedItems.length === 0 ? (
          <p className="text-text-muted italic text-center py-4">No items assigned yet</p>
        ) : assignedItems.length > 20 ? (
          // Virtualized assigned items
          <div
            ref={assignedItemsRef}
            className="overflow-auto"
            style={{ height: `${height}px` }}
          >
            <div
              style={{
                height: `${assignedItemsVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {assignedItemsVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = assignedItems[virtualRow.index]
                const isSelected = selectedItems.has(item.id)
                const itemIndex = items.findIndex(i => i.id === item.id)
                
                return (
                  <div
                    key={virtualRow.key}
                    ref={assignedItemsVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <MemoizedAssignedItemRow
                      item={item}
                      index={itemIndex}
                      isSelected={isSelected}
                      onItemSelect={onItemSelect}
                      onItemMouseDown={onItemMouseDown}
                      onItemMouseUp={onItemMouseUp}
                      onItemMouseLeave={onItemMouseLeave}
                      onItemTouchStart={onItemTouchStart}
                      onItemTouchEnd={onItemTouchEnd}
                      _onUnassignItem={_onUnassignItem}
                      formatPrice={formatPrice}
                      personId={person.id}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          // Regular assigned items
          <div className="space-y-2">
            {assignedItems.map((item, _index) => {
              const isSelected = selectedItems.has(item.id)
              const itemIndex = items.findIndex(i => i.id === item.id)
              
              return (
                <MemoizedAssignedItemRow
                  key={`${item.id}-${item.price}-${assignedHash}`}
                  item={item}
                  index={itemIndex}
                  isSelected={isSelected}
                  onItemSelect={onItemSelect}
                  onItemMouseDown={onItemMouseDown}
                  onItemMouseUp={onItemMouseUp}
                  onItemMouseLeave={onItemMouseLeave}
                  onItemTouchStart={onItemTouchStart}
                  onItemTouchEnd={onItemTouchEnd}
                  _onUnassignItem={_onUnassignItem}
                  formatPrice={formatPrice}
                  personId={person.id}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Multi-assign selected items */}
      {selectedItems.size > 0 && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-text-secondary">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            onClick={handleMultiAssign}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <span>Assign {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} to {person.name}</span>
          </button>
        </div>
      )}

      {/* Quick Assign Unassigned Items */}
      {unassignedItems.length > 0 && selectedItems.size === 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-sm text-text-secondary mb-3">Quick assign unassigned items:</p>
          {unassignedItems.length > 10 ? (
            // Virtualized unassigned items
            <div
              ref={unassignedItemsRef}
              className="overflow-auto"
              style={{ height: '200px' }}
            >
              <div
                style={{
                  height: `${unassignedItemsVirtualizer.getTotalSize()}px`,
                  position: 'relative',
                }}
              >
                {unassignedItemsVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = unassignedItems[virtualRow.index]
                  const isSelected = selectedItems.has(item.id)
                  const itemIndex = items.findIndex(i => i.id === item.id)
                  
                  return (
                    <div
                      key={virtualRow.key}
                      ref={unassignedItemsVirtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <MemoizedUnassignedItemButton
                        item={item}
                        index={itemIndex}
                        isSelected={isSelected}
                        onItemSelect={onItemSelect}
                        onItemMouseDown={onItemMouseDown}
                        onItemMouseUp={onItemMouseUp}
                        onItemMouseLeave={onItemMouseLeave}
                        onItemTouchStart={onItemTouchStart}
                        onItemTouchEnd={onItemTouchEnd}
                        _onAssignItem={_onAssignItem}
                        formatPrice={formatPrice}
                        personId={person.id}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            // Regular unassigned items
            <div className="flex flex-wrap gap-2">
              {unassignedItems.slice(0, 5).map((item, _index) => {
                const isSelected = selectedItems.has(item.id)
                const itemIndex = items.findIndex(i => i.id === item.id)
                
                return (
                  <MemoizedUnassignedItemButton
                    key={`${item.id}-${item.price}`}
                    item={item}
                    index={itemIndex}
                    isSelected={isSelected}
                    onItemSelect={onItemSelect}
                    onItemMouseDown={onItemMouseDown}
                    onItemMouseUp={onItemMouseUp}
                    onItemMouseLeave={onItemMouseLeave}
                    onItemTouchStart={onItemTouchStart}
                    onItemTouchEnd={onItemTouchEnd}
                    _onAssignItem={_onAssignItem}
                    formatPrice={formatPrice}
                    personId={person.id}
                  />
                )
              })}
              {unassignedItems.length > 5 && (
                <span className="text-text-muted text-sm px-3 py-2">
                  +{unassignedItems.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
