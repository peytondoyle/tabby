# Tabby — Split Bills with Friends

A delightful, trustworthy, and fast restaurant bill splitting app. Upload receipts, assign items to people via drag-and-drop, and generate fair totals with tax/tip split options.

## Development

### Environment Setup

1. Copy `.env.example` to `.env.local` and configure:

```bash
# Required - Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key  # Client-safe key
SUPABASE_SECRET_KEY=sb_secret_your-secret-key          # Server-only (for API routes)

# Optional - For CLI operations
SUPABASE_DB_PASSWORD=your-db-password
SUPABASE_PROJECT_REF=your-project-ref
```

⚠️ **Important**: Only use the new API key format (`sb_publishable_*` and `sb_secret_*`). Legacy JWT keys are no longer supported.

2. Start the development server:

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
