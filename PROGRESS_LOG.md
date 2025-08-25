# Tabby — Progress Log

## Phase 2 — Items & People (Supabase-only) ✅
**Completed:** January 1, 2025

### What was implemented:
1. **ItemList + ItemRow components**
   - ✅ Read: `supabase.rpc('get_items_by_token', { bill_token })`
   - ✅ Add: `supabase.rpc('add_item_with_editor_token', { etoken, bill_id, label, qty, unit_price, emoji })`
   - ✅ Edit/Delete: Added missing RPCs in migration `20250101000000_add_edit_delete_rpcs.sql`
   - ✅ Cascade shares on delete (handled by FK constraints)

2. **PeopleGrid + PersonCard components**
   - ✅ Read: `supabase.rpc('get_people_by_token', { bill_token })`
   - ✅ Add: `supabase.rpc('add_person_with_editor_token', { etoken, bill_id, person_name, avatar_url, venmo })`
   - ✅ Edit/Delete: Added missing RPCs in migration

3. **No mocks — all data from Supabase**
   - ✅ All components fetch data directly from Supabase RPCs
   - ✅ Token-based authentication for all operations
   - ✅ Editor token validation for write operations

4. **Basic loading/error handling**
   - ✅ Loading states for all async operations
   - ✅ Error states with retry functionality
   - ✅ Toast notifications for success/error feedback
   - ✅ Simple toast system in `src/lib/toast.ts`

### Technical details:
- **Database**: Added 4 new RPCs for edit/delete operations
- **Components**: Created ItemRow, ItemList, PersonCard with full CRUD
- **Utilities**: Added `billUtils.ts` for bill operations and `toast.ts` for notifications
- **Security**: All operations validated with editor tokens
- **UI**: Responsive design with mobile-first approach

### Files created/modified:
- `supabase/migrations/20250101000000_add_edit_delete_rpcs.sql` (NEW)
- `src/components/ItemRow/index.tsx` (NEW)
- `src/components/ItemList/index.tsx` (NEW)
- `src/components/PersonCard/index.tsx` (NEW)
- `src/components/PeopleGrid/index.tsx` (UPDATED)
- `src/components/ReceiptPanel/index.tsx` (UPDATED)
- `src/lib/billUtils.ts` (NEW)
- `src/lib/toast.ts` (NEW)
- `src/pages/BillPage.tsx` (UPDATED)
- `EPIC_TRACKER.md` (UPDATED)

### Next steps:
- Apply database migration: `npx supabase db push`
- Test all CRUD operations with sample data
- Move to Phase 3: Drag & Drop functionality

---

## Phase 3 — Drag & Drop + ShareCard Export ✅
**Completed:** January 1, 2025

### What was implemented:

#### A) Drag & Drop (dnd-kit)
1. **DnD Infrastructure**
   - ✅ Installed `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@dnd-kit/modifiers`, `html2canvas`
   - ✅ Created `DnDProvider` component with proper sensor configuration
   - ✅ MouseSensor with 8px activation distance
   - ✅ TouchSensor with 120ms press delay and 5px tolerance

2. **Draggable ReceiptItemRow**
   - ✅ Added `useDraggable` hook with proper data attributes
   - ✅ Drag handle with `⋮⋮` icon and `cursor-grab` styling
   - ✅ Visual feedback: scale 0.98, opacity 0.9 while dragging
   - ✅ Touch support with `touch-action: manipulation`

3. **Droppable PersonCard**
   - ✅ Added `useDroppable` hook with person ID
   - ✅ Visual affordances: shadow-pop + ring-brand/30 on hover
   - ✅ Drop success animation: 200ms bg-accent/10 flash
   - ✅ ARIA roles and labels for accessibility

4. **Drop Handling**
   - ✅ Calls `supabase.rpc('upsert_item_share_with_editor_token', { etoken, item_id, person_id, weight: 1 })`
   - ✅ Optimistic UI updates with refresh trigger
   - ✅ Error handling with toast notifications
   - ✅ Live region announcements for screen readers

5. **Shared Items Support**
   - ✅ Fraction chips (½, ⅓, etc.) for partial shares
   - ✅ Weight display in PersonCard assigned items list

#### B) Math + Totals Feedback
1. **Animated Totals**
   - ✅ `<AnimatePresence>` with fade/slide 100ms transitions
   - ✅ Key-based animations for number changes
   - ✅ Penny fix badge with show/hide animation

#### C) Share Card (print + PNG export)
1. **ShareCard Component**
   - ✅ Beautiful receipt aesthetic with monospace fonts
   - ✅ Summary mode: names + totals table
   - ✅ Breakdown mode: per-person sections with items
   - ✅ Responsive design: 560px desktop, 440px mobile
   - ✅ Footer watermark: "Split with Tabby"

2. **Export Functionality**
   - ✅ PNG export: html2canvas at scale=2 with white background
   - ✅ Print CSS: `@media print` styles with proper page breaks
   - ✅ Copy PNG to clipboard functionality

3. **Share Modal**
   - ✅ Tabs for "Summary" and "Breakdown" previews
   - ✅ Export buttons: Copy PNG, Download PNG, Print PDF
   - ✅ Share link with QR code icon

#### D) Public Share Page
1. **SharePage Component**
   - ✅ Route `/share/:id?token=<viewer_or_editor>` 
   - ✅ Live RPC reads for bill data
   - ✅ Read-only mode with editor CTA if token present
   - ✅ Mode toggle between summary/breakdown

#### E) Mobile & Touch Polish
1. **Touch Improvements**
   - ✅ TouchSensor with proper activation constraints
   - ✅ `touch-action: manipulation` on drag handles
   - ✅ Inputs ≥16px to prevent zoom
   - ✅ Safe area insets for mobile devices

2. **Mobile UI**
   - ✅ Bottom sticky action bar with Share/Add Person/Add Item
   - ✅ Responsive design with proper spacing

#### F) Accessibility
1. **ARIA Support**
   - ✅ ARIA roles for draggable and droppable regions
   - ✅ Live region announces "Assigned {item} to {person}"
   - ✅ Proper focus management and keyboard navigation

### Technical details:
- **Dependencies**: Added dnd-kit ecosystem and html2canvas
- **Components**: Created DnDProvider, ShareCard, ShareModal, SharePage
- **Styling**: Added print styles and mobile touch improvements
- **Accessibility**: Screen reader support and keyboard navigation
- **Performance**: Optimistic updates and proper animation timing

### Files created/modified:
- `src/components/DnDProvider.tsx` (NEW)
- `src/components/ShareCard/index.tsx` (NEW)
- `src/components/ShareModal/index.tsx` (NEW)
- `src/pages/SharePage.tsx` (UPDATED)
- `src/components/ReceiptPanel/ReceiptItemRow.tsx` (UPDATED)
- `src/components/PersonCard/index.tsx` (UPDATED)
- `src/components/TotalsPanel/index.tsx` (UPDATED)
- `src/components/AppShell.tsx` (UPDATED)
- `src/pages/BillPage.tsx` (UPDATED)
- `src/App.css` (UPDATED)
- `package.json` (UPDATED)
- `EPIC_TRACKER.md` (UPDATED)

### Screenshots:
- **Desktop**: Drag & drop interface with share modal
- **Mobile**: Touch-friendly interface with bottom action bar
- **Share Page**: Read-only receipt view with export options

### Next steps:
- Test drag & drop on various devices and browsers
- Validate share functionality with real Supabase data
- Move to Phase 4: Math Engine implementation
