# Security Policy

## 🚨 API Key Requirements (UPDATED 2025-08-31)

This application uses standard Supabase API keys:
- **Anon keys**: `eyJhbGciOiJIUzI1NiIs...` (client-safe, from "anon public")
- **Secret keys**: `eyJhbGciOiJIUzI1NiIs...` (server-only, from "service_role")

All keys are obtained from your Supabase project dashboard under Settings → API.

## 🔒 Environment Variables & Secrets

### NEVER COMMIT THESE FILES:
- `.env` - Contains real API keys and passwords
- `.env.local`, `.env.production`, etc.
- `.env.legacy` - Contains deprecated keys
- Any files containing API keys, tokens, or passwords

### Setup Instructions:
1. Copy `.env.example` to `.env.local`
2. Add your Supabase keys from the dashboard:
   - `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...` (from API settings, "anon public" key)
   - `SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIs...` (from API settings, "service_role" key)
3. Verify `.env.local` is listed in `.gitignore`

### Key Usage Guidelines

| Context | Use This Key | Never Use |
|---------|-------------|-----------|
| Client-Side (Browser) | `VITE_SUPABASE_ANON_KEY` | Secret keys |
| Server-Side (API) | `SUPABASE_SECRET_KEY` | Anon key for privileged ops |

## 🔐 Environment Variables Security

### Critical Security Rules

- **Only** the anon key (`VITE_SUPABASE_ANON_KEY`) should ever be exposed to the client/browser
- The service role key (`SUPABASE_SECRET_KEY`) **must remain server-only**
- **Never check real keys into git**. `.env` and `.env.local.example` contain placeholders for onboarding

### Key Exposure Prevention

```typescript
// ✅ CORRECT: Frontend usage
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!  // Safe for browser
)

// ✅ CORRECT: Backend usage  
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!  // Server-only, never exposed
)

// ❌ WRONG: Secret key in frontend
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.SUPABASE_SECRET_KEY!  // NEVER expose secret key!
)
```

### Environment File Security

- `.env.local` - Real keys, never committed, used locally
- `.env` - Placeholder examples only, safe to commit
- `.env.production` - Real keys for production, never committed
- `.gitignore` - Must include all environment files with real keys

### Runtime Protection

The application includes automatic safeguards:
1. **Legacy Key Detection**: Throws error if legacy JWT keys are detected
2. **Secret Key Protection**: Prevents secret keys in client code
3. **Environment Validation**: Validates key formats at startup

## 🛡️ API Security

### Supabase RLS (Row Level Security)
- All database tables should have RLS enabled
- Use appropriate policies for `select`, `insert`, `update`, `delete` operations
- Test policies with different user roles

### OCR API Keys
- Use environment variables for OCR service credentials:
  - `GOOGLE_VISION_API_KEY`
  - `AWS_TEXTRACT_ENABLED`
  - `OCR_ENABLED`
- Never log these values to console

## 📝 Reporting Security Issues

If you discover a security vulnerability, please:
1. **DO NOT** create a public issue
2. Email the maintainer privately
3. Include details about the vulnerability
4. Allow time for a fix before public disclosure

## ✅ Security Checklist

- [ ] `.env` files are gitignored
- [ ] No hardcoded API keys in source code  
- [ ] All secrets use environment variables
- [ ] Supabase RLS is enabled and tested
- [ ] Production builds don't expose development secrets
- [ ] Error messages don't leak sensitive information