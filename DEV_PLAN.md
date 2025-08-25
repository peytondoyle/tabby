# Tabby — Development Plan

## Assessment & Scope

### Project Summary
Tabby is a restaurant bill splitting app that enables users to scan receipts, assign items to people via drag-and-drop, and generate fair totals with tax/tip split options. The app focuses on speed, trustworthiness, and shareability without requiring authentication.

### Key Constraints
- **No authentication required** - uses editor/viewer tokens for permissions
- **Mobile-first responsive design** - must work on iOS Safari without zoom issues
- **Real-time math accuracy** - totals must always reconcile to receipt total
- **Fast workflow** - complete process in <2 minutes
- **Cross-platform** - desktop PDF workflow + mobile drag-drop

### Core Technical Decisions

#### Database Schema
- **Link Model**: Editor/viewer tokens stored in `bills` table
- **Item Sharing**: `item_shares` junction table with weights for proportional splits
- **Groups**: `bill_groups` + `bill_group_members` for temporary couple/group views
- **Storage**: Supabase Storage for receipts with auto-cleanup

#### Tax/Tip Split Logic
- **Proportional**: Split based on item totals
- **Even**: Split equally among all people (with toggle for zero-item people)
- **Penny Reconciliation**: Algorithm to distribute rounding differences fairly

#### Couples View Implementation
- **View Layer Only**: Groups don't change item ownership, just display combined totals
- **Temporary**: Groups can be created/destroyed without affecting underlying data
- **Ghosted Individuals**: Show individual people as "ghosted" when in group view

#### Mobile DnD Strategy
- **dnd-kit**: Primary drag-drop library with touch sensor (120ms press delay)
- **Touch Actions**: `touch-action: manipulation` to prevent zoom during drag
- **Haptic Feedback**: Vibration on successful drops
- **Visual Feedback**: Highlight states, animations, drop zones

## Risk Register

### High Risk
1. **OCR Accuracy/Cost**
   - Risk: Google Vision API costs or poor accuracy on complex receipts
   - Mitigation: Confidence scoring, manual edit fallback, cost monitoring
   
2. **Mobile DnD Performance**
   - Risk: Poor drag-drop experience on mobile Safari
   - Mitigation: Touch sensor tuning, visual feedback, fallback to tap-to-assign

3. **Penny Reconciliation Edge Cases**
   - Risk: Complex scenarios where rounding can't be distributed fairly
   - Mitigation: Comprehensive test cases, clear algorithm documentation

### Medium Risk
1. **Venmo Link Compatibility**
   - Risk: Deep links don't work across all devices/platforms
   - Mitigation: Web fallback, QR codes, copy-to-clipboard

2. **PDF Export Quality**
   - Risk: Share cards don't render consistently across browsers
   - Mitigation: html2canvas + react-to-print, fallback to PNG

### Low Risk
1. **Supabase Storage Limits**
   - Risk: Storage costs or file size limits
   - Mitigation: Image compression, auto-cleanup, monitoring

## Milestone Plan (6 Steps)

### Milestone 1: Foundations (Current)
- Scaffold Vite + React + TypeScript + Tailwind
- Supabase schema migrations
- App shell with routing
- Basic layout components

### Milestone 2: Items & People
- ItemRow and ItemList components
- PersonCard and PeopleGrid components
- Add/edit/delete functionality
- Supabase data integration

### Milestone 3: Drag & Drop
- dnd-kit integration
- Draggable items, droppable people
- Visual feedback and animations
- Item sharing with weights

### Milestone 4: Math Engine
- computeTotals implementation
- Tax/tip split toggles
- Penny reconciliation algorithm
- Unit tests

### Milestone 5: OCR & Parsing
- Upload panel and file handling
- Google Vision API integration
- Receipt parsing and confidence scoring
- Confirm/edit screen

### Milestone 6: Share & Export
- ShareCard component
- PNG/PDF export
- Venmo integration
- Share page routing

## Day 1-2 Work Plan

### Day 1: Foundation Setup
**Files to Create:**
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite configuration
- `tailwind.config.ts` - Tailwind theme
- `tsconfig.json` - TypeScript config
- `index.html` - Entry point
- `src/main.tsx` - React entry
- `src/App.tsx` - Root component
- `src/lib/supabaseClient.ts` - Supabase client
- `src/components/AppShell.tsx` - Main layout
- `src/pages/BillPage.tsx` - Editor route
- `src/pages/SharePage.tsx` - Viewer route
- `src/styles/tokens.css` - Design tokens
- `README.md` - Setup instructions
- `PROGRESS_LOG.md` - Development log

**Files to Edit:**
- `EPIC_TRACKER.md` - Update Phase 1 status

### Day 2: Schema & Components
**Files to Create:**
- `supabase/migrations/` - Database schema
- `src/components/ReceiptPanel/index.tsx` - Placeholder
- `src/components/PeopleGrid/index.tsx` - Placeholder
- `src/components/TotalsPanel/index.tsx` - Placeholder
- `src/lib/computeTotals.ts` - Math engine stub
- `tests/computeTotals.test.ts` - Test placeholder
- `scripts/smoke-check.md` - Manual verification steps

**Key Deliverables:**
- Running app with routing
- Supabase client initialized
- Database schema ready
- Basic layout rendering
- Development environment documented

## Assumptions & Decisions

### Assumptions Made
1. **Editor/Viewer Tokens**: Will be UUIDs generated on bill creation
2. **Item Sharing Weights**: Decimal values (0.5 for 50/50 split)
3. **Tax/Tip Modes**: "proportional" vs "even" as string enums
4. **Mobile Breakpoint**: 768px for desktop/mobile layout switch
5. **File Upload Limits**: 10MB for images, 25MB for PDFs

### Technical Decisions
1. **State Management**: React hooks + Supabase real-time subscriptions
2. **Styling**: Tailwind CSS with custom design tokens
3. **Testing**: Jest + React Testing Library
4. **Build Tool**: Vite for fast development
5. **Deployment**: Vercel for frontend, Supabase for backend

### Next Steps After M1
- Implement ItemRow/ItemList components with CRUD operations
- Add PersonCard/PeopleGrid with avatar and name management
- Integrate dnd-kit for drag-and-drop functionality
- Build computeTotals math engine with comprehensive tests
