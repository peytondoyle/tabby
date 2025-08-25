# Tabby Ops — Supabase & Environments

## Environments
- **DEV (default)**: shared remote Supabase project.
- **PROD (later)**: separate Supabase project; migrations must be reviewed.

## Secrets (never commit)
Store these secrets in GitHub Secrets (for CI/CD) or 1Password (for local development). **Never** add them to git.

- `SUPABASE_ACCESS_TOKEN` — `sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (from Supabase → Account Settings)
- `SUPABASE_PROJECT_REF` — `xxxxxxxxxxxxxxxxxxxxx` (from Supabase project URL)
- `SUPABASE_DB_PASSWORD` — `xxxxxxxxxxxxxxxxxxxxx` (from Supabase → Settings → Database)
- `VITE_SUPABASE_URL` — `https://xxxxxxxxxxxxxxxxxxxxx.supabase.co` (from Supabase → Settings → API)
- `VITE_SUPABASE_ANON_KEY` — `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (from Supabase → Settings → API)

> **Security Note**: These are placeholder values. Store actual secrets in GitHub Secrets/1Password.

## Required Tools
- Supabase CLI: `brew install supabase/tap/supabase` (or see docs)
- Node 18+

## One-time setup (per developer)
```bash
cd tabby
export SUPABASE_ACCESS_TOKEN=...      # from Supabase → Account Settings
supabase link --project-ref $SUPABASE_PROJECT_REF
```