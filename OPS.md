# Tabby Ops — Supabase & Environments

## Environments
- **DEV (default)**: shared remote Supabase project.
- **PROD (later)**: separate Supabase project; migrations must be reviewed.

## Secrets (never commit)
- `SUPABASE_ACCESS_TOKEN` — sbp_67462f532bcf519eafd735f50ac8abe47390d571
- `SUPABASE_PROJECT_REF` — evraslbpgcafyvvtbqxy
- `SUPABASE_DB_PASSWORD` — twu3tey@jrv!PBW6qry
- `VITE_SUPABASE_URL` — https://evraslbpgcafyvvtbqxy.supabase.co
- `VITE_SUPABASE_ANON_KEY` — eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cmFzbGJwZ2NhZnl2dnRicXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjQ4MTIsImV4cCI6MjA3MTcwMDgxMn0.X7z5jIFwBFvmD6UrJ6KVkxllmz7BDkvHcwOc5pgb8Ew

> Store secrets in your shell or CI (GitHub Secrets). **Never** add them to git.

## Required Tools
- Supabase CLI: `brew install supabase/tap/supabase` (or see docs)
- Node 18+

## One-time setup (per developer)
```bash
cd tabby
export SUPABASE_ACCESS_TOKEN=...      # from Supabase → Account Settings
supabase link --project-ref $SUPABASE_PROJECT_REF