# Tabby — Progress Log

This file tracks **completed work** with screenshots, technical details, and lessons learned.

---

## Phase 4 — Assign Mode ✅
**Completed:** January 1, 2025

### What was implemented:

#### A) Click-Click Assignment (Replacing Drag & Drop)
1. **Multi-Select Receipt Items**
   - ✅ Click receipt items to toggle selection state
   - ✅ Visual feedback: ring-brand/40 + bg-brand/5 for selected items
   - ✅ Keyboard shortcuts: Space/Enter select, A = select all, Esc = clear
   - ✅ Selection count display: "{n} selected" indicator

2. **Click-to-Assign PersonChips**
   - ✅ PersonChip becomes clickable when items are selected
   - ✅ Visual affordance: ring-brand/50 + bg-brand/5 + cursor-pointer
   - ✅ Calls `upsert_item_share_with_editor_token` for all selected items
   - ✅ Success toast: "Assigned {n} item(s) → {name}"
   - ✅ Clears selection and triggers success animation

3. **Removed DnD Dependencies**
   - ✅ Removed `useDraggable` from ReceiptItemRow
   - ✅ Removed `useDroppable` from PersonChip
   - ✅ Removed drag handles and DnD-related styling
   - ✅ Kept DnDProvider installed for potential future use

#### B) Unassigned Items Only Receipt
1. **Assignment Status Calculation**
   - ✅ Calculate `sumWeight` per item from shares data
   - ✅ Filter items: `sumWeight === 0` for unassigned, `sumWeight > 0` for assigned
   - ✅ Real-time updates via React Query invalidation

2. **Show/Hide Toggle**
   - ✅ "Show Assigned" toggle button in receipt controls
   - ✅ Toggle between unassigned-only and all items views
   - ✅ Empty state messages: "All items assigned" vs "No items yet"

3. **Receipt Controls**
   - ✅ Selection controls: Clear, Select All buttons
   - ✅ Selection count display
   - ✅ Keyboard shortcuts integration

#### C) Simplified PeopleDock
1. **Compact PersonChip Design**
   - ✅ Avatar + name + mono total in single row
   - ✅ Hover effects: shadow-pop on hover
   - ✅ Edit/delete buttons on hover
   - ✅ Success animation on assignment

2. **Horizontal Badges for Assigned Items**
   - ✅ Badges below PersonChip showing emoji + price
   - ✅ Click to unassign: calls `delete_item_share_with_editor_token`
   - ✅ Hover effects: bg-danger/10 + border-danger/30
   - ✅ Success toast: "Item unassigned"

#### D) New RPC + Migration
1. **delete_item_share_with_editor_token**
   - ✅ Added to `supabase/migrations/20250101000000_add_edit_delete_rpcs.sql`
   - ✅ SECURITY DEFINER with editor_token validation
   - ✅ Consistent with existing RPC patterns
   - ✅ Applied via `npx supabase db push`

#### E) React Query Integration
1. **Updated Mutations**
   - ✅ `useUpsertItemShareMutation(editorToken)` - fixed parameter
   - ✅ `useDeleteItemShareMutation(editorToken)` - new mutation
   - ✅ Proper invalidation: `['shares', billToken]` queries

2. **Data Flow**
   - ✅ Queries: `['items', billToken]`, `['shares', billToken]`, `['people', billToken]`
   - ✅ Mutations invalidate shares query on success
   - ✅ Optimistic UI updates with real-time data refresh

#### F) UX Polish
1. **Selection Styling**
   - ✅ Selected items: ring-2 ring-brand/40 + bg-brand/5
   - ✅ PersonChip hover: shadow-pop
   - ✅ Success animations and microinteractions

2. **Keyboard Support**
   - ✅ Space/Enter: select/deselect items
   - ✅ A (Cmd/Ctrl): select all visible items
   - ✅ Esc: clear selection
   - ✅ Tab navigation through all interactive elements

3. **Toast Notifications**
   - ✅ Success: "Assigned {n} item(s) → {name}"
   - ✅ Success: "Item unassigned"
   - ✅ Error handling for failed operations

#### G) Component Updates
1. **ReceiptPanel**
   - ✅ Added selection state management
   - ✅ Added assignment status filtering
   - ✅ Added keyboard shortcuts
   - ✅ Added controls for selection management

2. **ReceiptItemRow**
   - ✅ Removed drag functionality
   - ✅ Added click selection
   - ✅ Added visual feedback for selected state
   - ✅ Improved accessibility with ARIA attributes

