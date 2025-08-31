# Security Policy

## 🔒 Environment Variables & Secrets

### NEVER COMMIT THESE FILES:
- `.env` - Contains real API keys and passwords
- `.env.local`, `.env.production`, etc.
- Any files containing API keys, tokens, or passwords

### Setup Instructions:
1. Copy `.env.example` to `.env`
2. Replace placeholder values with your real credentials
3. Verify `.env` is listed in `.gitignore`

### Exposed Supabase Credentials
⚠️ **CRITICAL**: If you see a Supabase anon key starting with `eyJhbGciOiJIUzI1NiI...` in git history, you should:
1. Rotate the key in your Supabase dashboard immediately
2. Update your local `.env` file with the new key
3. Never commit the new key to version control

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