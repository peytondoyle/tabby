# Tabby — Epic Tracker

This file tracks **phases, epics, tasks, and prompts** for AI agents (Cursor/Claude).  
Each task is atomic, testable, and composable.

---

## ✅ Phase 0 — Supabase Setup & Environment
- [x] **Environment**: Create `.env.example` and validate required variables.
- [x] **Preflight**: Add `scripts/preflight.mjs` to check env vars on startup.
- [x] **Supabase CLI**: Install and configure `supabase/config.toml`.
- [ ] **Project Link**: Link local project to remote Supabase instance.
- [x] **Migrations**: Create and apply database schema migrations.
- [x] **RLS Policies**: Enable Row Level Security on all tables.
- [x] **Storage Buckets**: Create `receipts` (private) and `thumbs` (signed) buckets.
- [ ] **Seeds**: Add sample data for development/testing.

## ✅ Phase 1 — Foundations & Core Data
- [x] **Schema**: Create Supabase migrations for `bills`, `people`, `items`, `item_shares`, `bill_groups`, `bill_group_members`, `trips`.
- [x] **Scaffold**: Vite + React + TypeScript + Tailwind.
- [x] **Supabase client**: `src/lib/supabaseClient.ts`.
- [x] **Routing**: React Router with `/bill/:id` and `/share/:id`.
- [x] **Layout**: AppShell with header + 3-column grid (desktop), stacked mobile.

---

## ✅ Phase 2 — Items & People (COMPLETED)
- [x] `<ItemRow />` with emoji, label, price, draggable.
- [x] `<ItemList />` with Supabase fetch, inline add/edit/delete.
- [x] `<PersonCard />` with avatar, name, assigned items, totals placeholders.
- [x] `<PeopleGrid />` rendering PersonCards, add-person form.
- [ ] `<GroupCard />` (couple mode) combining totals.

---

## ✅ Phase 3 — Drag & Drop (COMPLETED)
- [x] Install dnd-kit.
- [x] Add MouseSensor + TouchSensor (pressDelay=120ms).
- [x] Make `<ItemRow />` draggable.
- [x] Make `<PersonCard />` droppable; onDrop upsert `item_shares`.
- [x] Add visual feedback (highlight, animation, haptics).
- [x] Support multi-share weights (UI for 50/50, custom splits).

---

## ✅ Phase 4 — Assign Mode (COMPLETED)
- [x] **Click-Click Assignment**: Replace drag & drop with multi-select + click assignment.
- [x] **Unassigned Items Only**: Receipt shows only unassigned items with "Show assigned" toggle.
- [x] **Simplified PeopleDock**: Compact chips with horizontal badges for assigned items.
- [x] **Unassign Functionality**: Click badges to unassign items and return to receipt.
- [x] **New RPC**: `delete_item_share_with_editor_token` for removing assignments.
- [x] **React Query Integration**: Proper data invalidation and optimistic updates.
- [x] **UX Polish**: Selection styles, keyboard shortcuts, success toasts.
- [x] **DnD Removal**: Removed drag handles and DnD dependencies from UI.

---

## ✅ Phase 5 — Math Engine (COMPLETED)
- [x] Implement `computeTotals(items, shares, people, TAX, TIP, taxMode, tipMode, includeZero)`.
- [x] Add proportional tax/tip splitting based on item totals.
- [x] Add even tax/tip splitting with zero-item people toggle.
- [x] Implement penny reconciliation algorithm.
- [x] Add tax/tip mode toggles in bill settings.
- [x] Update totals display with real-time calculations.

---

## ✅ Phase 6 — Receipt Upload & OCR (COMPLETED)
- [x] **File Upload**: Drag & drop receipt images/PDFs with ReceiptUpload component.
- [x] **OCR API**: Mock OCR endpoint with structured item extraction.
- [x] **Item Parsing**: Extract items, prices, totals from OCR with bill generation.
- [x] **Manual Edit**: OcrEditor component for editing OCR results before saving.
- [x] **Receipt Thumbnails**: Generate thumbnails for images and PDF placeholders.
- [x] **Modal Integration**: ReceiptUploadModal replaces separate route, accessible from bill pages.
- [ ] **Real OCR Integration**: Replace mock with actual Google Vision API.
- [ ] **Storage Cleanup**: Auto-delete old receipts after 30 days.

---

## ⏳ Phase 7 — Share & Export
- [ ] **Share Cards**: Generate PNG images with QR codes for payment.
- [ ] **Print Styles**: CSS for clean receipt printing.
- [ ] **PDF Export**: Generate downloadable PDF summaries.
- [ ] **Venmo Integration**: Deep links to Venmo with pre-filled amounts.
- [ ] **Share URLs**: Public view-only links for bill sharing.

---

## ⏳ Phase 8 — Mobile Polish
- [ ] **Touch Gestures**: Swipe to assign, long-press for context menus.
- [ ] **Haptic Feedback**: Vibration on successful assignments.
- [ ] **Offline Support**: Cache data for offline viewing.
- [ ] **PWA**: Installable web app with app icon.
- [ ] **Camera Integration**: Direct camera access for receipt photos.

---

## ⏳ Phase 9 — Advanced Features
- [ ] **Groups**: Temporary couple/group views combining totals.
- [ ] **Trips**: Multi-bill trip organization.
- [ ] **Templates**: Save common people/items for reuse.
- [ ] **Analytics**: Spending patterns and history.
- [ ] **Notifications**: Reminders for unpaid bills.

---

## 🎯 Current Focus: Phase 7 — Share & Export

**Phase 6 Completed Features:**
- ✅ Drag & drop file upload with ReceiptUpload component
- ✅ Mock OCR API with structured item extraction
- ✅ Bill creation from OCR results with smart title generation
- ✅ OcrEditor for manual editing with add/edit/delete items
- ✅ Receipt thumbnails for images and PDF placeholders
- ✅ Integration with existing bill system and math engine

**Next Steps for Phase 7:**
1. Create share cards with QR codes for payment
2. Add print styles for clean receipt printing
3. Generate downloadable PDF summaries
4. Implement Venmo deep links
5. Build public share URLs for bills

---

## 📌 Prompts Backlog
- [ ] **Block A — Schema:** “Create Supabase migrations per Product Brief Section 4…”
- [ ] **Block B — AppShell:** “Build AppShell with header + 3-column desktop grid…”
- [ ] **Block C — Items:** “Implement <ItemRow/> and <ItemList/>…”
- [ ] **Block D — People:** “Implement <PersonCard/> and <PeopleGrid/>…”
- [ ] **Block E — DnD:** “Integrate dnd-kit, make ItemRow draggable, PersonCard droppable…”
- [ ] **Block F — Math:** “Implement computeTotals() with penny fix…”
- [ ] **Block G — OCR:** “Create /api/ocr with Google Vision, parseReceipt()…”
- [ ] **Block H — Share:** “Create <ShareCard/> with summary + breakdown, export PNG/PDF…”
- [ ] **Block I — Desktop/Mobile:** “Add react-pdf viewer, mobile zoom fixes, bottom sheet controls…”

---

## 📋 Definition of Ready
Before starting Phase 2, ensure:
- [x] Supabase project is linked and accessible
- [x] All environment variables are validated by preflight script
- [x] Database migrations are applied and RLS policies are active
- [x] Storage buckets are created with proper permissions
- [x] Can perform basic CRUD operations on all tables
- [x] No local mocks or in-memory data stores are used

## 🗂️ Tracking Format
- `[ ]` Not started  
- `[~]` In progress  
- `[x]` Done  

Update this file as features are completed.

---
