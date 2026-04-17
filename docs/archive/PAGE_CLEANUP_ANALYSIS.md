# Page File Analysis - Active vs Deprecated

## ✅ ACTIVELY USED PAGES (In App.tsx routing + confirmed active)

### 1. `src/tabby-ui-simple/TabbySimple.tsx`
- **Route:** `/` (home)
- **Status:** PRIMARY APP - This is the main application
- **Usage:** Upload receipt, scan, edit name, add people, assign items
- **HomeButton:** ✅ Added (all steps except upload/home)

### 2. `src/pages/MyReceiptsPage.tsx`
- **Route:** `/receipts`
- **Status:** ACTIVE - Receipt history list
- **Usage:** Shows list of all scanned receipts from localStorage
- **HomeButton:** ✅ Added

### 3. `src/pages/ReceiptPage.tsx`
- **Route:** `/receipt/:token`
- **Status:** ACTIVE - View individual receipt
- **Usage:** Display single receipt details (linked from MyReceiptsPage)
- **HomeButton:** ✅ Already added

---

## ⚠️ IN ROUTING BUT POSSIBLY LEGACY

### 4. `src/pages/Flow.tsx`
- **Route:** `/bill/:token`
- **Status:** LEGACY? - Old flow component, replaced by TabbySimple
- **Usage:** Multi-step flow (likely deprecated in favor of TabbySimple)
- **HomeButton:** ✅ Added (but if deprecated, doesn't matter)
- **Recommendation:** Check if still used, consider deprecating

### 5. `src/pages/SharePage.tsx`
- **Route:** `/share/:id`
- **Status:** LEGACY? - Share functionality
- **Usage:** Share bill with others (may still be used for sharing)
- **Recommendation:** Verify if sharing feature still works, may need to keep

---

## ❌ NOT IN ROUTING - SHOULD DEPRECATE/DELETE

### 6. `src/pages/MyBillsPage.tsx`
- **Route:** NONE - Not in App.tsx routing
- **Status:** DEPRECATED - not used anywhere
- **HomeButton:** ✅ Mistakenly added here
- **Recommendation:** MOVE TO src/deprecated/pages/ or DELETE

### 7. `src/pages/UISandbox.tsx`
- **Route:** NONE - Development/testing only
- **Status:** DEV TOOL - Used for testing UI components
- **Recommendation:** Keep for development, but document as dev-only

---

## 📊 Summary

| File | Route | Status | Action Needed |
|------|-------|--------|---------------|
| TabbySimple.tsx | `/` | ✅ Active | None - primary app |
| MyReceiptsPage.tsx | `/receipts` | ✅ Active | None |
| ReceiptPage.tsx | `/receipt/:token` | ✅ Active | Add HomeButton? |
| Flow.tsx | `/bill/:token` | ⚠️ Legacy? | Verify usage, deprecate if unused |
| SharePage.tsx | `/share/:id` | ⚠️ Legacy? | Verify sharing feature works |
| MyBillsPage.tsx | None | ❌ Deprecated | Move to deprecated/ or delete |
| UISandbox.tsx | None | 🛠️ Dev Tool | Keep for dev, document |

---

## 🎯 Recommended Actions

### Immediate (High Priority)
1. ✅ **DONE:** Updated HomeButton to match header icon style (40x40px, transparent, gray → white hover, SVG icon)
2. ✅ **DONE:** Verified ReceiptPage.tsx already has HomeButton
3. **TODO:** Deprecate MyBillsPage.tsx - Move to src/deprecated/pages/ or delete
4. **TODO:** Test Flow.tsx route - Navigate to `/bill/:token` and see if it works/is used

### Future Cleanup
1. If Flow.tsx is unused, deprecate it
2. If SharePage.tsx is unused, deprecate it
3. Update routing documentation to clarify which routes are active
4. Consider removing the `/bill/:token` and `/share/:id` routes if deprecated

---

## 📝 Notes

- The git status shows many files already deleted from `src/deprecated/pages/`
- This cleanup has been ongoing, we're just continuing that work
- TabbySimple.tsx is the modern, simplified app (replaced the complex Flow.tsx)
- localStorage persistence means MyReceiptsPage → ReceiptPage flow is the primary way to view old receipts
