# Receipt Scanning Development Check

This document provides verification steps for the local receipt scanning setup, including CORS configuration for cross-origin requests.

## Quick Health Check

Run these commands to verify your development setup:

```bash
# 1. Start API server only
npm run dev:api

# 2. In another terminal, run health checks
npm run dev:check

# 3. If both pass, run full dev environment
npm run dev:full
```

## CORS Configuration

### Why CORS?
In local development, the UI runs on `http://localhost:5173` (Vite) while the API runs on `http://127.0.0.1:3000` (Vercel). These are different origins, triggering CORS protection in browsers.

### CORS Environment Variables
Set in `.env.local` or environment:

```bash
# Allowed origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Optional: Allow all origins (dev only!)
# CORS_ALLOW_ALL=1
```

### CORS Verification

Test OPTIONS preflight:
```bash
npm run dev:check:preflight
```

Expected response headers:
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
Access-Control-Allow-Private-Network: true
Vary: Origin
```

## Manual Verification

### 1. API Health Check
```bash
curl -s http://127.0.0.1:3000/api/scan-receipt?health=1 | jq
```

Expected response:
```json
{
  "ok": true,
  "uptimeMs": 12345
}
```

### 2. Health Alias Check
```bash
curl -s http://127.0.0.1:3000/api/scan-receipt-health | jq
```

Expected response:
```json
{
  "ok": true,
  "uptimeMs": 12345,
  "service": "scan-receipt"
}
```

### 3. File Upload Test (Optional)
```bash
# Create a small test image
curl -X POST http://127.0.0.1:3000/api/scan-receipt \
  -F "file=@path/to/test-image.jpg" | jq
```

Expected response (with fallback data):
```json
{
  "place": "Demo Restaurant",
  "date": "2025-01-01",
  "items": [
    {"label": "Margherita Pizza", "price": 18.00},
    {"label": "Caesar Salad", "price": 12.00},
    {"label": "Craft Beer", "price": 6.00},
    {"label": "Tiramisu", "price": 6.00}
  ],
  "subtotal": 42.00,
  "tax": 3.36,
  "tip": 8.40,
  "total": 53.76
}
```

## Development Checklist

- [ ] `vercel dev --listen 3000` starts without errors
- [ ] Health check returns `{"ok": true}`
- [ ] Health alias returns `{"ok": true, "service": "scan-receipt"}`
- [ ] Vite starts on :5173 after health check passes
- [ ] Receipt scanner modal opens in UI
- [ ] Scanner progresses: idle → warming → analyzing → success
- [ ] Bill is created in Supabase (check database) or localStorage
- [ ] Navigation routes to `/bill/:id` assignment screen

## Troubleshooting

### CORS Errors
- **"Access to fetch at ... has been blocked by CORS policy"**
  - Ensure API is running on port 3000
  - Check `CORS_ORIGINS` environment variable includes your origin
  - Verify preflight succeeds: `npm run dev:check:preflight`
  - For Safari: Private Network Access header is set automatically

- **Preflight returns 404**
  - Verify API routes exist and use CORS helper
  - Check that OPTIONS method is handled

- **Different origins in dev**
  - UI: `http://localhost:5173` 
  - API: `http://127.0.0.1:3000`
  - Both must be in `CORS_ORIGINS` allowlist

### Health Check Stuck
- Verify `vercel dev` is running on port 3000
- Check for port conflicts: `lsof -i :3000`
- Check Vercel logs for API errors
- Ensure `VITE_API_BASE=http://127.0.0.1:3000` in `.env.development.local`

### 404 Errors
- Confirm API routes exist: `api/scan-receipt/index.ts` and `api/scan-receipt-health.ts`
- Verify `vercel.json` has correct rewrites
- Check browser network tab for actual request URLs

### Scanner UI Issues
- Check browser console for `[api_client]` and `[scan_*]` logs
- Verify `ensureApiHealthy()` completes successfully
- Check that `apiFetch` is being used instead of raw `fetch`

### Bill Creation Fails
- Check Supabase connection and credentials
- Verify database schema matches expected tables
- Check localStorage fallback if Supabase unavailable

## Environment Files

Ensure these files exist:

**`.env.development.local`**:
```
VITE_API_BASE=http://127.0.0.1:3000
```

**`vercel.json`** (development relevant parts):
```json
{
  "devCommand": "echo \"Vite is launched separately (dev-full)\"",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ]
}
```