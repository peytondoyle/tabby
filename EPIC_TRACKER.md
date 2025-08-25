# Tabby — Epic Tracker

This file tracks **phases, epics, tasks, and prompts** for AI agents (Cursor/Claude).  
Each task is atomic, testable, and composable.

---

## ✅ Phase 1 — Foundations & Core Data
- [x] **Schema**: Create Supabase migrations for `bills`, `people`, `items`, `item_shares`, `bill_groups`, `bill_group_members`, `trips`.
- [x] **Scaffold**: Vite + React + TypeScript + Tailwind.
- [x] **Supabase client**: `src/lib/supabaseClient.ts`.
- [x] **Routing**: React Router with `/bill/:id` and `/share/:id`.
- [x] **Layout**: AppShell with header + 3-column grid (desktop), stacked mobile.

---

## ✅ Phase 2 — Items & People
- [ ] `<ItemRow />` with emoji, label, price, draggable.
- [ ] `<ItemList />` with Supabase fetch, inline add/edit/delete.
- [ ] `<PersonCard />` with avatar, name, assigned items, totals placeholders.
- [ ] `<PeopleGrid />` rendering PersonCards, add-person form.
- [ ] `<GroupCard />` (couple mode) combining totals.

---

## ✅ Phase 3 — Drag & Drop
- [ ] Install dnd-kit.
- [ ] Add MouseSensor + TouchSensor (pressDelay=120ms).
- [ ] Make `<ItemRow />` draggable.
- [ ] Make `<PersonCard />` droppable; onDrop upsert `item_shares`.
- [ ] Add visual feedback (highlight, animation, haptics).
- [ ] Support multi-share weights (UI for 50/50, custom splits).

---

## ✅ Phase 4 — Math Engine
- [ ] Implement `computeTotals(items, shares, people, TAX, TIP, taxMode, tipMode, includeZero)`.
- [ ] Implement penny reconciliation algorithm.
- [ ] Add `<SplitControls />` for toggles.
- [ ] Add Jest unit tests (simple, shared, even, couple, rounding cases).

---

## ✅ Phase 5 — OCR & Parsing
- [ ] `<UploadPanel />` for file input + preview.
- [ ] `/api/ocr` Vercel route calling Google Vision.
- [ ] `parseReceipt()` function: cluster lines, detect items/subtotal/tax/tip, assign confidence.
- [ ] Confirm Screen: editable table, warnings, overlay on receipt image/PDF.
- [ ] Persist accepted results to Supabase.

---

## ✅ Phase 6 — Shareable Exports
- [ ] `<ShareCard />` with summary and breakdown modes.
- [ ] Styling: monospace, dotted leaders, watermark footer.
- [ ] Export PNG (html2canvas).
- [ ] Export PDF (react-to-print).
- [ ] `/share/:id` read-only page with ShareCard.

---

## ✅ Phase 7 — Payments
- [ ] Venmo handle field on Person.
- [ ] Venmo deep link + QR code per person.
- [ ] Copy to clipboard fallback.
- [ ] “Mark as received” checkbox (manual only).

---

## ✅ Phase 8 — Polish
- [ ] PDF viewer (react-pdf) with thumbnails + zoom.
- [ ] Mobile zoom fixes (inputs ≥16px, touch-action).
- [ ] Bottom sheet for mobile controls.
- [ ] PWA manifest + icons.
- [ ] Offline cache of last 3 bills.
- [ ] Dark mode.
- [ ] Accessibility: ARIA live, keyboard nav, focus states.
- [ ] Error handling: OCR fail, offline fallback, network retry.
- [ ] Analytics + Sentry integration.

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

## 🗂️ Tracking Format
- `[ ]` Not started  
- `[~]` In progress  
- `[x]` Done  

Update this file as features are completed.

---
