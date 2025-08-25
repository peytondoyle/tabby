# Docs & Supabase-only hardening (no mocks)

## Overview
This PR hardens the Tabby project for Supabase-only usage by adding environment validation, CLI configuration, and updating documentation to enforce no local mocks or in-memory data stores.

## Changes Made

### New Files Created
- **`.env.example`** - Template for required environment variables
- **`scripts/preflight.mjs`** - Environment validation script that exits non-zero if required vars are missing
- **`supabase/config.toml`** - Supabase CLI configuration
- **`supabase/migrations/`** - Empty migrations folder (existing schema file moved here)

### Documentation Updates

#### PRODUCT_BRIEF.md
- Added "Technical Constraints" section mandating Supabase-only data access
- Added acceptance criteria for RLS and storage bucket security
- Renumbered sections to accommodate new content

#### EPIC_TRACKER.md
- Added Phase 0 for Supabase setup tasks (env, CLI, migrations, RLS, storage)
- Added "Definition of Ready" section requiring Supabase connectivity before Phase 2
- Ensures no local mocks are used in development

#### DEV_PLAN.md
- Removed detailed task lists (moved to EPIC_TRACKER.md)
- Added environment setup section with CLI commands
- Added link to EPIC_TRACKER.md for task breakdown

#### PROGRESS_LOG.md
- Removed claims about migrations until they actually exist
- Kept only factual, timestamped changes

#### README.md
- Added comprehensive setup instructions with preflight validation
- Added Supabase CLI commands for linking, migrations, and storage buckets
- Updated environment variables table with all required vars
- Added `npm run preflight` script

### Package.json Updates
- Added `preflight` script that runs environment validation

## Technical Details

### Environment Validation
The `scripts/preflight.mjs` script checks for all required environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` 
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_REF`

### Supabase CLI Integration
- Full CLI configuration with hooks for preflight validation
- Commands for linking projects, applying migrations, and creating storage buckets
- Proper RLS policy enforcement

### Security Hardening
- All tables must have RLS enabled
- Storage buckets are private with signed URLs for public access
- No local mocks or in-memory data stores permitted

## Testing
- Run `npm run preflight` to validate environment setup
- Verify Supabase CLI can link to project
- Confirm storage buckets can be created
- Test that builds fail if environment is missing

## Breaking Changes
- Builds will now fail if required environment variables are missing
- No more local development without proper Supabase setup
- All data access must go through Supabase (no mocks)

## Next Steps
After merge:
1. Set up Supabase project and get credentials
2. Run `npm run preflight` to validate environment
3. Link project with `supabase link`
4. Apply migrations with `supabase db push`
5. Create storage buckets
6. Proceed to Phase 2 development
