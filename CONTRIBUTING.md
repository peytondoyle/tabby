## `/tabby/CONTRIBUTING.md` (new)
```markdown
# Contributing to Tabby

## Source of truth for docs
- `PRODUCT_BRIEF.md` — product requirements
- `EPIC_TRACKER.md` — tasks & prompts
- `DEV_PLAN.md` — engineering decisions
- `PROGRESS_LOG.md` — timestamped actions
- `OPS.md` — how to run Supabase locally/CI

## Branching
- Feature: `feat/<slug>`
- Migrations: `db/<slug>`

## Workflow (Supabase-first)
1) Create/modify SQL under `/tabby/supabase/migrations/...`
2) `supabase db push` against DEV
3) Update code to use RPCs only (no `.from('table')` direct selects)
4) Run app with real data
5) Open PR with:
   - What changed
   - Migration filename(s)
   - How to apply/seed
   - Screenshots (if UI)

## Prohibited
- Committing `.env`
- Using mock arrays/state for data that lives in Supabase
- Printing secrets in logs/commits