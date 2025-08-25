# Tabby — Smoke Check Script

This document contains manual verification steps to ensure the foundation is working correctly.

## Prerequisites

- Node.js 18+ installed
- Supabase project created
- Environment variables set in `.env` file

## Step 1: Environment Setup

1. **Check Node.js version:**
   ```bash
   node --version
   # Should be 18.0.0 or higher
   ```

2. **Verify environment variables:**
   ```bash
   # Check if .env file exists
   ls -la .env
   
   # Verify variables are loaded (should not show undefined)
   grep VITE_SUPABASE .env
   ```

## Step 2: Installation & Build

1. **Install dependencies:**
   ```bash
   npm install
   # Should complete without errors
   ```

2. **Check TypeScript compilation:**
   ```bash
   npm run build
   # Should complete without TypeScript errors
   ```

## Step 3: Development Server

1. **Start development server:**
   ```bash
   npm run dev
   # Should start on http://localhost:5173
   ```

2. **Verify server starts:**
   - Open browser to http://localhost:5173
   - Should see "Tabby" header
   - Should redirect to `/bill/new`

## Step 4: Routing Verification

1. **Test editor route:**
   - Navigate to http://localhost:5173/bill/test-123
   - Should show 3-column layout (desktop) or stacked layout (mobile)
   - Should display "Receipt", "People", and "Totals" panels

2. **Test viewer route:**
   - Navigate to http://localhost:5173/share/test-456
   - Should show centered card with "Tabby" title
   - Should display "Bill split by a friend" message

3. **Test root redirect:**
   - Navigate to http://localhost:5173/
   - Should redirect to `/bill/new`

## Step 5: Layout Verification

### Desktop Layout (≥1024px)
1. **3-column grid:**
   - ReceiptPanel on left
   - PeopleGrid in center
   - TotalsPanel on right
   - All panels should have equal width

2. **Header:**
   - "Tabby" title on left
   - "Share" button on right
   - Proper spacing and alignment

### Mobile Layout (<1024px)
1. **Stacked layout:**
   - ReceiptPanel at top
   - PeopleGrid in middle
   - TotalsPanel at bottom
   - Proper spacing between panels

2. **Responsive behavior:**
   - Resize browser window to test breakpoint
   - Layout should switch between desktop/mobile

## Step 6: Component Verification

### ReceiptPanel
- [ ] "Receipt" title
- [ ] "Upload Receipt" button
- [ ] Placeholder content with 📄 emoji
- [ ] "Items" section with placeholder text

### PeopleGrid
- [ ] "People" title
- [ ] "Add Person" button
- [ ] Placeholder person card with 👤 emoji
- [ ] "Groups" section with description

### TotalsPanel
- [ ] "Totals" title
- [ ] "Settings" button
- [ ] Bill summary with $0.00 values
- [ ] Split options (Tax/Tip dropdowns)
- [ ] "Include zero people" checkbox
- [ ] "Generate Share Card" and "Export PDF" buttons

## Step 7: Styling Verification

1. **Tailwind classes:**
   - All components should have proper styling
   - No unstyled elements
   - Consistent spacing and colors

2. **Design tokens:**
   - Primary colors should be blue theme
   - Cards should have rounded corners and shadows
   - Buttons should have hover states

3. **Typography:**
   - Font should be system sans-serif
   - Monospace font for numbers
   - Proper text hierarchy

## Step 8: Supabase Integration

1. **Client initialization:**
   - Check browser console for any Supabase errors
   - Should not see "Missing Supabase environment variables" error

2. **Environment variables:**
   - Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are loaded
   - No undefined values in console

## Step 9: Testing Setup

1. **Run tests:**
   ```bash
   npm test
   # Should run computeTotals.test.ts
   # Should show placeholder tests
   ```

2. **Check test output:**
   - Should show "computeTotals" test suite
   - Should show placeholder test cases
   - No errors in test execution

## Expected Results

✅ **All checks pass:**
- App builds and runs without errors
- Routing works correctly
- Layout is responsive
- Components render with proper styling
- Supabase client initializes
- Tests run successfully

❌ **Issues to fix:**
- TypeScript compilation errors
- Missing environment variables
- Routing not working
- Layout not responsive
- Styling issues
- Test failures

## Next Steps

If all smoke checks pass:
1. Create a new bill in Supabase
2. Test the database connection
3. Proceed to Milestone 2 (Items & People)

If any checks fail:
1. Review error messages
2. Check environment setup
3. Verify all dependencies installed
4. Fix issues before proceeding
