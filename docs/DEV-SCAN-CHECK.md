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

**Example curl output:**
```bash
$ curl -i -X OPTIONS http://127.0.0.1:3000/api/scan-receipt \
  -H 'Origin: http://localhost:5173' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type'

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
Access-Control-Allow-Private-Network: true
Vary: Origin
Date: Sun, 01 Sep 2025 00:55:00 GMT
Connection: keep-alive
```

## Manual Verification

### 1. API Health Check
```bash
curl -s http://127.0.0.1:3000/api/scan-receipt?health=1 | jq
```

**Example curl output:**
```bash
$ curl -v http://127.0.0.1:3000/api/scan-receipt?health=1

> GET /api/scan-receipt?health=1 HTTP/1.1
> Host: 127.0.0.1:3000
> User-Agent: curl/7.88.1
> Accept: */*
>
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: http://localhost:5173
< Access-Control-Allow-Methods: GET, POST, OPTIONS
< Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
< Access-Control-Max-Age: 86400
< Access-Control-Allow-Private-Network: true
< Vary: Origin
< Content-Type: application/json
< Date: Sun, 01 Sep 2025 00:55:00 GMT
< Content-Length: 35
<
{
  "ok": true,
  "uptimeMs": 12345
}
```

### 2. Health Alias Check
```bash
curl -s http://127.0.0.1:3000/api/scan-receipt-health | jq
```

**Example curl output:**
```bash
$ curl -v http://127.0.0.1:3000/api/scan-receipt-health

> GET /api/scan-receipt-health HTTP/1.1
> Host: 127.0.0.1:3000
> User-Agent: curl/7.88.1
> Accept: */*
>
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: http://localhost:5173
< Access-Control-Allow-Methods: GET, POST, OPTIONS
< Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
< Access-Control-Max-Age: 86400
< Access-Control-Allow-Private-Network: true
< Vary: Origin
< Content-Type: application/json
< Date: Sun, 01 Sep 2025 00:55:00 GMT
< Content-Length: 58
<
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
- [ ] Preflight OPTIONS returns 204 with CORS headers
- [ ] Vite starts on :5173 after health check passes
- [ ] Dev banner shows green "✅ API Health" status
- [ ] Receipt scanner modal opens in UI
- [ ] Scanner progresses: idle → warming → analyzing → success
- [ ] Bill is created in Supabase (check database) or localStorage
- [ ] Navigation routes to `/bill/:id` assignment screen

## Troubleshooting Matrix

### 🚨 "Access to fetch at ... has been blocked by CORS policy"
**Symptoms:** Browser console shows CORS error, dev banner shows ❌ status
**Solutions:**
1. Ensure API is running: `lsof -i :3000`
2. Check `CORS_ORIGINS` includes both origins: `http://localhost:5173,http://127.0.0.1:5173`
3. Verify preflight: `npm run dev:check:preflight` → should return 204
4. Check API logs for CORS helper errors

### 🕐 Stuck on "Warming Up..." 
**Symptoms:** Scanner modal shows warming state indefinitely, health check failing
**Solutions:**
1. Check dev banner for API health status (should be green ✅)
2. Verify API is responding: `curl http://127.0.0.1:3000/api/scan-receipt?health=1`
3. Check Network tab in browser for 404/500 errors
4. Restart API server: `npm run dev:api`
5. Clear browser cache/localStorage

### 🔴 Dev Banner Shows Red ❌ Status
**Symptoms:** Red banner with "❌ API Health" and error messages
**Solutions:**
1. Read the error messages in the banner for specific issues
2. Check if API server is running: `lsof -i :3000`
3. Verify endpoint accessibility: `npm run dev:check`
4. Check `VITE_API_BASE` environment variable
5. Look at browser Network tab for failed requests

### 📱 Dev Banner Not Visible
**Symptoms:** No dev banner appears in development
**Solutions:**
1. Ensure `VITE_SHOW_DEV_BANNER=1` in `.env.local`
2. Check that you're in development mode (not production build)
3. Verify banner wasn't dismissed (clear localStorage: `localStorage.removeItem('dev-banner-dismissed')`)
4. Hard refresh browser (Cmd/Ctrl + Shift + R)

### 🌐 Preflight Returns 404
**Symptoms:** `npm run dev:check:preflight` returns 404 Not Found
**Solutions:**
1. Verify API routes exist: `api/scan-receipt/index.ts` and `api/scan-receipt-health.ts`
2. Check that both use `applyCors(req, res)` at function start
3. Restart Vercel dev server
4. Check vercel.json has correct rewrites

### 🔧 Different Origins in Dev
**Issue:** UI and API on different origins causing CORS
**Setup:**
- UI: `http://localhost:5173` (Vite dev server)
- API: `http://127.0.0.1:3000` (Vercel dev server)
- Both must be in `CORS_ORIGINS` allowlist
- Use `CORS_ALLOW_ALL=1` for quick debugging (dev only!)

### 📊 Health Check Passes, But Scanner Fails
**Symptoms:** API health is green, but scanning doesn't work
**Solutions:**
1. Check browser console for JavaScript errors
2. Verify FormData upload: try manual curl with file
3. Check API logs for processing errors
4. Test with smaller image file (< 10MB)
5. Check Supabase connection if bill creation fails

### 🔄 Port Conflicts
**Symptoms:** "EADDRINUSE" or "Address already in use" errors
**Solutions:**
1. Find processes: `lsof -i :3000` and `lsof -i :5173`
2. Kill processes: `kill -9 <PID>`
3. Use different ports if needed
4. Check for background processes: `ps aux | grep node`

### 🏗️ Production Issues
**Symptoms:** CORS/API issues in production deployment
**Solutions:**
1. **Never use** `CORS_ALLOW_ALL=1` in production
2. Set `CORS_ORIGINS` to actual production domains
3. Ensure Vercel environment variables are set
4. Check production API logs in Vercel dashboard
5. Test production endpoints with curl

## Environment Files

Ensure these files exist:

**`.env.local`**:
```env
# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Vite Configuration  
VITE_API_BASE=http://127.0.0.1:3000
VITE_SHOW_DEV_BANNER=1

# Optional: Allow all origins (dev only!)
# CORS_ALLOW_ALL=1
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