3. **PersonChip**
   - ✅ Simplified to compact design
   - ✅ Added horizontal badges for assigned items
   - ✅ Added click-to-assign functionality
   - ✅ Added unassign functionality via badge clicks

4. **PeopleDock**
   - ✅ Added selected items prop passing
   - ✅ Added assignment handling
   - ✅ Updated PersonChip integration

5. **BillPage**
   - ✅ Removed DnDProvider wrapper
   - ✅ Added selection state management
   - ✅ Added assignment handlers
   - ✅ Updated component prop passing

### Technical Implementation Details:

#### Database Changes
```sql
-- New RPC for deleting item shares
create or replace function public.delete_item_share_with_editor_token(
  etoken text,
  item_id uuid,
  person_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _ok boolean;
begin
  -- Validate editor owns the bill that owns the item
  select exists (
    select 1
    from public.items i
    join public.bills b on b.id = i.bill_id
    where i.id = item_id
      and b.editor_token = etoken
  ) into _ok;

  if not _ok then
    raise exception 'invalid editor token';
  end if;

  -- Delete the item share
  delete from public.item_shares 
  where item_id = delete_item_share_with_editor_token.item_id 
    and person_id = delete_item_share_with_editor_token.person_id;
  
  return true;
end;
$$;
```

#### React Query Mutations
```typescript
// Updated upsert mutation
export const useUpsertItemShareMutation = (editorToken: string) => ({
  mutationFn: async ({ itemId, personId, weight }: { itemId: string, personId: string, weight: number }) => {
    const { data, error } = await supabase!.rpc('upsert_item_share_with_editor_token', {
      etoken: editorToken,
      item_id: itemId,
      person_id: personId,
      weight
    })
    if (error) throw error
    return data
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['shares'] })
  }
})

// New delete mutation
export const useDeleteItemShareMutation = (editorToken: string) => ({
  mutationFn: async ({ itemId, personId }: { itemId: string, personId: string }) => {
    const { data, error } = await supabase!.rpc('delete_item_share_with_editor_token', {
      etoken: editorToken,
      item_id: itemId,
      person_id: personId
    })
    if (error) throw error
    return data
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['shares'] })
  }
})
```

#### Assignment Status Calculation
```typescript
// Calculate sumWeight for each item
const itemSumWeights = new Map<string, number>()
shares.forEach(share => {
  const current = itemSumWeights.get(share.item_id) || 0
  itemSumWeights.set(share.item_id, current + share.weight)
})

// Filter items based on assignment status
const unassignedItems = items.filter(item => {
  const sumWeight = itemSumWeights.get(item.id) || 0
  return sumWeight === 0
})
```

### Screenshots:

#### Desktop View
- **Unassigned Items**: Receipt shows only unassigned items with selection controls
- **PersonChips**: Compact design with horizontal badges for assigned items
- **Selection State**: Items highlighted with ring-brand/40 + bg-brand/5
- **Assignment Flow**: Click items → click PersonChip → success animation

#### Mobile View
- **Touch-Friendly**: Large touch targets for item selection
- **Responsive Layout**: PersonChips scroll horizontally with snap behavior
- **Keyboard Support**: Virtual keyboard navigation works correctly
- **Success Feedback**: Toast notifications and visual feedback

### Lessons Learned:

1. **Click-Click vs Drag-Drop**: Click-click is more accessible and works better on mobile
2. **Multi-Select UX**: Clear visual feedback and keyboard shortcuts are essential
3. **Assignment Status**: Real-time calculation of assignment status improves UX
4. **Badge Design**: Horizontal badges are more space-efficient than vertical lists
5. **React Query**: Proper invalidation patterns ensure consistent data state

### Next Steps:
- Move to Phase 5: Math Engine implementation
- Add tax/tip mode toggles in bill settings
- Implement penny reconciliation algorithm
- Update totals display with real-time calculations

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
   - ✅ Summary mode: person totals with breakdown
   - ✅ Breakdown mode: item-by-item assignment details
   - ✅ Styling: monospace fonts, dotted leaders, watermark footer
   - ✅ Export PNG: `html2canvas` integration
   - ✅ Export PDF: `react-to-print` integration
   - ✅ `/share/:id` read-only page with ShareCard

2. **Print Styles**
   - ✅ CSS media queries for print optimization
   - ✅ Hidden elements: header, navigation, controls
   - ✅ Color adjustments: white background, black text
   - ✅ Page breaks and layout optimization

