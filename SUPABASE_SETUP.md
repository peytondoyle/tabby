# Supabase Development Setup

## Overview
This app uses **Supabase as the primary data source** in all environments (dev and production). LocalStorage is only a secondary fallback.

## Required Environment Variables

To run the app in development mode with full Supabase integration, you need:

### 1. Get your Supabase credentials

Go to your Supabase project dashboard:
```
https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/settings/api
```

You'll need three values:
- **Project URL** (e.g., `https://xxxxx.supabase.co`)
- **Anon/Public Key** (starts with `eyJ...`)
- **Service Role Key** (starts with `eyJ...`) ⚠️ **Keep this secret!**

### 2. Configure `.env.local`

Create or update `.env.local` in the project root:

```bash
# Supabase Configuration (REQUIRED for dev with database)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Configuration
VITE_API_BASE=http://127.0.0.1:3000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# OpenAI for receipt scanning (optional but recommended)
OPENAI_API_KEY=sk-proj-...

# Development fallback mode
VITE_ALLOW_LOCAL_FALLBACK=1  # Set to 0 to require Supabase
```

### 3. Verify configuration

After setting up `.env.local`:

```bash
# Restart the dev server
npm run dev

# Test API health
curl http://127.0.0.1:3000/api/scan-receipt?health=1
```

## Production Setup

In production (Vercel), set these environment variables in the Vercel dashboard:

1. Go to: https://vercel.com/your-team/tabby/settings/environment-variables
2. Add the same variables (without the `VITE_` prefix for backend-only vars)
3. Set `VITE_ALLOW_LOCAL_FALLBACK=0` to disable fallback mode

## Troubleshooting

### "Receipt not found" 404 errors
- **Cause**: Receipt was created in localStorage but API expects Supabase
- **Fix**: Add `SUPABASE_SECRET_KEY` to `.env.local`

### API returns fallback data
- **Cause**: OpenAI API key not configured
- **Fix**: Add `OPENAI_API_KEY` to `.env.local`

### "Database not configured" errors
- **Cause**: Missing Supabase credentials
- **Fix**: Add all three Supabase env vars to `.env.local`

## Security Notes

⚠️ **NEVER commit these files:**
- `.env.local`
- `.env`
- `.env.production`
- `.env.vercel.*`

All these patterns are already in `.gitignore`.

The `SUPABASE_SECRET_KEY` (service role key) has **full admin access** to your database. Keep it secret!
