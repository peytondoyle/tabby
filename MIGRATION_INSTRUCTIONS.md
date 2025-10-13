# Database Migration Required

## ⚠️ Action Required: Apply Food Icons Migration

The icon generation feature has been deployed, but requires a database migration to work.

### Steps to Apply:

1. Go to your Supabase project: https://supabase.com/dashboard/project/evraslbpgcafyvvtbqxy
2. Click "SQL Editor" in the left sidebar
3. Click "+ New query"
4. Copy and paste the ENTIRE contents of this file: `supabase/migrations/20251013000000_create_food_icons_table.sql`
5. Click "Run" or press Cmd+Enter

### What this migration does:

- Creates `food_icons` table to store AI-generated icons
- Adds RPC functions for cache lookup and storage
- Sets up public read access (all users share the icon cache)
- Adds indexes for fast lookups

### After applying:

- Scan a receipt - icons will generate automatically (~5-10 seconds for first scan)
- Subsequent scans with same items will use cached icons (~50ms)
- All users benefit from shared icon cache

### Verification:

After applying, scan a receipt and check that:
1. Icons appear on items (after generation completes)
2. Loading skeleton shows while generating
3. No errors in console logs
