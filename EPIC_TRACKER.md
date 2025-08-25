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

## ⏳ Phase 4 — Math Engine
- [ ] Implement `computeTotals(items, shares, people, TAX, TIP, taxMode, tipMode, includeZero)`.
- [ ] Implement penny reconciliation algorithm.
- [ ] Add `<SplitControls />` for toggles.
- [ ] Add Jest unit tests (simple, shared, even, couple, rounding cases).

---

## ⏳ Phase 5 — OCR & Parsing
- [ ] `<UploadPanel />` for file input + preview.
- [ ] `/api/ocr` Vercel route calling Google Vision.
- [ ] `parseReceipt()` function: cluster lines, detect items/subtotal/tax/tip, assign confidence.
- [ ] Confirm Screen: editable table, warnings, overlay on receipt image/PDF.
- [ ] Persist accepted results to Supabase.

---

## ✅ Phase 6 — Shareable Exports (COMPLETED)
- [x] `<ShareCard />` with summary and breakdown modes.
- [x] Styling: monospace, dotted leaders, watermark footer.
- [x] Export PNG (html2canvas).
- [x] Export PDF (react-to-print).
- [x] `/share/:id` read-only page with ShareCard.

---

## ⏳ Phase 7 — Payments
- [ ] Venmo handle field on Person.
- [ ] Venmo deep link + QR code per person.
- [ ] Copy to clipboard fallback.
- [ ] “Mark as received” checkbox (manual only).

---

## 🔄 Phase 8 — Polish (PARTIALLY COMPLETED)
- [ ] PDF viewer (react-pdf) with thumbnails + zoom.
- [x] Mobile zoom fixes (inputs ≥16px, touch-action).
- [x] Bottom sheet for mobile controls.
- [ ] PWA manifest + icons.
- [ ] Offline cache of last 3 bills.
- [ ] Dark mode.
- [x] Accessibility: ARIA live, keyboard nav, focus states.
- [ ] Error handling: OCR fail, offline fallback, network retry.
- [ ] Analytics + Sentry integration.

## ✅ Phase 9 — Compact Layout (COMPLETED)
- [x] **Layout Shell**: Replace 3-column grid with two-zone vertical layout (Dock + Content).
- [x] **PeopleDock**: Sticky people row with horizontally scrollable PersonChips.
- [x] **PersonChip**: Compact cards (h-24) with avatar, name, venmo, running total.
- [x] **ReceiptItemRow**: Tighter rows with smaller emoji (20px), compact layout.
- [x] **CompactTotals**: Slim bottom bar with split toggles and totals.
- [x] **DnD Integration**: Working drag & drop from receipt items to PersonChips.
- [x] **Accessibility**: ARIA live announcements, proper roles and labels.
- [x] **Responsive**: Desktop sticky dock, mobile swipeable carousel.
- [x] **Visual Feedback**: Drop hints, success states, hover effects.

## ✅ Phase 10 — UI Polish M3 (COMPLETED)
- [x] **SmokeCheck**: Hidden in production, replaced with "Bill loaded ✓" toast on success.
- [x] **Drag & Drop Polish**: Added DragOverlay with item ghost, improved drop affordances with ring-brand/50 bg-brand/5 on hover.
- [x] **Drop Success**: PersonChip pulses bg-accent/10 for 200ms + toast notification with accent outline expand/fade microinteraction.
- [x] **Touch Sensors**: Added pressDelay=100ms for better touch responsiveness.
- [x] **People Row**: Shrunk PersonChip to min-w-[180px] h-[88px], improved layout with avatar+name left, total mono right.
- [x] **Navigation**: Added overflow-x scroll with snap-x, arrow buttons for >5 people.
- [x] **Receipt List**: Updated row styling with emoji 20px, label 14px font-medium, price 14px font-mono.
- [x] **Leaders**: Added dotted filler between label and price for better visual separation.
- [x] **Add Item**: Added "+ Add Item" ghost row at end of receipt list.
- [x] **Group Headings**: Added "Scanned Items" and "Manual Items" section headers.
- [x] **Totals Bar**: Sticky bottom with bg-card/90 backdrop-blur, border-t border-line styling.
- [x] **Typography**: Subtotal, Tax, Tip smaller (text-sm, ink-dim), Grand total text-xl font-mono bold.
- [x] **Segment Pills**: Larger hit targets (py-2.5) + smooth transitions.
- [x] **Motion Polish**: AnimatePresence fade/slide totals updates, fade up PersonChips on load.
- [x] **Drop Success**: Accent outline expand/fade microinteraction on successful drops.
- [x] **Scrollbar Hide**: Added utility class for clean horizontal scrolling.

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
