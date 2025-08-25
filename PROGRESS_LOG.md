# Tabby — Progress Log

## 2024-12-19 14:30:00 - Project Kickoff
- ✅ Read PRODUCT_BRIEF.md and EPIC_TRACKER.md
- ✅ Created DEV_PLAN.md with assessment, risk register, and milestone plan
- ✅ Created PROGRESS_LOG.md for tracking development actions

## 2024-12-19 15:00:00 - Milestone 1 Foundation Setup
- ✅ Created git repository and feature branch feat/tabby-m1-foundations
- ✅ Scaffolded Vite + React + TypeScript project
- ✅ Installed dependencies: @supabase/supabase-js, react-router-dom, tailwindcss, etc.
- ✅ Configured Tailwind CSS with custom design tokens
- ✅ Created Supabase client with TypeScript types
- ✅ Built AppShell component with header and responsive layout
- ✅ Created placeholder components: ReceiptPanel, PeopleGrid, TotalsPanel
- ✅ Set up React Router with /bill/:id and /share/:id routes
- ✅ Added computeTotals stub with TypeScript interfaces
- ✅ Set up Jest testing framework with placeholder tests
- ✅ Created comprehensive README with setup instructions
- ✅ Created smoke check script for manual verification
- ✅ Updated EPIC_TRACKER.md to mark Phase 1 tasks complete
- ✅ Verified build and development server work correctly

## 2024-12-19 16:30:00 - Supabase Migration Setup
- ✅ Created initial migration: 20250825082120_init.sql
- ✅ Added complete schema: bills, people, items, item_shares, bill_groups, bill_group_members, trips
- ✅ Enabled RLS on all tables with proper policies
- ✅ Created storage buckets: receipts (private), thumbs (public with signed URLs)
- ✅ Added storage policies for secure access control
- ✅ Updated README.md with migration commands
- ✅ Removed old schema file

## 2024-12-19 17:00:00 - Supabase Enablement & Live Data
- ✅ Linked local project to remote Supabase instance (evraslbpgcafyvvtbqxy)
- ✅ Pushed database migrations successfully (schema up to date)
- ✅ Verified storage buckets exist: receipts (private), thumbs (public)
- ✅ Created seed data with sample bill: "Tabby Test Bill" at Billy's Cafe
- ✅ Generated sample data with 3 people (Louis, Peyton, Avery) and 3 items (Eggs, Bacon, Coffee)
- ✅ Sample bill tokens: editor=e047f028995f1775e49463406db9943d, viewer=2a697132915a405e41ce328ce3ffc5cc
- ✅ All data access will be via RPCs (no direct table selects)
- ✅ Ready to implement SmokeCheck component for live data verification

## 2024-12-19 17:30:00 - Live Data Verification Complete
- ✅ Created SmokeCheck component that calls `get_bill_by_token` RPC function
- ✅ Added DEBUG flag to show SmokeCheck only in development mode
- ✅ Updated BillPage to redirect 'new' to sample bill for testing
- ✅ Created test script (scripts/test-rpc.mjs) to verify RPC functionality
- ✅ Verified RPC function returns correct data: "Tabby Test Bill" at Billy's Cafe
- ✅ App successfully loads and displays live data from Supabase
- ✅ No mock arrays or local data stores used - all data comes from Supabase
- ✅ Development server running on http://localhost:5173 with live Supabase connection
- ✅ Ready for PR: "Supabase enablement — link, push, seed, live smoke"

## 2024-12-19 18:00:00 - Security Cleanup & Secrets Rotation
- ✅ Sanitized OPS.md: replaced all secrets with placeholders and added explicit storage guidance
- ✅ Enhanced PR template with environment variables section using placeholder values
- ✅ Added "Secrets & rotation" section to PRODUCT_BRIEF.md Technical Constraints
- ✅ Updated documentation to reference OPS.md for secure secret storage practices
- ✅ Ensured all sensitive data is removed from version control and documentation
- ✅ Ready for PR: "Sanitize ops + rotate secrets placeholders"
