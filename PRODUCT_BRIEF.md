# Tabby — Product Brief

## 1. Vision
Make splitting a restaurant bill delightful, trustworthy, and fast.  
Users should be able to scan a receipt (photo or PDF), confirm items, assign them to people via drag-and-drop, and instantly generate fair totals with tax/tip split options. Results should be shareable via cute receipt-like cards and payable via Venmo links — without heavy setup or authentication.

---

## 2. Goals
- **Fast workflow**: Upload → OCR → Confirm → Assign → Share in <2 minutes.
- **Trustworthy math**: per-person totals always add up to receipt total; support toggleable tax/tip split modes.
- **Drag & Drop UX**: intuitive assignment of items to people, incl. multi-share.
- **Couples/Groups**: temporary grouping for merged totals.
- **Shareability**: export polished cards as PNG/PDF.
- **Venmo integration**: generate deep links/QR codes (free).
- **Cross-platform**: desktop (PDF workflow), mobile (drag-drop, zoom-safe).
- **No friction**: skip full auth; use viewer/editor tokens.

---

## 3. Non-Goals (v1)
- Automated collection or Venmo "paid" status.
- Complex tax exemptions per item.
- Multi-currency in a single bill.
- Enterprise-grade permission management.

---

## 4. Personas
- **Host (Owner)**: Creates bill, uploads receipt, assigns items, shares totals, requests payment.  
- **Friend (Participant)**: Views share link, confirms totals, uses Venmo link, marks paid.  
- **Auditor (Later)**: Downloads share card or CSV for record keeping.

---

## 5. Core Features & Requirements

### Upload & OCR
- Accept images (JPG, PNG, HEIC) and PDFs (multi-page).
- OCR via Google Vision API (Vercel function).
- Parser extracts items, subtotal, tax, tip, total.
- Confidence score gates confirm screen (<0.75).
- Confirm screen allows edit, merge/split lines.

### Items & People
- Add/edit/delete items (emoji, label, price, qty).
- Add/edit/delete people (name, avatar, Venmo handle).
- Support item sharing with weights.

### Drag & Drop
- dnd-kit with mouse + touch sensors.
- Drag item → drop on person.
- Shared item indicator ("½ Burger").

### Split Math
- Toggle **tax/tip split** between proportional vs even.
- Toggle whether to include zero-item people in even splits.
- Always reconcile pennies so Σ totals = grand total.

### Couples/Groups
- Temporary grouping of 2+ people.
- Shows combined totals; individuals hidden/ghosted.
- Purely a view layer (no change to item ownership).

### Share Cards
- Two modes: summary (names + totals), breakdown (items per person).
- Monospace receipt styling, dotted leaders.
- Export via html2canvas (PNG) and react-to-print (PDF).
- Add footer watermark ("Split with Tabby").
- Optionally embed QR codes for Venmo.

### Payments
- Store Venmo handle per person.
- Generate deep links:
  - App: `venmo://paycharge?txn=pay&recipients=<user>&amount=<amt>&note=<note>`
  - Web fallback: `https://venmo.com/...`
- Generate QR code from link.
- Fallback: copy amount + note.

### Desktop/PDF Workflow
- react-pdf viewer with thumbnails and zoom.
- File drop zone for quick PDF import.

### Mobile UX
- Bottom sheet for share/export controls.
- Inputs ≥16px font to avoid zoom bugs.
- `touch-action: manipulation` on draggables.

### Permissions
- Each bill has:
  - Editor link with editor_token (full access).
  - Viewer link with viewer_token (read-only).
- Optional claim to account later.

### Storage
- Supabase Storage: `receipts/` private, `thumbs/` signed URLs.
- Auto-delete originals after N days (configurable).

---

## 6. Technical Constraints
All data access MUST use Supabase; no local mocks or in-memory stand-ins permitted. Builds should fail if env is missing.

### Secrets & Rotation
- All secrets must be stored in GitHub Secrets (CI/CD) or 1Password (local development)
- Never commit secrets to git repositories
- Use placeholder values in documentation (see [OPS.md](OPS.md) for secure storage guidance)
- Rotate secrets regularly and update all environments simultaneously

## 7. Acceptance Criteria
- Σ per-person totals = receipt total exactly (after rounding fix).
- OCR detects ≥90% of priced lines on common receipts.
- Share cards export correctly (PNG ≤300KB typical).
- Venmo links open successfully on iOS/Android/Desktop.
- Mobile Safari: no accidental zoom on input or DnD.
- Viewer cannot modify bill; Editor can.
- All tables must have RLS enabled; storage buckets are private with signed URLs.

---

## 8. Success Metrics
- Time to first assignment < 60s (p75).
- ≥70% receipts parse with confidence ≥0.75 without major edits.
- Export/share used in >50% of multi-person bills.
- 0 reported math mismatches.

---

## 9. Implementation Tracking
For detailed task breakdown and progress tracking, see [EPIC_TRACKER.md](EPIC_TRACKER.md).