### Technical Implementation:

#### DnD Configuration
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 }
  }),
  useSensor(TouchSensor, {
    activationConstraint: { delay: 100, tolerance: 5 }
  })
)
```

#### Share Card Export
```typescript
// PNG Export
const exportPNG = async () => {
  const element = document.getElementById('share-card')
  const canvas = await html2canvas(element!, {
    backgroundColor: '#ffffff',
    scale: 2
  })
  const link = document.createElement('a')
  link.download = `tabby-bill-${billId}.png`
  link.href = canvas.toDataURL()
  link.click()
}

// PDF Export
const exportPDF = useReactToPrint({
  content: () => document.getElementById('share-card'),
  pageStyle: '@page { size: A4; margin: 1cm; }'
})
```

### Screenshots:
- **Desktop DnD**: Drag items from receipt to PersonCards
- **Mobile DnD**: Touch-friendly drag with haptic feedback
- **Share Card**: Clean export with person totals and item breakdown
- **Print Preview**: Optimized layout for printing

### Lessons Learned:
1. **dnd-kit Configuration**: Proper sensor setup is crucial for mobile experience
2. **Touch Interactions**: Longer press delay prevents accidental drags
3. **Visual Feedback**: Clear affordances and animations improve UX
4. **Export Quality**: Higher scale factor (2x) produces crisp PNG exports
5. **Print CSS**: Media queries essential for clean print output

---

## Phase 2 — Items & People ✅
**Completed:** December 31, 2024

### What was implemented:

#### A) Item Management
1. **ItemRow Component**
   - ✅ Emoji, label, price display with proper typography
   - ✅ Inline edit/delete functionality
   - ✅ Responsive layout with proper spacing
   - ✅ Currency formatting with monospace font

2. **ItemList Component**
   - ✅ Supabase integration with React Query
   - ✅ Add item form with validation
   - ✅ Real-time updates with optimistic UI
   - ✅ Error handling and loading states

3. **Database Integration**
   - ✅ `get_items_by_token` RPC for fetching items
   - ✅ `add_item_with_editor_token` RPC for creating items
   - ✅ `update_item_with_editor_token` RPC for editing items
   - ✅ `delete_item_with_editor_token` RPC for deleting items

#### B) People Management
1. **PersonCard Component**
   - ✅ Avatar, name, venmo handle display
   - ✅ Assigned items list with totals
   - ✅ Edit/delete functionality
   - ✅ Responsive design with hover effects

2. **PeopleGrid Component**
   - ✅ Grid layout for PersonCards
   - ✅ Add person form with validation
   - ✅ Real-time updates and error handling
   - ✅ Empty state and loading states

3. **Database Integration**
   - ✅ `get_people_by_token` RPC for fetching people
   - ✅ `add_person_with_editor_token` RPC for creating people
   - ✅ `update_person_with_editor_token` RPC for editing people
   - ✅ `delete_person_with_editor_token` RPC for deleting people

### Technical Implementation:

#### React Query Setup
```typescript
export const useItemsQuery = (billToken: string) => ({
  queryKey: ['items', billToken],
  queryFn: async () => {
    const { data, error } = await supabase!.rpc('get_items_by_token', {
      bill_token: billToken
    })
    if (error) throw error
    return data || []
  },
  enabled: !!billToken
})
```

#### RPC Functions
```sql
-- Get items by bill token
create or replace function public.get_items_by_token(bill_token text)
returns table(id uuid, emoji text, label text, price numeric, qty numeric, unit_price numeric)
language plpgsql
security definer
as $$
begin
  return query
  select i.id, i.emoji, i.label, i.price, i.qty, i.unit_price
  from public.items i
  join public.bills b on b.id = i.bill_id
  where b.editor_token = bill_token or b.viewer_token = bill_token
  order by i.created_at;
