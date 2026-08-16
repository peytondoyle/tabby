# Tabby Retirement Runbook

Tabby is retired. The frontend now serves a shutdown page for every route, and public API handlers return `410 Gone` for app traffic.

## Completed On 2026-06-28

- Deployed retirement build to production:
  - `https://tabbysplits.com`
  - `https://tabby-a784la813-peyton-doyle.vercel.app`
  - Deployment ID: `dpl_Ev2z1Lz2zijWx1RYytpm3q5WpXBx`
- Confirmed old receipt URLs render the retirement page.
- Confirmed production API shutdown:
  - `/api/receipts/create` returns `410 APP_RETIRED`
  - `/api/scan-receipt` returns `410 APP_RETIRED`
- Removed all Vercel environment variables from the linked `peyton-doyle/tabby` project.
- `tabbysplits.com` is registered/managed through Vercel, expires May 18 2027, and uses Vercel nameservers. Public RDAP reports the underlying registrar as Name.com, Inc.
- Removed retired Clerk DNS records from `tabbysplits.com`.
- Deleted linked Supabase project `peyton-prod` / `kjdoiozqefbjkbsimvbs`.
- Deleted Clerk application `Tabby` / `app_3CWtFgzLNGjTY4kQV0UnfJIsAxP`.
- Verified no Vercel Marketplace resources are connected to the `tabby` project.
- Scrubbed retired credential keys from local ignored env files and replaced `.env.example` with a retired placeholder.
- Created `retirement-backups/` for local shutdown exports.

## Remaining Provider Shutdown

The only cleanup that could not be completed from this machine:

- OpenAI API key revocation: the local `OPENAI_API_KEY` is not an admin key, so the OpenAI organization/project key cannot be revoked through the API here. Revoke it in the OpenAI dashboard.
- Cloudflare R2 provider deletion: no Wrangler/AWS CLI or local R2 credentials were available. Vercel envs that referenced R2 were removed.
- Redis provider deletion: no Vercel Marketplace resource or local Redis provider CLI was available. Vercel envs that referenced Redis were removed.

Supabase CLI export via `supabase db dump --linked` was blocked because Docker Desktop was not running. The project was deleted after explicit approval.

## Local Code State

- Browser routes render a static retirement page from `src/App.tsx`.
- Startup no longer initializes Clerk, LazyMotion, or the production service worker.
- Existing service workers are unregistered on load.
- Public API handlers return:

```json
{
  "ok": false,
  "error": "Tabby has been retired.",
  "code": "APP_RETIRED"
}
```

## Services To Shut Down

Do these only after exporting any data you want to keep.

### Vercel

- Deploy this retirement build to production.
- Remove production env vars after deployment succeeds.
- Disconnect Git integration or archive/delete the Vercel project.
- Remove custom domains if the domain should stop resolving.
- Upgrade CLI before remote work if needed: `npm i -g vercel@latest`.

Likely env vars:

- `VITE_API_BASE`
- `VITE_LOG_API_ERRORS`
- `CORS_ORIGINS`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_TOKEN`

### Supabase

- Export database tables before deletion:
  - `tabby_receipts`
  - `tabby_items`
  - `tabby_people`
  - `tabby_item_shares`
  - legacy `bills`, `items`, `people`, `item_shares` if present
- Remove/revoke API keys.
- Pause or delete the Supabase project after backup.

Likely env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

### OpenAI And OCR Providers

- Revoke the OpenAI project key used for receipt parsing.
- Remove optional OCR provider credentials.

Likely env vars:

- `OPENAI_API_KEY`
- `REQUIRE_REAL_OCR`
- `GOOGLE_CLOUD_VISION_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AZURE_VISION_ENDPOINT`
- `OCR_SPACE_API_KEY`

### Clerk

- Remove the publishable key from deployments.
- Disable or delete the Clerk application if it was only used for Tabby.

Likely env var:

- `VITE_CLERK_PUBLISHABLE_KEY`

### Cloudflare R2

- Delete uploaded receipt assets if they are no longer needed.
- Revoke R2 access keys.
- Delete the bucket if dedicated to Tabby.

Likely env vars:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `NEXT_PUBLIC_R2_PUBLIC_BASE`

### Redis

- Delete Redis/KV cache if provisioned only for scan caching.

Likely env var:

- `REDIS_URL`

## Final Archive Checklist

- Confirm production shows the retirement page.
- Confirm `/api/receipts/create` returns `410`.
- Confirm `/api/scan-receipt` returns `410` for non-health requests.
- Export or delete Supabase data.
- Revoke OpenAI, Supabase, Clerk, R2, and Vercel secrets.
- Disconnect Vercel Git integration.
- Archive or privatize the GitHub repository.
