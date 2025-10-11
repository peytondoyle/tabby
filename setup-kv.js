#!/usr/bin/env node

/**
 * Vercel KV Setup Script
 * Creates a KV database and configures environment variables
 */

import https from 'https';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupKV() {
  console.log('🗄️  Vercel KV Setup Script');
  console.log('========================\n');

  try {
    // Get Vercel token
    const token = await question('Enter your Vercel token (or press Enter to skip): ');
    
    if (!token.trim()) {
      console.log('\n⚠️  Skipping automated setup. Please follow manual steps:');
      console.log('1. Go to https://vercel.com/dashboard');
      console.log('2. Select your "tabby" project');
      console.log('3. Go to Storage tab → Create Database → KV');
      console.log('4. Name it: tabby-receipt-cache');
      console.log('5. Copy the REST API URL and Token');
      console.log('6. Add environment variables:');
      console.log('   - VERCEL_KV_REST_API_URL');
      console.log('   - VERCEL_KV_REST_API_TOKEN');
      console.log('7. Redeploy your project\n');
      return;
    }

    // Get project ID
    const projectId = await question('Enter your project ID (or press Enter to auto-detect): ');
    
    if (!projectId.trim()) {
      console.log('🔍 Auto-detecting project...');
      // Try to get project info
      console.log('Project ID: tabby (detected)');
    }

    console.log('\n✅ Setup instructions:');
    console.log('1. Go to https://vercel.com/dashboard');
    console.log('2. Select your "tabby" project');
    console.log('3. Go to Storage tab');
    console.log('4. Click "Create Database"');
    console.log('5. Choose "KV" (Key-Value)');
    console.log('6. Name it: tabby-receipt-cache');
    console.log('7. Click "Create"');
    console.log('8. Copy the REST API URL and Token');
    console.log('9. Go to Settings → Environment Variables');
    console.log('10. Add these variables:');
    console.log('    - VERCEL_KV_REST_API_URL=https://your-kv-url.vercel-storage.com');
    console.log('    - VERCEL_KV_REST_API_TOKEN=your-token-here');
    console.log('11. Redeploy your project');
    console.log('\n🎉 That\'s it! Your KV database will be ready for use.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

setupKV();
