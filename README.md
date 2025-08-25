# Tabby — Split Bills with Friends

A delightful, trustworthy, and fast restaurant bill splitting app. Upload receipts, assign items to people via drag-and-drop, and generate fair totals with tax/tip split options.

## Features

- 📸 **OCR Receipt Scanning** - Upload photos or PDFs to automatically extract items
- 🎯 **Drag & Drop Assignment** - Intuitively assign items to people
- 🧮 **Smart Math Engine** - Proportional or even tax/tip splits with penny reconciliation
- 👥 **Groups & Couples** - Temporary grouping for combined totals
- 📱 **Mobile-First** - Responsive design optimized for mobile Safari
- 🔗 **Shareable Cards** - Export polished receipt-like cards as PNG/PDF
- 💸 **Venmo Integration** - Generate deep links and QR codes for payments
- 🔐 **No Auth Required** - Use editor/viewer tokens for permissions

## Tech Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Supabase (Database, Storage, Auth)
- **Drag & Drop**: dnd-kit
- **Routing**: React Router
- **OCR**: Google Vision API (Vercel Functions)
- **Testing**: Jest + React Testing Library

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd tabby
npm install
```

### 2. Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

**Required environment variables:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_DB_PASSWORD` - Database password for CLI operations
- `SUPABASE_PROJECT_REF` - Project reference ID

**Where to find these values:**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the "Project URL" and "anon public" key
5. Go to Settings → Database for the password
6. The project reference is in the URL: `https://supabase.com/dashboard/project/[PROJECT_REF]`

### 3. Preflight Check

Validate your environment setup:

```bash
npm run preflight
```

This will check that all required environment variables are set and exit with an error if any are missing.

### 4. Supabase Setup

Install and configure the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref $SUPABASE_PROJECT_REF

# Apply database migrations
supabase db push

# Create storage buckets
supabase storage create receipts --private
supabase storage create thumbs --public
```

### 5. Start Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Available Scripts

- `npm run preflight` - Validate environment variables
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint

## Project Structure

```
tabby/
├── src/
│   ├── components/          # React components
│   │   ├── AppShell.tsx     # Main layout wrapper
│   │   ├── ReceiptPanel/    # Receipt upload & items
│   │   ├── PeopleGrid/      # People management
│   │   └── TotalsPanel/     # Totals & split controls
│   ├── pages/               # Route components
│   │   ├── BillPage.tsx     # Editor view (/bill/:id)
│   │   └── SharePage.tsx    # Viewer view (/share/:id)
│   ├── lib/                 # Utilities & services
│   │   ├── supabaseClient.ts # Supabase configuration
│   │   └── computeTotals.ts # Math engine
│   └── styles/              # Global styles
├── tests/                   # Test files
├── supabase/                # Database migrations
└── scripts/                 # Development scripts
```

## Routes

- `/bill/:id` - Editor view (full access with editor token)
- `/share/:id` - Viewer view (read-only with viewer token)
- `/` - Redirects to `/bill/new`

## Development Workflow

### Adding New Features

1. Create a feature branch: `git checkout -b feat/feature-name`
2. Implement the feature following the component structure
3. Add tests in the `tests/` directory
4. Update `EPIC_TRACKER.md` with completed tasks
5. Create a pull request

### Database Changes

1. Create a new migration file in `supabase/migrations/`
2. Update the TypeScript types in `src/lib/supabaseClient.ts`
3. Test the migration in your Supabase project

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test computeTotals.test.ts
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Build

```bash
npm run build
# Upload dist/ folder to your hosting provider
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes |
| `SUPABASE_DB_PASSWORD` | Database password for CLI operations | Yes |
| `SUPABASE_PROJECT_REF` | Project reference ID | Yes |

## Contributing

1. Read the [Product Brief](PRODUCT_BRIEF.md) for feature requirements
2. Check the [Epic Tracker](EPIC_TRACKER.md) for current status
3. Follow the development plan in [DEV_PLAN.md](DEV_PLAN.md)
4. Add entries to [PROGRESS_LOG.md](PROGRESS_LOG.md) for tracking

## License

MIT License - see LICENSE file for details
