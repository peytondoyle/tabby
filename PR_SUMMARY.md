# PR: Supabase enablement — link, push, seed, live smoke

## Summary
Successfully enabled live Supabase connectivity for the Tabby app. All data now flows through Supabase RPCs with no local mocks.

## Commands Executed

### 1. Supabase Project Link
```bash
export SUPABASE_PROJECT_REF=evraslbpgcafyvvtbqxy
supabase link --project-ref $SUPABASE_PROJECT_REF
```
✅ Project linked successfully

### 2. Database Migration Push
```bash
supabase db push
```
✅ Schema up to date, all tables and RPCs deployed

### 3. Storage Bucket Verification
```bash
supabase storage ls --experimental
```
✅ Buckets confirmed: `receipts/` (private), `thumbs/` (public)

### 4. Seed Data Creation
```bash
supabase db push --include-seed
```
✅ Sample bill created with tokens:
- Editor: `e047f028995f1775e49463406db9943d`
- Viewer: `2a697132915a405e41ce328ce3ffc5cc`

## Files Changed

### New Files
- `supabase/seed.sql` - Sample bill data with people and items
- `src/components/SmokeCheck.tsx` - Live data verification component
- `scripts/test-rpc.mjs` - RPC function test script

### Modified Files
- `src/pages/BillPage.tsx` - Added SmokeCheck component with DEBUG flag
- `PROGRESS_LOG.md` - Updated with Supabase enablement progress

## Live Data Verification

### RPC Test Results
```bash
node scripts/test-rpc.mjs
```
✅ Returns: "Tabby Test Bill" at Billy's Cafe, $60.14 subtotal

### App Verification
- Development server: http://localhost:5173
- Sample bill URL: `/bill/e047f028995f1775e49463406db9943d`
- SmokeCheck component shows live data in development mode

## Database Schema Status
- ✅ All tables created with RLS enabled
- ✅ RPC functions deployed for secure data access
- ✅ Storage buckets configured with proper policies
- ✅ Sample data seeded for development

## Security Model
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Direct table access revoked (anon/authenticated)
- ✅ All data access through RPC functions only
- ✅ Storage policies configured for receipts (private) and thumbs (public)

## Next Steps
1. Phase 2: Implement ItemRow and ItemList components
2. Phase 3: Add drag & drop functionality
3. Phase 4: Implement computeTotals math engine

## Environment Variables Required
```bash
VITE_SUPABASE_URL=https://evraslbpgcafyvvtbqxy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_PROJECT_REF=evraslbpgcafyvvtbqxy
```

## Screenshots
- Supabase Studio: Tables showing sample data
- Storage buckets: receipts (private), thumbs (public)
- App running with live data verification
