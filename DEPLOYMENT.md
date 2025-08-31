# Deployment Guide

## 🚀 Vercel Deployment

### Prerequisites
- [ ] Vercel account connected to this GitHub repository
- [ ] Environment variables configured in Vercel dashboard
- [ ] Supabase project set up with proper RLS policies

### Environment Variables (Vercel Dashboard)
Configure these in your Vercel project settings:

**Required:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

**Optional (for OCR):**
- `OCR_ENABLED=true` - Enable OCR processing
- `GOOGLE_VISION_API_KEY` - Google Vision API key
- `AWS_TEXTRACT_ENABLED=true` - Enable AWS Textract

### Deploy Steps
1. **Commit changes** to main branch
2. **Push to GitHub** - Vercel will auto-deploy
3. **Check build logs** in Vercel dashboard
4. **Test deployed app** functionality
5. **Verify API endpoints** are working

### Build Commands
Vercel will automatically use:
- **Build Command**: `npm run build`  
- **Output Directory**: `dist`
- **Install Command**: `npm ci`
- **Framework**: Vite (auto-detected)

### API Routes
The following API endpoints will be deployed:
- `/api/scan-receipt` - Receipt OCR processing
- `/api/ocr` - Legacy OCR endpoint

### Security Headers
Configured in `vercel.json`:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff  
- Referrer-Policy: strict-origin-when-cross-origin
- CORS headers for API routes

## 🧪 Pre-Deploy Checklist

- [ ] Build passes locally: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npm run types:check`
- [ ] No ESLint errors: `npm run lint`
- [ ] Environment variables are set in Vercel
- [ ] Supabase RLS policies are configured
- [ ] No secrets committed to git history

## 🔧 Troubleshooting

### Build Failures
- Check Vercel build logs for specific errors
- Verify all dependencies are in `package.json`
- Ensure TypeScript compiles without errors

### API Errors
- Verify environment variables are set correctly
- Check Supabase connection and RLS policies
- Review API function logs in Vercel dashboard

### Performance Issues
- Current bundle size: ~760KB (consider code splitting)
- Use dynamic imports for large components
- Optimize images and assets

## 📱 Testing Deployed App

1. **Homepage loads** correctly
2. **Receipt scanning** works (should fall back to mock data if OCR not configured)
3. **Bill flow** completes successfully  
4. **Share functionality** generates images
5. **All routes** work (/, /bills, /bill/:token, /share/:id)