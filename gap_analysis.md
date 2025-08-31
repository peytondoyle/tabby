# 🔍 Gap Analysis (Billy vs Tabby)

## 1. Welcome / Entry
- **Billy:** Branded splash + Scan Receipt flow.
- **Tabby:** No splash, starts in bill view.
- **Gap:** Missing onboarding entry flow.

## 2. Receipt Capture & Analysis
- **Billy:** Animated analyzing screen + receipt preview.
- **Tabby:** Jumps straight to items UI.
- **Gap:** Missing receipt parsing UX.

## 3. Add People
- **Billy:** Modal with contacts/manual entry, avatars appear dynamically.
- **Tabby:** People exist in DB but no onboarding modal flow.
- **Gap:** No interactive add people UX.

## 4. People + Items Overview
- **Billy:** Avatars at top, items as floating pills.
- **Tabby:** Items grouped per person or in "Unassigned Items".
- **Gap:** Missing playful floating items pool.

## 5. Assign Items
- **Billy:** Drag/drop assignment with animations.
- **Tabby:** Manual assignment, click-heavy.
- **Gap:** Needs intuitive drag-drop.

## 6. Bill View
- **Billy:** Toggle between playful assignment + structured bill summary.
- **Tabby:** Shows subtotals only in cards.
- **Gap:** No structured receipt summary mode.

## 7. Multi-Assign / Splits
- **Billy:** Supports fractional splits.
- **Tabby:** Likely supported in DB but no UI.
- **Gap:** No split UI.

## 8. Final Assignment Screen
- **Billy:** Per-person cards with totals.
- **Tabby:** Already exists (per person subtotals).
- **Strength:** Tabby has base version.

## 9. Split Confirmation
- **Billy:** Large CTA + confetti animation.
- **Tabby:** No explicit split confirmation.
- **Gap:** Needs celebratory step.

## 10. Share Flow
- **Billy:** Share group or individuals.
- **Tabby:** No share/export functionality.
- **Gap:** Missing entirely.

## 11. Individual Share View
- **Billy:** Export card per person.
- **Tabby:** Missing.
- **Gap:** Needs shareable card.

## 12. Group Receipt View
- **Billy:** Full combined receipt card.
- **Tabby:** Missing.
- **Gap:** Needs export template.

## 13. Persistent Bill State
- **Billy:** Re-entry preserves avatars + items + floating share button.
- **Tabby:** Supabase persistence already works.
- **Strength:** Backend state is solid.

---

### 📌 Summary
- **Biggest Gaps:** Onboarding, playful assignment UI, share/export flow.
- **Strengths:** Data model, persistence, per-person subtotals already exist.
