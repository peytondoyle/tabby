# Security Policy

## 🚨 API Key Requirements (UPDATED 2025-08-31)

This application **ONLY** supports the new Supabase API key format:
- **Publishable keys**: `sb_publishable_*` (client-safe)
- **Secret keys**: `sb_secret_*` (server-only)

### ❌ Legacy Keys NOT Supported

The following legacy key formats are **NO LONGER SUPPORTED** and will be rejected at runtime:
- JWT-format anon keys (starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)
- JWT-format service_role keys
- Any other legacy authentication formats

## 🔒 Environment Variables & Secrets

### NEVER COMMIT THESE FILES:
- `.env` - Contains real API keys and passwords
- `.env.local`, `.env.production`, etc.
- `.env.legacy` - Contains deprecated keys
- Any files containing API keys, tokens, or passwords

### Setup Instructions:
1. Copy `.env.example` to `.env.local`
2. Add your new format keys:
   - `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`
   - `SUPABASE_SECRET_KEY=sb_secret_...`
3. Verify `.env.local` is listed in `.gitignore`

### Key Usage Guidelines

| Context | Use This Key | Never Use |
|---------|-------------|-----------|
| Client-Side (Browser) | `VITE_SUPABASE_PUBLISHABLE_KEY` | Secret keys, Legacy JWT keys |
| Server-Side (API) | `SUPABASE_SECRET_KEY` | Publishable key for privileged ops |

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