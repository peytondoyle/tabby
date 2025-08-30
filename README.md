# Tabby — Split Bills with Friends

A delightful, trustworthy, and fast restaurant bill splitting app. Upload receipts, assign items to people via drag-and-drop, and generate fair totals with tax/tip split options.

## Development

```bash
npm run dev
```

The development server runs on `http://localhost:5173` with strict port binding.

## Migrations

Database migrations are timestamp-ordered SQL files in `supabase/migrations/`. PostgREST RPC names are applied in chronological order, and future-dated files won't apply until their timestamp is reached.

After adding migrations, regenerate TypeScript types:

```bash
npm run gen:types
```

This generates `src/lib/database.types.ts` from the linked Supabase project schema.

## Docs Map

- **[PRODUCT_BRIEF.md](PRODUCT_BRIEF.md)** - Requirements and acceptance criteria
- **[EPIC_TRACKER.md](EPIC_TRACKER.md)** - Phases, tasks, and progress tracking  
- **[DEV_PLAN.md](DEV_PLAN.md)** - Technical decisions, risks, and milestones
- **[PROGRESS_LOG.md](PROGRESS_LOG.md)** - Timestamped development actions