end;
$$;
```

### Screenshots:
- **Item Management**: Add, edit, delete items with real-time updates
- **People Management**: PersonCards with assigned items and totals
- **Responsive Design**: Works on desktop and mobile
- **Error Handling**: Toast notifications for success/error states

### Lessons Learned:
1. **React Query**: Proper cache invalidation is crucial for real-time updates
2. **RPC Design**: Token-based access control simplifies security
3. **Optimistic UI**: Immediate feedback improves perceived performance
4. **Error Handling**: Toast notifications provide clear user feedback
5. **Responsive Design**: Mobile-first approach ensures good UX across devices

---

## Phase 1 — Foundations ✅
**Completed:** December 30, 2024

### What was implemented:

#### A) Supabase Setup
1. **Database Schema**
   - ✅ Created tables: `bills`, `people`, `items`, `item_shares`, `bill_groups`, `bill_group_members`, `trips`
   - ✅ Added RLS policies for security
   - ✅ Created storage buckets for receipts and thumbnails
   - ✅ Added RPC functions for data access

2. **Authentication & Security**
   - ✅ Editor/viewer token system for bill access
   - ✅ Row Level Security (RLS) policies
   - ✅ Token-based RPC functions with security definer

#### B) React Application
1. **Project Setup**
   - ✅ Vite + React + TypeScript + Tailwind CSS
   - ✅ React Router for navigation
   - ✅ React Query for data fetching
   - ✅ Framer Motion for animations

2. **Core Components**
   - ✅ AppShell with header and navigation
   - ✅ Layout system with responsive design
   - ✅ Toast notifications system
   - ✅ Loading and error states

3. **Routing**
   - ✅ `/bill/:id` for bill editing
   - ✅ `/share/:id` for bill sharing
   - ✅ Proper route protection and error handling

### Technical Implementation:

#### Database Schema
```sql
-- Bills table with token-based access
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  place text,
  date date default current_date,
  currency char(3) default 'USD',
  subtotal numeric(10,2),
  sales_tax numeric(10,2),
  tip numeric(10,2),
  editor_token text unique not null,
  viewer_token text unique not null,
  created_at timestamp with time zone default now()
);

-- RLS policies
alter table public.bills enable row level security;
create policy "Bills are viewable by token" on public.bills
  for select using (editor_token = current_setting('app.editor_token') or viewer_token = current_setting('app.viewer_token'));
```

#### React Query Setup
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})
```

### Screenshots:
- **Database Schema**: Tables and relationships in Supabase
- **Application Shell**: Header, navigation, and layout structure
- **Responsive Design**: Desktop and mobile layouts
- **Development Environment**: Vite dev server with hot reload

### Lessons Learned:
1. **Supabase Setup**: Proper RLS policies are essential for security
2. **Token System**: Editor/viewer tokens provide flexible access control
3. **React Query**: Centralized data management improves performance
4. **TypeScript**: Strong typing prevents runtime errors
5. **Tailwind CSS**: Utility-first approach speeds up development

---

## Phase 0 — Environment Setup ✅
**Completed:** December 29, 2024

### What was implemented:

#### A) Development Environment
1. **Project Initialization**
   - ✅ Created Vite project with React and TypeScript
   - ✅ Configured Tailwind CSS for styling
   - ✅ Set up ESLint and Prettier for code quality
   - ✅ Added development scripts and configurations

2. **Supabase Integration**
   - ✅ Installed Supabase CLI
   - ✅ Created Supabase project
   - ✅ Configured local development environment
   - ✅ Set up environment variables

3. **Dependencies**
   - ✅ React Query for data fetching
   - ✅ React Router for navigation
   - ✅ Framer Motion for animations
   - ✅ Lucide React for icons

#### B) Configuration Files
1. **Environment Setup**
   - ✅ `.env.example` with required variables
   - ✅ `scripts/preflight.mjs` for environment validation
   - ✅ `supabase/config.toml` for local development
   - ✅ `vite.config.ts` for build configuration

2. **Code Quality**
   - ✅ `eslint.config.js` for linting rules
   - ✅ `prettier.config.js` for code formatting
   - ✅ `tsconfig.json` for TypeScript configuration
   - ✅ `tailwind.config.js` for styling configuration

### Technical Implementation:

#### Environment Validation
```javascript
// scripts/preflight.mjs
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`)
    process.exit(1)
  }
}
```

#### Supabase Configuration
```toml
# supabase/config.toml
[api]
enabled = true
port = 54321
schemas = ["public", "storage"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15
```

### Screenshots:
- **Development Environment**: Vite dev server running
- **Supabase Dashboard**: Project configuration and settings
- **Code Editor**: TypeScript and Tailwind CSS setup
- **Environment Variables**: Configuration validation

### Lessons Learned:
1. **Environment Setup**: Proper validation prevents runtime errors
2. **Supabase CLI**: Local development environment is essential
3. **TypeScript**: Strong typing from the start improves code quality
4. **Tailwind CSS**: Utility-first approach speeds up development
5. **Code Quality**: ESLint and Prettier ensure consistent code style
