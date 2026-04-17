# State & Re-render Optimization Migration Guide

This guide explains how to migrate components to use optimized state management and prevent unnecessary re-renders.

## 1. Replace Broad Store Access with Granular Selectors

### ❌ Before (Causes unnecessary re-renders)
```tsx
import { useFlowStore } from '@/lib/flowStore'

const MyComponent = () => {
  const { people, items, assignments, getItemAssignments } = useFlowStore()
  // This component re-renders on ANY store change
}
```

### ✅ After (Only re-renders when specific data changes)
```tsx
import { usePeople, useItems, useItemAssignments } from '@/lib/flowStoreSelectors'

const MyComponent = () => {
  const people = usePeople() // Only re-renders when people change
  const items = useItems()   // Only re-renders when items change
  const getItemAssignments = useItemAssignments
  // Component only re-renders when people or items change
}
```

## 2. Memoize Heavy Components

### ❌ Before (Re-renders on every parent update)
```tsx
const ItemRow = ({ item, onUpdate }) => {
  // Re-renders even when item hasn't changed
  return <div>{item.label}</div>
}
```

### ✅ After (Only re-renders when props actually change)
```tsx
import { MemoizedItemRow } from '@/components/ItemRow/MemoizedItemRow'

const MyComponent = ({ items }) => {
  return items.map(item => (
    <MemoizedItemRow
      key={createItemKey(item.id, item.price, assignedHash)}
      item={item}
      onUpdate={handleUpdate}
      assignedHash={assignedHash}
    />
  ))
}
```

## 3. Use Stable Keys for Virtualization

### ❌ Before (Causes layout shifts)
```tsx
{virtualItems.map((virtualRow, index) => (
  <div key={index}> {/* Bad: index changes on data changes */}
    <ItemComponent item={items[virtualRow.index]} />
  </div>
))}
```

### ✅ After (Stable keys prevent layout shifts)
```tsx
{virtualItems.map((virtualRow) => {
  const item = items[virtualRow.index]
  const assignedHash = useAssignedHash(item.id)
  
  return (
    <div key={createItemKey(item.id, item.price, assignedHash)}>
      <ItemComponent item={item} />
    </div>
  )
})}
```

## 4. Fix DnD Sensor Recreation

### ❌ Before (Creates new sensors on every render)
```tsx
const MyDnDComponent = () => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 } // New object every render
    })
  )
  
  return <DndContext sensors={sensors}>...</DndContext>
}
```

### ✅ After (Stable sensors created once)
```tsx
import { OptimizedDnDProvider } from '@/components/DragDropAssign/OptimizedDnDProvider'

const MyDnDComponent = () => {
  return (
    <OptimizedDnDProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Your draggable content */}
    </OptimizedDnDProvider>
  )
}
```

## 5. Available Optimized Selectors

```tsx
// Data selectors
const people = usePeople()                    // People array
const items = useItems()                      // Items array
const person = usePerson(personId)            // Single person
const item = useItem(itemId)                  // Single item

// Assignment selectors
const assignments = useAssignmentsForItem(itemId)  // Assignments for item
const personItems = usePersonItems(personId)       // Items assigned to person
const itemAssignments = useItemAssignments(itemId) // Person IDs assigned to item

// Computed selectors
const personTotal = usePersonTotal(personId)  // Person's total cost
const billTotals = useBillTotals()            // All bill totals
const assignedHash = useAssignedHash(itemId)  // Stable hash for memoization

// Action selectors
const { assign, unassign } = useAssignmentActions()
const { addPerson, removePerson } = usePersonActions()
const { updateItem, removeItem } = useItemActions()
```

## 6. Memoization Best Practices

### Stable Keys
```tsx
// For items: id + price + assignedHash
const itemKey = createItemKey(item.id, item.price, assignedHash)

// For people: id + assignedItemsCount
const personKey = createPersonKey(person.id, assignedItemsCount)
```

### Memoized Components
```tsx
// Use React.memo with custom comparison
const MyComponent = React.memo(({ item, assignedHash }) => {
  // Component logic
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.assignedHash === nextProps.assignedHash
  )
})
```

## 7. Performance Monitoring

Add these to track re-render performance:

```tsx
// Count re-renders
const renderCount = useRef(0)
renderCount.current++

// Log when component re-renders
useEffect(() => {
  console.log(`${ComponentName} re-rendered`, { 
    people: people.length, 
    items: items.length 
  })
})
```

## 8. Common Pitfalls to Avoid

1. **Don't pass entire store objects** - Use specific selectors
2. **Don't create objects in render** - Use useMemo for computed values
3. **Don't use array indices as keys** - Use stable, unique keys
4. **Don't recreate functions in render** - Use useCallback
5. **Don't recreate sensors** - Use stable sensor configuration

## 9. Migration Checklist

- [ ] Replace `useFlowStore()` with specific selectors
- [ ] Wrap heavy components in `React.memo`
- [ ] Use stable keys for lists and virtualization
- [ ] Memoize expensive computations with `useMemo`
- [ ] Memoize event handlers with `useCallback`
- [ ] Use `OptimizedDnDProvider` for drag and drop
- [ ] Test re-render behavior with React DevTools Profiler
