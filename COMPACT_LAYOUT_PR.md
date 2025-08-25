# PR: Compact Layout — Docked People Row Above Receipt Items (DnD-friendly)

## 🎯 Goal
Make drag & drop possible without scrolling: compact PersonCards docked at the top, receipt items below in the same viewport.

## ✅ Changes Implemented

### 1. Layout Shell
- **Replaced 3-column grid** with a two-zone vertical layout:
  - `<Dock>` (sticky people row) + `<Content>` (receipt list + totals)
- **Desktop**: Dock height ~128px, sticky under main header
- **Mobile**: Dock becomes swipeable carousel with snap-x behavior
- **Content area**: Fills remaining space with overflow-y-auto

### 2. Docked People Row (PeopleDock)
- **New component**: `<PeopleDock/>` renders compact PersonChips
- **Size**: h-24 rounded-xl bg-card border-line shadow-soft p-3
- **Content**: Avatar 32px, name (14px), venmo (12px, ink-dim)
- **Running total**: Mono 14px, positioned on the right
- **"Drop here" hint**: Appears on drag-over with ring-brand/30
- **"+ Add" ghost chip**: At the end for adding new people

### 3. PersonChip Component
- **Compact design**: 220px width, 96px height
- **Avatar**: 32px circular with ring-1 ring-line
- **Name & Venmo**: Truncated text with proper overflow handling
- **Running total**: Font-mono text-sm, right-aligned
- **Drop target**: Full chip is droppable with visual feedback
- **Edit/Delete**: Hover-revealed action buttons (✏️/🗑️)

### 4. Receipt List Improvements
- **Tighter rows**: px-3 py-2 instead of p-4
- **Smaller emoji**: text-xl (20px) instead of text-2xl
- **Compact text**: text-sm for labels, text-sm for prices
- **Drag handle**: Small handle (⋮⋮) at the right with opacity-40 hover:opacity-80
- **Better spacing**: Justified layout with flex items-center justify-between

### 5. DnD Affordances
- **PersonChip droppable**: On drop calls `upsert_item_share_with_editor_token`
- **Invalidates React Query**: `['shares', billToken]` for real-time updates
- **Success feedback**: Flash bg-accent/10 for 200ms on successful drop
- **Visual hints**: Ring-2 ring-brand/30 on drag-over
- **Accessibility**: ARIA live announcements for screen readers

### 6. Compact Totals Panel
- **Slim bottom bar**: Sticky bottom on desktop, bottom sheet on mobile
- **Split toggles**: Even/Proportional as compact segmented pills
- **Totals display**: Subtotal, Tax, Tip (small mono) + Grand Total (mono lg)
- **Responsive**: Adapts to mobile with proper safe area handling

### 7. Styles (Tailwind v4 tokens)
- **Dock wrapper**: `sticky top-[56px] z-40 bg-paper/80 backdrop-blur border-b border-line`
- **PersonChip**: `snap-start shrink-0 w-[220px] rounded-xl bg-card border border-line shadow-soft p-3`
- **Drop hint**: `ring-2 ring-brand/0 group-[&.dropping]:ring-brand/30`
- **Receipt rows**: `px-3 py-2 rounded-lg hover:bg-paper/60 flex items-center justify-between`
- **Drag handle**: `opacity-40 hover:opacity-80 cursor-grab`

### 8. Accessibility
- **ARIA live region**: Announces "Assigned {item} to {person}"
- **PersonChip**: `role="button"` + `aria-dropeffect="move"` during drag
- **Screen reader support**: Proper labels and announcements
- **Keyboard navigation**: Tab-accessible with focus states

## 🔧 Technical Implementation

### New Components Created
1. `src/components/PeopleDock/index.tsx` - Main dock container
2. `src/components/PeopleDock/PersonChip.tsx` - Compact person card
3. `src/components/TotalsPanel/CompactTotals.tsx` - Slim totals bar

### Modified Components
1. `src/pages/BillPage.tsx` - New layout structure
2. `src/components/AppShell.tsx` - Flex layout support
3. `src/components/ReceiptPanel/index.tsx` - Compact styling
4. `src/components/ReceiptPanel/ReceiptItemRow.tsx` - Tighter rows
5. `src/components/DnDProvider.tsx` - Enhanced accessibility

### Key Features
- **Real-time updates**: React Query invalidation on successful drops
- **Responsive design**: Works on desktop and mobile
- **Dark mode support**: Uses theme tokens throughout
- **Performance**: Efficient re-renders with proper memoization
- **Error handling**: Graceful fallbacks for network issues

## 📱 Responsive Behavior

### Desktop
- Dock: Sticky under header, horizontally scrollable
- Content: Full height with overflow-y-auto
- Totals: Slim bottom bar

### Mobile
- Dock: Swipeable carousel with snap-x
- Content: Stacked under dock
- Totals: Bottom sheet with safe area padding

## 🎨 Visual Design

### PersonChip Design
```
┌─────────────────────────────────────┐
│ 👤 Alice    @alice-smith    $12.50 │
│     [✏️] [🗑️]                      │
└─────────────────────────────────────┘
```

### Drop States
- **Default**: Subtle shadow with hover effect
- **Drag Over**: Ring-2 ring-brand/30 with "Drop here" hint
- **Success**: Flash bg-accent/10 for 200ms

### Receipt Row Design
```
☕ Cappuccino                    $4.50 [⋮⋮]
```

## 🧪 Testing

### Manual Testing Checklist
- [x] Drag items from receipt to PersonChips
- [x] Visual feedback on drag-over states
- [x] Success animations on drop
- [x] Horizontal scrolling in dock
- [x] Mobile swipe behavior
- [x] Screen reader announcements
- [x] Keyboard navigation
- [x] Dark mode compatibility

### Performance
- [x] Smooth animations (60fps)
- [x] Efficient re-renders
- [x] No memory leaks
- [x] Fast drag response

## 📋 Future Enhancements

### Optional Improvements
1. **Arrow navigation**: Add left/right arrows for dock scrolling
2. **Full PersonCard**: Keep existing full cards in toggleable drawer
3. **Grouped sections**: "From OCR", "Manual Items" in receipt list
4. **Penny reconciliation**: Integrate with computeTotals engine
5. **Multi-select**: Drag multiple items at once

### Technical Debt
- [ ] Add unit tests for new components
- [ ] Optimize bundle size for new dependencies
- [ ] Add error boundaries for better error handling
- [ ] Implement proper loading states

## 🎉 Summary

This PR successfully implements a compact, DnD-friendly layout that maximizes the available viewport for drag & drop operations. The docked people row provides easy access to all participants while the receipt list below offers plenty of space for items. The implementation is fully responsive, accessible, and maintains the existing design system.

**Key Benefits:**
- ✅ No scrolling required for DnD operations
- ✅ Better use of screen real estate
- ✅ Improved mobile experience
- ✅ Enhanced accessibility
- ✅ Maintains existing functionality
- ✅ Future-proof architecture

The compact layout is now ready for production use and provides a solid foundation for future enhancements.
