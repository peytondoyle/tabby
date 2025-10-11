# Tabby — Split Bills with Friends

A delightful, trustworthy, and fast restaurant bill splitting app. Upload receipts, assign items to people via drag-and-drop, and generate fair totals with tax/tip split options.

## Development

### Environment Setup

⚠️ **Breaking Change**: `VITE_SUPABASE_PUBLISHABLE_KEY` is deprecated. Use `VITE_SUPABASE_ANON_KEY` instead. Update any scripts or configs accordingly.

1. Copy `.env.example` to `.env.local` and configure:

```bash
# Required - Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key                   # Client-safe key
SUPABASE_SECRET_KEY=your-service-role-key              # Server-only (for API routes)

# Optional - For CLI operations
SUPABASE_DB_PASSWORD=your-db-password
SUPABASE_PROJECT_REF=your-project-ref
```

### Supabase Setup

**Frontend (Vite):**
```typescript
// Frontend (Vite)
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)
```

**Backend / API routes:**
```typescript
// Backend / API routes
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)
```

2. Start the development server:

**Option A: Vite-only development (Default)**
```bash
npm run dev
```
Runs at `http://localhost:5173` with API calls falling back to mock data when `/api/scan-receipt` isn't available.

**Option B: Full-stack development**
```bash
# Terminal 1: Start API server
npm run dev:api

# Terminal 2: Start Vite (with proxy to API)
npm run dev:vite
```
API server at `http://localhost:3000`, Vite at `http://localhost:5173` with working API calls.

**Option C: All-in-one Vercel dev**
```bash
npm run dev:api
```
Everything at `http://localhost:3000` (frontend + API routes).

### Testing RPC Functions

Test Supabase RPC functions with a sample bill token:

```bash
# Set environment variables first
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key

# Run the test
node scripts/test-rpc.mjs
```

This script validates that your Supabase RPC functions are working correctly and can retrieve bill data by token.

### API Routes in Development

The app includes API routes (like `/api/scan-receipt`) that only work in production or with Vercel's dev server:

- ✅ **Production**: API routes work automatically
- ✅ **`npm run dev`**: Uses `vercel dev` for full API support
- ⚠️  **`npm run dev:vite`**: API calls use fallback data or proxy to `vercel dev`

## Design Tokens and Primitives

### Design Tokens
The app uses a centralized design token system in `src/styles/theme.css` for consistent theming:

**Color Tokens:**
- `--ui-bg` - Page background
- `--ui-panel` - Card/modal backgrounds  
- `--ui-panel-2` - Secondary surfaces
- `--ui-border` - Primary borders
- `--ui-border-strong` - Emphasized borders
- `--ui-text` - Primary text color
- `--ui-text-dim` - Secondary/muted text
- `--ui-primary` - Brand/accent color
- `--ui-primary-press` - Pressed state
- `--ui-success` - Success states (mint green)
- `--ui-danger` - Error states (coral red)
- `--ui-warning` - Warning states
- `--ui-focus` - Focus ring color

**Layout Tokens:**
- `--ui-radius` - Primary border radius (8px)
- `--ui-elev-shadow` - Standard elevation shadow

### How to Use Design Tokens

**Preferred approach** - Use CSS variables with the style prop:
```tsx
<div style={{
  background: 'var(--ui-panel)',
  border: '1px solid var(--ui-border)',
  borderRadius: 'var(--ui-radius)',
  color: 'var(--ui-text)'
}}>
  Content
</div>
```

**For financial values**, always use tabular numbers:
```tsx
<span style={{fontVariantNumeric: 'tabular-nums'}}>
  ${amount.toFixed(2)}
</span>
```

### UI Primitives Catalog

**Core Components** (`src/components/ui/`):
- `Button` - Primary actions with variants (primary, secondary, subtle, ghost, destructive)
- `IconButton` - Compact icon-only actions
- `Card` - Container with consistent styling
- `Modal` - Dialog overlays with backdrop
- `Badge` - Status indicators
- `Avatar` - User profile pictures
- `ItemPill` - Receipt line items with drag/drop
- `Skeleton` - Loading states
- `Tooltip` - Contextual help

All components use the design token system and support both light/dark modes automatically.

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
