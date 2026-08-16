# tabby
Receipt scanning and bill management — Vite/React frontend + Vercel serverless API, Supabase, OpenAI.

## Stack
- Vite, React 19, TypeScript (frontend, port 5173)
- Vercel serverless functions in `/api/` (port 3000 via `vercel dev`)
- Supabase (database + auth)
- OpenAI (receipt OCR / parsing)
- Playwright (smoke + UI tests)

## Verify
`npm run types:check && npm run lint:strict` — run after every edit.

## Dev
Two processes: `npm run dev:vite` (frontend) + `vercel dev --listen 3000` (API). Use `npm run dev` to start both.

## Danger Zones
- **`/api/` routes**: receipt parsing logic — confirm before changing prompt or response shape
- **Supabase schema**: confirm migrations before applying (`npm run db:push`)
- **OpenAI calls**: changes affect cost and parsing quality

## Subagents
Spawn an Explore subagent for any file search, grep, or broad codebase exploration — keeps the main context window clean.

## Notes
- Regenerate DB types: `npm run gen:types`
- Style lint: `npm run lint:styles` (enforces no hardcoded styles)
